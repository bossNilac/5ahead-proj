const ts = require("typescript");
const fs = require("node:fs");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    }).outputText,
    filename,
  );
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  layoutSpec,
  localSupports,
  diagramGeometry,
} = require("../src/layout/layout.ts");
const {
  supportPoints,
  captureContact,
  contactResult,
} = require("../src/assessment/measurement.ts");
const {
  initialPlacement,
  placementReducer: reduce,
} = require("../placementState.ts");
const {
  createProject,
  initialData,
  parseData,
  reportHtml,
  summary,
} = require("../src/projects/model.ts");
const { DIGIT_SEGMENTS } = require("../src/assessment/markerDigits.ts");
function completed(layout) {
  const project = createProject("Layout test", "Site A", "", 100, layout);
  const points = supportPoints([10, -1, 20], 35, layout);
  const captures = points.map((p, i) => {
    const now = 10000 + i * 4000;
    const readings = Array.from({ length: 11 }, (_, n) => ({
      timestamp: now - 2000 + n * 200,
      positionAR: [p.position[0], -0.8 + i * 0.01, p.position[2]],
      up: [0, 1, 0],
      forward: [0, 0, -1],
      rotation: [0, 0, 0],
    }));
    const capture = captureContact(readings, p, "normal", now);
    assert.ok(capture);
    return capture;
  });
  return {
    ...project,
    status: "completed",
    position: [10, -1, 20],
    rotation: 35,
    captures,
    measurements: captures.map((c, i) =>
      contactResult(c, captures[0], points[i]),
    ),
  };
}
test("dual layout has nine unique ordered points on three 6m support lines", () => {
  assert.deepEqual(layoutSpec("dual").dimensions, {
    width: 6,
    depth: 6,
    height: 2.5,
  });
  assert.deepEqual(
    supportPoints([0, 0, 0], 0, "dual").map((p) => p.position),
    [
      [-3, 0, -3],
      [-3, 0, 0],
      [-3, 0, 3],
      [0, 0, -3],
      [0, 0, 0],
      [0, 0, 3],
      [3, 0, -3],
      [3, 0, 0],
      [3, 0, 3],
    ],
  );
  assert.equal(
    new Set(localSupports("dual").map((p) => `${p.x}:${p.z}`)).size,
    9,
  );
  assert.deepEqual(
    localSupports("dual").map((p) => p.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  for (const p of localSupports("dual"))
    assert.ok(DIGIT_SEGMENTS[p.id], `Marker ${p.id} has a visible digit`);
});
test("rotated dual supports match the rotated footprint and share the center seam", () => {
  const center = [5, -2, 10];
  const points = supportPoints(center, 90, "dual");
  assert.deepEqual(points[4].position, center);
  for (let i = 0; i < 9; i++) {
    const local = localSupports("dual")[i];
    assert.ok(Math.abs(points[i].position[0] - (5 + local.z)) < 1e-10);
    assert.ok(Math.abs(points[i].position[2] - (10 - local.x)) < 1e-10);
    assert.equal(points[i].position[1], -2);
  }
});
test("dual placement stays fixed while measuring and retains layout after resets", () => {
  let model = initialPlacement("dual");
  model = reduce(model, { type: "tracking", quality: "normal" });
  model = reduce(model, { type: "mode", mode: "manual" });
  model = reduce(model, { type: "manual-tap", x: 10, y: 10 });
  model = reduce(model, {
    type: "manual-result",
    id: model.manualRequest.id,
    point: [1, -1, 2],
  });
  model = reduce(model, { type: "confirm" });
  model = reduce(model, { type: "place", point: model.selectionPoint });
  model = reduce(model, { type: "lock-placement" });
  for (const action of [
    { type: "move", x: 1, z: 0 },
    { type: "rotate", delta: 5 },
    { type: "dimensions", dimensions: { width: 3, depth: 6, height: 2.5 } },
  ])
    assert.deepEqual(reduce(model, action), model);
  for (const action of [
    { type: "edit-placement" },
    { type: "reset" },
    { type: "restart-tracking" },
  ]) {
    const result = reduce(model, action);
    assert.equal(result.layout, "dual");
    assert.equal(result.dimensions.width, 6);
  }
});
test("both layouts capture all supports, survive persistence, and export the correct report", () => {
  for (const layout of ["single", "dual"]) {
    const project = completed(layout);
    const count = layoutSpec(layout).pointCount;
    assert.equal(project.measurements.length, count);
    assert.deepEqual(
      parseData(JSON.stringify({ ...initialData, projects: [project] }))
        .projects[0],
      project,
    );
    const html = reportHtml(project, initialData.profile);
    assert.equal((html.match(/<circle /g) || []).length, count);
    assert.equal((html.match(/<tr><td>P/g) || []).length, count);
    assert.ok(html.includes(layoutSpec(layout).sizeLabel));
    assert.ok(html.includes(`P${count}`));
    assert.ok(
      Math.abs(summary(project.measurements).range - (count - 1)) < 1e-8,
    );
  }
});
test("legacy projects migrate to single; invalid layout counts cannot be loaded", () => {
  const legacy = completed("single");
  delete legacy.layout;
  assert.equal(
    parseData(JSON.stringify({ ...initialData, projects: [legacy] }))
      .projects[0].layout,
    "single",
  );
  for (const change of [
    (p) => (p.layout = "unknown"),
    (p) => (p.layout = "single"),
    (p) => p.measurements.pop(),
    (p) => (p.measurements[8].id = 10),
    (p) => (p.captures[8].id = 10),
  ]) {
    const bad = JSON.parse(JSON.stringify(completed("dual")));
    change(bad);
    assert.throws(() =>
      parseData(JSON.stringify({ ...initialData, projects: [bad] })),
    );
  }
});
test("screen and PDF projection preserves support IDs and a square dual footprint", () => {
  const diagram = diagramGeometry("dual");
  assert.equal(diagram.width, diagram.height);
  assert.equal(diagram.points.length, 9);
  assert.equal(diagram.points[4].x, diagram.left + diagram.width / 2);
  assert.equal(diagram.points[4].y, diagram.top + diagram.height / 2);
  assert.equal(diagramGeometry("single").points.length, 6);
});
