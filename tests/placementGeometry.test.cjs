const { test } = require('node:test');
const assert = require('node:assert/strict');
const { footprintFits, parseDimensions } = require('../placementGeometry.ts');
const size = { width: 1, depth: 1, height: 2 };
const plane = {
  position: [0, 0, 0], rotation: [0, 0, 0],
  vertices: [[-1,0,-1], [1,0,-1], [1,0,1], [-1,0,1]],
};

test('metre inputs allow decimals and decimal commas, reject invalid dimensions', () => {
  assert.deepEqual(parseDimensions(['0.6','0,4','0.3']), { width: .6, depth: .4, height: .3 });
  for (const bad of ['', ' ', '0', '-1', 'NaN', 'Infinity', 'hello']) {
    assert.equal(parseDimensions([bad, '1', '1']), null);
  }
});
test('full footprint must fit, not just its centre', () => {
  assert.equal(footprintFits([0,0,0], size, plane), true);
  assert.equal(footprintFits([.8,0,0], size, plane), false);
  assert.equal(footprintFits([0,0,0], {...size, width: 3}, plane), false);
  assert.equal(footprintFits([0,0,0], {...size, width: 2, depth: 2}, plane), true);
});
test('missing surface or revised floor height is unknown', () => {
  assert.equal(footprintFits([0,0,0], size, {...plane, vertices: []}), null);
  assert.equal(footprintFits([0,.2,0], size, plane), null);
});
test('translated and rotated anchors do not change the footprint coordinate frame', () => {
  const rotated = {...plane, position: [5,-1,8], rotation: [0,90,0],
    vertices: [[-2,0,-.5], [2,0,-.5], [2,0,.5], [-2,0,.5]]};
  assert.equal(footprintFits([5,-1,8], {width: .8, depth: 3, height: 1}, rotated), true);
  assert.equal(footprintFits([5,-1,8], {width: 3, depth: .8, height: 1}, rotated), false);
});
test('concave notch crossing a footprint edge fails even with all four corners inside', () => {
  const notched = {...plane, vertices: [[-2,0,-2],[2,0,-2],[2,0,2],
    [.2,0,2],[.2,0,0],[-.2,0,0],[-.2,0,2],[-2,0,2]]};
  assert.equal(footprintFits([0,0,0], {width: 2, depth: 2, height: 1}, notched), false);
});
test('floor-only fit does not test overhead clearance', () => {
  assert.equal(footprintFits([0,0,0], {...size, height: 50}, plane), true);
});
