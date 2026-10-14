import type { Dimensions } from "../../types";
export type Layout = "single" | "dual";
export function layoutSpec(layout: Layout = "single") {
  const dual = layout === "dual";
  return {
    layout,
    dimensions: Object.freeze({
      width: dual ? 6 : 3,
      depth: 6,
      height: 2.5,
    }) as Dimensions,
    pointCount: dual ? 9 : 6,
    label: dual ? "Two containers" : "Single container",
    sizeLabel: dual ? "6 m × 6 m" : "6 m × 3 m",
  };
}
// Each long support line is visited end → midpoint → end. In dual mode
// the middle line is shared by both containers, counted once (P4–P6).
export function localSupports(layout: Layout = "single") {
  const lines = layout === "dual" ? [-3, 0, 3] : [-1.5, 1.5];
  return lines
    .flatMap((x) => [-3, 0, 3].map((z) => ({ x, z })))
    .map((p, i) => ({ ...p, id: i + 1 }));
}
// One projection used by both the app's diagram and the exported PDF.
export function diagramGeometry(layout: Layout = "single") {
  const dual = layout === "dual";
  const left = dual ? 75 : 60,
    top = 45,
    width = dual ? 210 : 240,
    height = dual ? 210 : 130;
  return {
    left,
    top,
    width,
    height,
    viewHeight: dual ? 300 : 225,
    labelY: dual ? top + height / 4 : top + height / 2,
    points: localSupports(layout).map((p) => ({
      id: p.id,
      x: left + ((p.z + 3) / 6) * width,
      y: top + ((p.x + (dual ? 3 : 1.5)) / (dual ? 6 : 3)) * height,
      labelY:
        top +
        ((p.x + (dual ? 3 : 1.5)) / (dual ? 6 : 3)) * height +
        (p.x < 0 ? -17 : 27),
    })),
  };
}
