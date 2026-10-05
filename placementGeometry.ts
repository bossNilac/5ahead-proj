import type { Dimensions, Vector3 } from './types';

type Point = [number, number];
type Plane = { position: Vector3; rotation: Vector3; vertices?: Vector3[] };
const EPS = 1e-7;
export function getContainerCenterY(groundY: number, height: number, verticalOffset = 0): number {
  return groundY + height / 2 + verticalOffset;
}
export function enforceContactPosition(point: Vector3, groundY: number, verticalOffset: number): Vector3 {
  return [point[0], groundY + verticalOffset, point[2]];
}
const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

export function parseDimensions(values: string[]): Dimensions | null {
  const numbers = values.map(value => Number(value.trim().replace(',', '.')));
  if (numbers.length !== 3 || numbers.some(value => !Number.isFinite(value) || value <= 0)) return null;
  const [width, depth, height] = numbers;
  return { width, depth, height };
}

function contains(p: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i];
    if (Math.abs(cross(a, b, p)) < EPS && p[0] >= Math.min(a[0], b[0]) - EPS
      && p[0] <= Math.max(a[0], b[0]) + EPS && p[1] >= Math.min(a[1], b[1]) - EPS
      && p[1] <= Math.max(a[1], b[1]) + EPS) return true;
    if ((a[1] > p[1]) !== (b[1] > p[1])
      && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

// Split every footprint edge at boundary intersections, then test each interval.
// Checking only four corners incorrectly accepts footprints spanning a concavity.
function edgeInside(a: Point, b: Point, polygon: Point[]): boolean {
  const cuts = [0, 1];
  const r: Point = [b[0] - a[0], b[1] - a[1]];
  for (let i = 0; i < polygon.length; i++) {
    const c = polygon[i], d = polygon[(i + 1) % polygon.length];
    const s: Point = [d[0] - c[0], d[1] - c[1]];
    const denominator = r[0] * s[1] - r[1] * s[0];
    if (Math.abs(denominator) < EPS) continue;
    const q: Point = [c[0] - a[0], c[1] - a[1]];
    const t = (q[0] * s[1] - q[1] * s[0]) / denominator;
    const u = (q[0] * r[1] - q[1] * r[0]) / denominator;
    if (t > 0 && t < 1 && u >= -EPS && u <= 1 + EPS) cuts.push(t);
  }
  cuts.sort((x, y) => x - y);
  return cuts.slice(1).every((end, i) => {
    const t = (cuts[i] + end) / 2;
    return contains([a[0] + r[0] * t, a[1] + r[1] * t], polygon);
  });
}

export function footprintFits(position: Vector3, size: Dimensions, plane: Plane, rotationY = 0): boolean | null {
  if (!plane.vertices || plane.vertices.length < 3) return null;
  // This prototype accepts horizontal floor patches. If ARKit has revised the
  // floor height away from the saved base, don't report a supported footprint.
  if (Math.abs(position[1] - plane.position[1]) > 0.03) return null;
  // Inverse of Viro's Rx * Ry * Rz anchor rotation. World box has no rotation.
  const [rx, ry, rz] = plane.rotation.map(v => v * Math.PI / 180);
  const c1 = Math.cos(rx), s1 = Math.sin(rx), c2 = Math.cos(ry), s2 = Math.sin(ry);
  const c3 = Math.cos(rz), s3 = Math.sin(rz);
  const corners: Point[] = [[-1,-1], [1,-1], [1,1], [-1,1]].map(([sx, sz]) => {
    const angle = rotationY * Math.PI / 180;
    const x = sx * size.width / 2, z = sz * size.depth / 2;
    const dx = position[0] + Math.cos(angle) * x + Math.sin(angle) * z - plane.position[0];
    const dy = position[1] - plane.position[1];
    const dz = position[2] - Math.sin(angle) * x + Math.cos(angle) * z - plane.position[2];
    return [c2*c3*dx + (s1*s2*c3+c1*s3)*dy + (-c1*s2*c3+s1*s3)*dz,
      s2*dx - s1*c2*dy + c1*c2*dz];
  });
  const boundary: Point[] = plane.vertices.map(([x, , z]) => [x, z]);
  return corners.every(p => contains(p, boundary))
    && corners.every((p, i) => edgeInside(p, corners[(i + 1) % 4], boundary));
}
