// Compile the installed project's TypeScript for Node tests; Metro is not needed.
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  fs.readFileSync(filename, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}
).outputText, filename);
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {initialPlacement, placementReducer: reduce, isSurfaceAvailable, canConfirmSurface, unexpectedPoseChange} = require('../placementState.ts');
const {getContainerCenterY, footprintFits} = require('../placementGeometry.ts');
function anchor(id='floor', y=-1) {
  return {anchorId:id, type:'plane', alignment:'Horizontal', position:[0,y,0], rotation:[0,0,0], scale:[1,1,1],
    width:4, height:4, vertices:[[-2,0,-2],[2,0,-2],[2,0,2],[-2,0,2]]};
}
function scanned() {
  let s = reduce(initialPlacement(), {type:'tracking', quality:'normal'});
  for (const now of [0,500,1000,1500]) s = reduce(s, {type:'plane', anchor:anchor(), now});
  return reduce(s, {type:'camera', position:[0,.5,0], now:1500});
}
function placed() {
  let s = reduce(scanned(), {type:'select', id:'floor', point:[0,-1,-1]});
  s = reduce(s, {type:'confirm'});
  return reduce(s, {type:'place', point:[0,-1,-1]});
}
test('selection requires confirmation before placement; reposition cannot bypass it', () => {
  let s = scanned();
  assert.equal(s.phase, 'surface-selection');
  s = reduce(s, {type:'select', id:'floor', point:[0,-1,-1]});
  assert.equal(s.lockedWorldPosition, null);
  assert.equal(reduce(s, {type:'reposition'}).phase, 'surface-selection');
  assert.equal(reduce(s, {type:'place', point:[0,-1,-1]}).lockedWorldPosition, null);
  s = reduce(s, {type:'confirm'});
  assert.equal(s.phase, 'surface-locked');
  s = reduce(s, {type:'place', point:[0,-1,-1]});
  assert.deepEqual(s.lockedWorldPosition, [0,-1,-1]);
});
test('cupboard detection and drag Y cannot change the locked floor', () => {
  let s = placed();
  s = reduce(s, {type:'plane', anchor:anchor('cupboard', .2), now:2000});
  s = reduce(s, {type:'camera', position:[0,.5,0], now:3500});
  s = reduce(s, {type:'select', id:'cupboard', point:[1,.2,1]});
  s = reduce(s, {type:'drag', point:[1,500,1]});
  assert.equal(s.selectedSurface.id, 'floor');
  assert.deepEqual(s.lockedWorldPosition, [1,-1,1]);
});
test('a table can be intentionally selected after resetting', () => {
  let s = reduce(placed(), {type:'reset'});
  s = reduce(s, {type:'tracking', quality:'normal'});
  for (const now of [0,500,1000,1500]) s = reduce(s, {type:'plane', anchor:anchor('table',0), now});
  s = reduce(s, {type:'camera', position:[0,.5,0], now:1500});
  s = reduce(s, {type:'select', id:'table', point:[0,0,0]});
  s = reduce(s, {type:'confirm'});
  s = reduce(s, {type:'place', point:[0,0,0]});
  assert.equal(s.selectedSurface.id, 'table');
  assert.equal(s.lockedWorldPosition[1], 0);
});
test('height, X/Z and rotation controls change only their intended degrees of freedom', () => {
  let s = placed();
  s = reduce(s, {type:'height', delta:.05});
  assert.deepEqual(s.lockedWorldPosition, [0,-.95,-1]);
  s = reduce(s, {type:'move', x:.1,z:-.1});
  assert.deepEqual(s.lockedWorldPosition, [.1,-.95,-1.1]);
  const position = [...s.lockedWorldPosition];
  s = reduce(s, {type:'rotate', delta:-5});
  assert.equal(s.objectRotation, 355);
  assert.deepEqual(s.lockedWorldPosition, position);
});
test('same-anchor refinements cannot ratchet the locked height upward', () => {
  let s = reduce(placed(), {type:'height', delta:.05});
  const lock = s.lockedSurface;
  const selected = s.selectedSurface;
  for (let i=1; i<=150; i++) {
    s = reduce(s, {type:'plane', anchor:anchor('floor',-1+i*.01),now:2000+i*1500});
    s = reduce(s, {type:'camera',position:[0,2,0],now:3000+i*1500});
    s = reduce(s, {type:'drag',point:[i,100+i,-i]});
    assert.equal(s.lockedSurface, lock);
    assert.equal(s.selectedSurface, selected);
    assert.equal(s.lockedWorldPosition[1], lock.groundY+s.verticalOffset);
  }
});

test('removed anchor and limited tracking retain pose; logical plane survives anchor loss', () => {
  let s = placed();
  const pose = s.lockedWorldPosition;
  const lock = s.lockedSurface;
  s = reduce(s, {type:'remove-plane',id:'floor'});
  assert.equal(isSurfaceAvailable(s),false);
  s = reduce(s, {type:'tracking',quality:'limited'});
  s = reduce(s, {type:'drag',point:[9,9,9]});
  assert.equal(s.lockedWorldPosition,pose);
  s = reduce(s, {type:'tracking',quality:'normal'});
  s = reduce(s, {type:'reposition'});
  s = reduce(s, {type:'place',point:[9,9,9]});
  assert.deepEqual(s.lockedWorldPosition,[0,-1,-1]);
  s = reduce(s, {type:'plane',anchor:anchor('floor',10),now:9000});
  assert.equal(s.lockedSurface,lock);
  assert.equal(s.lockedWorldPosition[1],-1);
});

test('manual tap captures one hit, confirms it, and ignores future results', () => {
  let s = reduce(scanned(), {type:'mode',mode:'manual'});
  s = reduce(s,{type:'manual-tap',x:100,y:200});
  const id = s.manualRequest.id;
  s = reduce(s,{type:'manual-result',id,point:[0,-1,0]});
  assert.equal(s.lockedSurface,null);
  s = reduce(s,{type:'confirm'});
  s = reduce(s,{type:'place',point:[0,-1,0]});
  const lock = s.lockedSurface;
  s = reduce(s,{type:'manual-result',id,point:[0,3,0]});
  s = reduce(s,{type:'manual-tap',x:200,y:200});
  s = reduce(s,{type:'drag',point:[2,3,2]});
  assert.deepEqual(s.lockedWorldPosition,[2,-1,2]);
  assert.equal(s.lockedSurface,lock);
  assert.equal(s.manualRequest,null);
});

test('late manual results cannot restore a reset selection or replace a newer request', () => {
  let s = reduce(scanned(),{type:'mode',mode:'manual'});
  s = reduce(s,{type:'manual-tap',x:100,y:100});
  const oldId = s.manualRequest.id;
  s = reduce(s,{type:'reset'});
  s = reduce(s,{type:'mode',mode:'manual'});
  s = reduce(s,{type:'manual-tap',x:200,y:200});
  const newId = s.manualRequest.id;
  s = reduce(s,{type:'manual-result',id:oldId,point:[0,9,0]});
  assert.equal(s.selectedSurface,null);
  assert.equal(s.manualRequest.id,newId);
  s = reduce(s,{type:'manual-result',id:newId,point:null});
  assert.ok(s.manualError);
  assert.equal(s.lockedSurface,null);
});

test('dimensions change child center height, never contact; reposition keeps lock', () => {
  let s = placed();
  const contact = s.lockedWorldPosition;
  s = reduce(s,{type:'dimensions',dimensions:{width:3,depth:6,height:2.5}});
  assert.equal(s.lockedWorldPosition,contact);
  assert.equal(getContainerCenterY(s.lockedWorldPosition[1],s.dimensions.height),.25);
  s = reduce(s,{type:'rotate',delta:35});
  s = reduce(s,{type:'height',delta:.1});
  const lock = s.lockedSurface;
  s = reduce(s,{type:'reposition'});
  assert.equal(s.lockedSurface,lock);
  assert.deepEqual(s.lockedWorldPosition,[0,-.9,-1]);
  assert.equal(s.objectRotation,35);
  assert.equal(s.verticalOffset,.1);
});

test('ten placement resets preserve live camera, tracking and plane cache', () => {
  let s = placed();
  s = reduce(s,{type:'dimensions',dimensions:{width:3,depth:6,height:2.5}});
  for (let i=0;i<10;i++) {
    const camera = s.camera, planes = s.detectedPlanes;
    s = reduce(s,{type:'reset'});
    assert.equal(s.lockedSurface,null);
    assert.equal(s.selectedSurface,null);
    assert.equal(s.lockedWorldPosition,null);
    assert.equal(s.detectedPlanes,planes);
    assert.equal(s.camera,camera);
    assert.equal(s.tracking,'normal');
    assert.equal(s.objectRotation,0);
    assert.equal(s.verticalOffset,0);
    assert.deepEqual(s.dimensions,{width:3,depth:6,height:2.5});
    s = reduce(s,{type:'select',id:'floor',point:[0,-1,-1]});
    s = reduce(s,{type:'confirm'});
    s = reduce(s,{type:'place',point:[0,50,-1]});
    assert.deepEqual(s.lockedWorldPosition,[0,-1,-1]);
  }
});

test('only explicit tracking restart clears the tracking cache', () => {
  const s = reduce(placed(),{type:'restart-tracking'});
  assert.equal(s.camera,null);
  assert.equal(s.tracking,'initializing');
  assert.deepEqual(s.detectedPlanes,{});
  assert.equal(s.lockedSurface,null);
});

test('rotated footprint uses the rendered yaw, not the old axis-aligned rectangle', () => {
  const floor = {...anchor(), vertices:[[-.6,0,-2],[.6,0,-2],[.6,0,2],[-.6,0,2]]};
  assert.equal(footprintFits([0,-1,0],{width:1,depth:3,height:1},floor,0),true);
  assert.equal(footprintFits([0,-1,0],{width:1,depth:3,height:1},floor,90),false);
});
test('tiny and vertical planes cannot be selected; placement requires normal tracking', () => {
  let s = scanned();
  s = reduce(s,{type:'plane',anchor:{...anchor('tiny'),width:.1},now:0});
  s = reduce(s,{type:'plane',anchor:{...anchor('wall'),alignment:'Vertical'},now:0});
  s = reduce(s,{type:'camera',position:[0,.5,0],now:2000});
  assert.equal(reduce(s,{type:'select',id:'tiny',point:[0,0,0]}).selectedSurface,null);
  assert.equal(s.detectedPlanes.wall,undefined);
  s = reduce(s,{type:'tracking',quality:'initializing'});
  assert.equal(reduce(s,{type:'select',id:'floor',point:[0,-1,0]}).selectedSurface,null);
});
test('camera updates do not rewrite an unchanged object transform', () => {
  const s = placed();
  const next = reduce(s,{type:'camera',position:[1,.6,1],now:3000});
  assert.equal(next.lockedWorldPosition,s.lockedWorldPosition);
  assert.equal(next.selectedSurface,s.selectedSurface);
});

test('one event plus camera time never makes an automatic candidate ready', () => {
  let s = reduce(initialPlacement(),{type:'tracking',quality:'normal'});
  s = reduce(s,{type:'plane',anchor:anchor(),now:0});
  for (let now=200;now<=5000;now+=200) s = reduce(s,{type:'camera',position:[0,1,0],now});
  assert.equal(s.detectedPlanes.floor.selectable,false);
  s = reduce(s,{type:'select',id:'floor',point:[0,-1,0]});
  assert.equal(s.selectedSurface,null);
});

test('unstable recent Y blocks readiness; a new stable window can recover', () => {
  let s = reduce(initialPlacement(),{type:'tracking',quality:'normal'});
  for (const now of [0,500,1000,1500]) {
    s = reduce(s,{type:'plane',anchor:anchor('floor',now===1000 ? -.8 : -1),now});
  }
  assert.equal(s.detectedPlanes.floor.selectable,false);
  for (const now of [4500,5000,5500,6000]) s = reduce(s,{type:'plane',anchor:anchor(),now});
  assert.equal(s.detectedPlanes.floor.selectable,true);
  s = reduce(s,{type:'select',id:'floor',point:[0,-1,0]});
  assert.equal(canConfirmSurface(s),true);
});

test('confirmation rechecks freshness, stability and tracking after selection', () => {
  const selected = reduce(scanned(),{type:'select',id:'floor',point:[0,-1,0]});
  const stale = reduce(selected,{type:'camera',position:[0,1,0],now:5000});
  const unstable = reduce(selected,{type:'plane',anchor:anchor('floor',-.8),now:1600});
  const limited = reduce(selected,{type:'tracking',quality:'limited'});
  for (const s of [stale,unstable,limited]) {
    assert.equal(canConfirmSurface(s),false);
    assert.equal(reduce(s,{type:'confirm'}).lockedWorldPosition,null);
  }
});

test('confirmation copies XYZ independently; Place does not recalculate it', () => {
  const tap = [.2,-1,-.3];
  let s = reduce(scanned(),{type:'select',id:'floor',point:tap});
  s = reduce(s,{type:'confirm'});
  const snapshot = s.lockedWorldPosition;
  assert.notEqual(snapshot,tap);
  assert.notEqual(snapshot,s.selectionPoint);
  tap[0] = 999;
  assert.deepEqual(snapshot,[.2,-1,-.3]);
  s = reduce(s,{type:'place',point:[100,100,100]});
  assert.equal(s.lockedWorldPosition,snapshot);
});

test('automatic and manual freezes retain identical XYZ through scene changes', () => {
  const automatic = placed();
  let manual = reduce(scanned(),{type:'mode',mode:'manual'});
  manual = reduce(manual,{type:'manual-tap',x:100,y:200});
  manual = reduce(manual,{type:'manual-result',id:manual.manualRequest.id,point:[0,-1,-1]});
  manual = reduce(manual,{type:'confirm'});
  manual = reduce(manual,{type:'place',point:[0,-1,-1]});
  for (let s of [automatic,manual]) {
    const original = s.lockedWorldPosition;
    const revision = s.poseRevision;
    for (let i=0;i<30;i++) {
      s = reduce(s,{type:'plane',anchor:{...anchor('floor',i),position:[i,i,-i],width:10+i},now:2000+i*100});
      s = reduce(s,{type:'plane',anchor:anchor('cupboard',5),now:2000+i*100});
      s = reduce(s,{type:'camera',position:[i,-2,i],now:2000+i*100});
      s = reduce(s,{type:'manual-result',id:12345,point:[10,10,10]});
      assert.equal(s.lockedWorldPosition,original);
      assert.equal(s.poseRevision,revision);
      assert.equal(s.lockedSurface.groundY,-1);
    }
    s = reduce(s,{type:'move',x:.1,z:.2});
    s = reduce(s,{type:'height',delta:.05});
    assert.deepEqual(s.lockedWorldPosition,[.1,-.95,-.8]);
  }
});

test('pose audit detects unauthorized XYZ or rotation changes but allows user movement', () => {
  const before = placed();
  for (let axis=0;axis<3;axis++) {
    const point = [...before.lockedWorldPosition];
    point[axis] += .01;
    assert.equal(unexpectedPoseChange(before,{...before,lockedWorldPosition:point}),true);
  }
  assert.equal(unexpectedPoseChange(before,{...before,objectRotation:90}),true);
  assert.equal(unexpectedPoseChange(before,reduce(before,{type:'move',x:1,z:1})),false);
  assert.equal(unexpectedPoseChange(before,reduce(before,{type:'reset'})),false);
  assert.equal(unexpectedPoseChange(before,reduce(before,{type:'camera',position:[1,2,3],now:2000})),false);
});
