import { layoutSpec, diagramGeometry, type Layout } from "../layout/layout";
import type { ContactCapture, contactResult } from "../assessment/measurement";
import type { Vector3 } from "../../types";
export type Measurement = ReturnType<typeof contactResult>;
export type Project = {
  id: string;
  layout: Layout;
  name: string;
  location: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  status: "draft" | "completed";
  favorite: boolean;
  position?: Vector3;
  rotation?: number;
  measurements: Measurement[];
  captures: ContactCapture[];
  photoUri?: string;
};
export type Preferences = {
  theme: "day" | "night";
  language: "en" | "nl";
  onboarded: boolean;
};
export type Profile = { name: string; email: string; company: string };
export type AppData = {
  version: 1;
  projects: Project[];
  preferences: Preferences;
  profile: Profile;
};
export const initialData: AppData = {
  version: 1,
  projects: [],
  preferences: { theme: "night", language: "en", onboarded: false },
  profile: { name: "", email: "", company: "" },
};
export function createProject(
  name: string,
  location: string,
  notes: string,
  now = Date.now(),
  layout: Layout = "single",
): Project {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 10)}`,
    layout,
    name: name.trim(),
    location: location.trim(),
    notes: notes.trim(),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    favorite: false,
    measurements: [],
    captures: [],
  };
}
export function summary(measurements: Measurement[]) {
  const heights = measurements.map((r) => r.relativeHeightCm);
  return {
    min: heights.length ? Math.min(...heights) : 0,
    max: heights.length ? Math.max(...heights) : 0,
    range: heights.length ? Math.max(...heights) - Math.min(...heights) : 0,
  };
}
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function reportHtml(project: Project, profile: Profile) {
  const stats = summary(project.measurements);
  const spec = layoutSpec(project.layout);
  const geometry = diagramGeometry(project.layout);
  const diagram = `<svg viewBox="0 0 360 ${geometry.viewHeight}" style="width:100%;max-height:300px" xmlns="http://www.w3.org/2000/svg"><rect x="${geometry.left}" y="${geometry.top}" width="${geometry.width}" height="${geometry.height}" stroke="#76818a" fill="none"/>${project.layout === "dual" ? `<path d="M${geometry.left} ${geometry.top + geometry.height / 2}h${geometry.width}" stroke="#76818a" stroke-dasharray="4 3" fill="none"/>` : ""}<text x="180" y="${geometry.labelY}" text-anchor="middle" font-family="Helvetica" font-size="15">${spec.sizeLabel}</text>${geometry.points
    .map(({ x, y, labelY, id }) => {
      const r = project.measurements.find((r) => r.id === id);
      const height = r?.relativeHeightCm ?? 0;
      const color =
        Math.abs(height) > 5
          ? "#DC4D4D"
          : Math.abs(height) > 2
            ? "#EC8900"
            : "#88B64A";
      return `<circle cx="${x}" cy="${y}" r="6" fill="${color}"/><text x="${x}" y="${labelY}" text-anchor="middle" font-family="Helvetica" font-size="11">P${id} · ${height.toFixed(1)} cm</text>`;
    })
    .join("")}</svg>`;
  return `<!doctype html><html><head><title>PLCR · ${escapeHtml(project.name)}</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:Helvetica,Arial,sans-serif;color:#20282e;padding:32px}header{background:#ec8900;padding:20px;border-radius:12px}h1{letter-spacing:4px}h2{margin-top:28px}table{width:100%;border-collapse:collapse}th,td{padding:10px;text-align:left;border-bottom:1px solid #d4d9dc}.note{font-size:12px;color:#56626b;line-height:1.6}.summary{background:#edf2f5;padding:16px;border-radius:12px}</style></head><body><header><h1>PLCR</h1><strong>Container ground assessment</strong></header><h2>${escapeHtml(project.name)}</h2><p>${escapeHtml(project.location)} · ${new Date(project.updatedAt).toISOString().slice(0, 10)}</p><p>${escapeHtml(profile.name)} ${escapeHtml(profile.company)}</p><p>${escapeHtml(project.notes)}</p><p>${spec.label} · ${spec.pointCount} support points</p><h2>Container position</h2>${diagram}<h2>Height measurement · ${spec.sizeLabel}</h2><table><tr><th>Point</th><th>Relative height</th><th>Spread</th><th>Estimated contact XYZ (cm)</th></tr>${project.measurements.map((r) => `<tr><td>P${r.id}</td><td>${r.relativeHeightCm.toFixed(1)} cm</td><td>${r.spreadCm.toFixed(1)} cm</td><td>${r.estimatedPosition.map((v) => (v * 100).toFixed(1)).join(" / ")}</td></tr>`).join("")}</table><h2>Summary</h2><div class="summary">Maximum: ${stats.max.toFixed(1)} cm · Minimum: ${stats.min.toFixed(1)} cm · Height difference: ${stats.range.toFixed(1)} cm</div><p class="note">Point 1 is the reference height. These are relative local AR estimates, not surveyed elevations. Camera X/Z approximate contact location; the camera-to-edge offset is not calibrated. Capture conditions do not certify measurement accuracy or site suitability. Review with a qualified professional before installation.</p></body></html>`;
}
// Validate persisted records before any screen or report uses their coordinates.
export function parseData(raw: string | null): AppData {
  if (!raw) return JSON.parse(JSON.stringify(initialData));
  const d = JSON.parse(raw);
  const vector = (v: unknown) =>
    Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
  if (
    d.version !== 1 ||
    !Array.isArray(d.projects) ||
    !d.preferences ||
    !d.profile
  )
    throw new Error("Saved PLCR data is not supported.");
  if (
    !["day", "night"].includes(d.preferences.theme) ||
    !["en", "nl"].includes(d.preferences.language) ||
    typeof d.preferences.onboarded !== "boolean"
  )
    throw new Error("Saved preferences are invalid.");
  if (
    !["name", "email", "company"].every((k) => typeof d.profile[k] === "string")
  )
    throw new Error("Saved profile is invalid.");
  const projectIds = new Set();
  for (const p of d.projects) {
    if (!p || projectIds.has(p.id))
      throw new Error("Saved project IDs are invalid.");
    projectIds.add(p.id);
    // Legacy v1 projects predate the selector and always use the single layout.
    if (p.layout === undefined) p.layout = "single";
    if (!["single", "dual"].includes(p.layout))
      throw new Error("Saved layout is invalid.");
    const pointCount = layoutSpec(p.layout).pointCount;
    if (
      typeof p.id !== "string" ||
      typeof p.name !== "string" ||
      !p.name.trim() ||
      typeof p.location !== "string" ||
      typeof p.notes !== "string" ||
      typeof p.favorite !== "boolean" ||
      !Number.isFinite(p.createdAt) ||
      !Number.isFinite(p.updatedAt) ||
      !["draft", "completed"].includes(p.status) ||
      !Array.isArray(p.measurements) ||
      !Array.isArray(p.captures)
    )
      throw new Error("Saved project is invalid.");
    if (p.position && !vector(p.position))
      throw new Error("Saved placement is invalid.");
    if (p.rotation !== undefined && !Number.isFinite(p.rotation))
      throw new Error("Saved rotation is invalid.");
    if (p.photoUri !== undefined && typeof p.photoUri !== "string")
      throw new Error("Saved photo is invalid.");
    const captureIds = new Set();
    for (const c of p.captures) {
      if (
        !c ||
        !Number.isInteger(c.id) ||
        c.id < 1 ||
        c.id > pointCount ||
        captureIds.has(c.id) ||
        !Number.isFinite(c.timestamp) ||
        !Number.isFinite(c.spreadCm) ||
        !Number.isFinite(c.tiltDeg) ||
        !vector(c.cameraPosition)
      )
        throw new Error("Saved capture is invalid.");
      captureIds.add(c.id);
    }
    const ids = new Set();
    for (const r of p.measurements) {
      if (
        !r ||
        !Number.isInteger(r.id) ||
        r.id < 1 ||
        r.id > pointCount ||
        ids.has(r.id) ||
        !Number.isFinite(r.relativeHeightCm) ||
        !Number.isFinite(r.spreadCm) ||
        !Number.isFinite(r.timestamp) ||
        !Number.isFinite(r.tiltDeg) ||
        !vector(r.estimatedPosition) ||
        !vector(r.plannedPosition) ||
        !vector(r.cameraPosition)
      )
        throw new Error("Saved measurement is invalid.");
      ids.add(r.id);
    }
    if (p.status === "completed" && p.measurements.length !== pointCount)
      throw new Error("Completed project is missing measurements.");
  }
  return d as AppData;
}
