const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}
).outputText, filename);
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {CONTAINER,supportPoints,contactQuality,captureContact,contactResult} = require('../src/assessment/measurement.ts');
const {initialPlacement,placementReducer:reduce} = require('../placementState.ts');
const target = {id:1,position:[0,-1,0]};
const now = 10000;
function samples(y=-.86) {
  return Array.from({length:11},(_,i)=>({timestamp:now-2000+i*200,positionAR:[0,y,0],
    up:[0,1,0],forward:[0,0,-1],rotation:[0,0,0]}));
}
function placed() {
  let s = reduce(initialPlacement(),{type:'tracking',quality:'normal'});
  s = reduce(s,{type:'mode',mode:'manual'});
  s = reduce(s,{type:'manual-tap',x:100,y:100});
  s = reduce(s,{type:'manual-result',id:s.manualRequest.id,point:[0,-1,0]});
  s = reduce(s,{type:'confirm'});
  return reduce(s,{type:'place',point:[0,-1,0]});
}
test('fixed 6 by 3 metre footprint has six ordered corners/midpoints',()=>{
  assert.deepEqual(CONTAINER,{width:3,depth:6,height:2.5});
  assert.deepEqual(supportPoints([0,-1,0],0).map(p=>p.position),[
    [-1.5,-1,-3],[-1.5,-1,0],[-1.5,-1,3],[1.5,-1,-3],[1.5,-1,0],[1.5,-1,3],
  ]);
  assert.deepEqual(reduce(initialPlacement(),{type:'dimensions',dimensions:{width:1,depth:1,height:1}}).dimensions,CONTAINER);
});
test('yaw rotates support coordinates consistently without changing ground Y',()=>{
  const p=supportPoints([10,-2,20],90);
  assert.ok(Math.abs(p[0].position[0]-7)<1e-10);
  assert.ok(Math.abs(p[0].position[2]-21.5)<1e-10);
  assert.ok(p.every(v=>v.position[1]===-2));
});
test('a final lock blocks every pose adjustment; edit preserves pose and unlocks',()=>{
  const before=placed();
  assert.equal(before.phase,'object-placed');
  const locked=reduce(before,{type:'lock-placement'});
  assert.equal(locked.assessmentLocked,true);
  for(const action of [{type:'drag',point:[10,10,10]},{type:'move',x:1,z:1},{type:'height',delta:1},
    {type:'rotate',delta:90},{type:'reset-rotation'},{type:'reposition'}]) assert.equal(reduce(locked,action),locked);
  const edited=reduce(locked,{type:'edit-placement'});
  assert.equal(edited.assessmentLocked,false);
  assert.deepEqual(edited.lockedWorldPosition,locked.lockedWorldPosition);
  assert.equal(reduce(locked,{type:'reset'}).assessmentLocked,false);
});
test('limited tracking prevents final locking and capture',()=>{
  const s=reduce(placed(),{type:'tracking',quality:'limited'});
  assert.equal(reduce(s,{type:'lock-placement'}).assessmentLocked,false);
  assert.equal(captureContact(samples(),target,'limited',now),null);
});
test('upright stable fresh samples enable a median contact capture',()=>{
  const s=samples(); s[5].positionAR[1]+=.005;
  assert.equal(contactQuality(s,target,'normal',now).ready,true);
  const c=captureContact(s,target,'normal',now);
  assert.deepEqual(c.cameraPosition,[0,-.86,0]);
  assert.ok(Object.isFrozen(c.cameraPosition));
});
test('capture rejects short, stale, distant, tilted or jittery windows',()=>{
  assert.equal(contactQuality(samples().slice(-3),target,'normal',now).ready,false);
  assert.equal(contactQuality(samples(),target,'normal',now+800).ready,false);
  for(const change of [s=>{s.forEach(v=>v.positionAR[0]=.31);},s=>{s.forEach(v=>v.up=[.2,.98,0]);},
    s=>{s[4].positionAR[1]+=.03;},s=>{s[3].positionAR[0]=NaN;}]) {
    const s=samples();change(s);assert.equal(contactQuality(s,target,'normal',now).ready,false);
  }
});
test('capture rejects an interruption gap even if sample count and span suffice',()=>{
  const s=samples();s.splice(3,3);
  s.unshift({...s[0],timestamp:now-2000});
  assert.equal(contactQuality(s,target,'normal',now).ready,false);
});
test('camera-to-edge offset cancels in relative height; measured X/Z are separate from planned X/Z',()=>{
  const first=captureContact(samples(),target,'normal',now);
  const other={id:2,position:[0,-1,0]};
  const moved=samples(-.81);moved.forEach(s=>{s.positionAR[0]=.1;});
  const second=captureContact(moved,other,'normal',now);
  const result=contactResult(second,first,other);
  assert.ok(Math.abs(result.relativeHeightCm-5)<1e-10);
  assert.ok(Math.abs(result.estimatedPosition[1]+.95)<1e-10);
  assert.deepEqual(result.plannedPosition,other.position);
  assert.equal(result.estimatedPosition[0],.1);
  assert.equal(contactResult(first,first,target).relativeHeightCm,0);
});
test('near-upright pose recorded in point-1 log can complete the steady hold',()=>{
  const point=supportPoints([6.724386215209961,-.8004826903343201,3.7365665435791016],0)[0];
  const recorded=samples(-.6403014063835144);
  recorded.forEach(s=>{
    s.positionAR=[5.256948947906494,-.6403014063835144,.48562896251678467];
    s.up=[.004868871532380581,.999483585357666,.03155427426099777];
  });
  const quality=contactQuality(recorded,point,'normal',now);
  assert.ok(quality.distanceM>.20 && quality.distanceM<.30);
  assert.equal(quality.ready,true);
  assert.notEqual(captureContact(recorded,point,'normal',now),null);
});
test('six regular slow camera updates spanning two seconds can enable capture',()=>{
  const slow=samples().slice(0,6).map((s,i)=>({...s,timestamp:now-2000+i*400}));
  assert.equal(contactQuality(slow,target,'normal',now).ready,true);
});
test('two-second hold also works with five readings at a lower camera frequency',()=>{
  const slow=samples().slice(0,5).map((s,i)=>({...s,timestamp:now-2000+i*500}));
  assert.equal(contactQuality(slow,target,'normal',now).ready,true);
});
test('approach and tilt samples do not poison a subsequent complete steady hold',()=>{
  const s=samples();
  s.unshift({...s[0],timestamp:now-2400,positionAR:[1,1,1],up:[0,.5,.866]});
  assert.equal(contactQuality(s,target,'normal',now).ready,true);
});
test('a new movement resets hold progress until two new steady seconds arrive',()=>{
  const s=samples();s.at(-1).positionAR=[.03,-.86,0];
  const q=contactQuality(s,target,'normal',now);
  assert.equal(q.checks.nearby,true);
  assert.equal(q.checks.upright,true);
  assert.equal(q.checks.steady,false);
  assert.equal(q.stableMs,0);
  const later=Array.from({length:11},(_,i)=>({...s.at(-1),timestamp:now+i*200}));
  assert.equal(contactQuality([...s.slice(0,-1),...later],target,'normal',now+2000).ready,true);
});
