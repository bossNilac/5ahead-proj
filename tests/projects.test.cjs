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
  createProject,
  parseData,
  initialData,
  reportHtml,
  summary,
} = require("../src/projects/model.ts");
const {
  contactResult,
  supportPoints,
} = require("../src/assessment/measurement.ts");
function completed() {
  const points = supportPoints([1, 0, 2], 15);
  const captures = points.map((p) => ({
    id: p.id,
    timestamp: 100 + p.id,
    cameraPosition: [p.position[0], p.id * 0.01, p.position[2]],
    spreadCm: 0.4,
    tiltDeg: 2,
  }));
  return {
    ...createProject("Test site", "Amsterdam", "", 100),
    status: "completed",
    captures,
    measurements: captures.map((c, i) =>
      contactResult(c, captures[0], points[i]),
    ),
    position: [1, 0, 2],
    rotation: 15,
  };
}
test("draft metadata and completed measurements survive a storage round trip", () => {
  const draft = createProject("  Site A  ", "  East  ", " Check ground ", 100);
  assert.equal(draft.name, "Site A");
  assert.equal(draft.status, "draft");
  const data = { ...initialData, projects: [draft, completed()] };
  assert.deepEqual(parseData(JSON.stringify(data)), data);
});
test("invalid persisted data fails rather than overwriting the saved record", () => {
  assert.throws(() => parseData("{"), SyntaxError);
  assert.throws(() =>
    parseData(JSON.stringify({ ...initialData, version: 2 })),
  );
  const bad = completed();
  bad.measurements[0].estimatedPosition = [1, null, 2];
  assert.throws(
    () => parseData(JSON.stringify({ ...initialData, projects: [bad] })),
    /measurement/,
  );
  assert.throws(
    () =>
      parseData(
        JSON.stringify({
          ...initialData,
          projects: [{ ...completed(), measurements: [] }],
        }),
      ),
    /missing measurements/,
  );
  const duplicate = completed();
  duplicate.measurements[1].id = 1;
  assert.throws(
    () => parseData(JSON.stringify({ ...initialData, projects: [duplicate] })),
    /measurement/,
  );
});
test("reports use measured heights and safely escape user metadata", () => {
  const project = completed();
  project.name = "<script>alert(1)</script>";
  project.notes = "A & B";
  const html = reportHtml(project, {
    name: "<b>Alice</b>",
    email: "",
    company: 'Site "One"',
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("A &amp; B"));
  assert.ok(html.includes("5.0 cm"));
  assert.ok(html.includes("not surveyed elevations"));
  assert.deepEqual(summary(project.measurements), { min: 0, max: 5, range: 5 });
});
