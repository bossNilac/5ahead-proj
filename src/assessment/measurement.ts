import { localSupports, type Layout } from "../layout/layout";
import type { Vector3, TrackingQuality } from "../../types";

export type CameraReading = {
  timestamp: number;
  positionAR: Vector3;
  forward: Vector3;
  up: Vector3;
  rotation: Vector3;
};
export const CONTAINER = Object.freeze({ width: 3, depth: 6, height: 2.5 });
export type SupportPoint = { id: number; position: Vector3 };
export type ContactCapture = {
  id: number;
  timestamp: number;
  cameraPosition: Vector3;
  spreadCm: number;
  tiltDeg: number;
};
// Tolerance is for the camera proxy, not a claim of contact-point accuracy.
// Duration and continuity are the main checks, rather than assuming a frame rate.
export const CONTACT_LIMITS = {
  radiusM: 0.3,
  tiltDeg: 10,
  windowMs: 3000,
  spanMs: 2000,
  minSamples: 3,
  maxGapMs: 650,
  spreadM: 0.015,
  freshMs: 750,
};

export function supportPoints(
  center: Vector3,
  yawDeg: number,
  layout: Layout = "single",
): SupportPoint[] {
  const local = localSupports(layout);
  const a = (yawDeg * Math.PI) / 180;
  return local.map(({ z, x, id }) => ({
    id,
    position: [
      center[0] + Math.cos(a) * x + Math.sin(a) * z,
      center[1],
      center[2] - Math.sin(a) * x + Math.cos(a) * z,
    ],
  }));
}
const validVector = (v: Vector3) =>
  Array.isArray(v) && v.length === 3 && v.every(Number.isFinite);
export function contactQuality(
  samples: CameraReading[],
  target: SupportPoint,
  tracking: TrackingQuality,
  now: number,
) {
  const window = samples.filter(
    (s) => s.timestamp <= now && now - s.timestamp <= CONTACT_LIMITS.windowMs,
  );
  const valid = (s: CameraReading) =>
    validVector(s.positionAR) && validVector(s.up) && Math.hypot(...s.up) > 0.5;
  const latest = window.at(-1);
  const distance = (s: CameraReading) =>
    Math.hypot(
      s.positionAR[0] - target.position[0],
      s.positionAR[2] - target.position[2],
    );
  const distanceM = latest && valid(latest) ? distance(latest) : Infinity;
  const tilt = (s: CameraReading) =>
    (Math.acos(
      Math.max(-1, Math.min(1, s.up[1] / (Math.hypot(...s.up) || 1))),
    ) *
      180) /
    Math.PI;
  const tiltDeg = latest && valid(latest) ? tilt(latest) : Infinity;
  const spread = (readings: CameraReading[]) =>
    Math.max(
      ...[0, 1, 2].map(
        (axis) =>
          Math.max(...readings.map((s) => s.positionAR[axis])) -
          Math.min(...readings.map((s) => s.positionAR[axis])),
      ),
    );
  // Use the most recent continuous steady hold. Approaching/tilting earlier
  // should restart the timer, rather than poison the entire rolling window.
  let readings: CameraReading[] = [];
  for (let i = window.length - 1; i >= 0; i--) {
    const s = window[i],
      next = readings[0];
    if (
      !valid(s) ||
      distance(s) > CONTACT_LIMITS.radiusM ||
      tilt(s) > CONTACT_LIMITS.tiltDeg ||
      (next &&
        (next.timestamp <= s.timestamp ||
          next.timestamp - s.timestamp > CONTACT_LIMITS.maxGapMs))
    )
      break;
    const candidate = [s, ...readings];
    if (spread(candidate) > CONTACT_LIMITS.spreadM) break;
    readings = candidate;
  }
  const spreadM = readings.length ? spread(readings) : Infinity;
  const stableMs = readings.length
    ? readings.at(-1)!.timestamp - readings[0].timestamp
    : 0;
  const checks = {
    tracking: tracking === "normal",
    fresh:
      !!latest &&
      valid(latest) &&
      now - latest.timestamp <= CONTACT_LIMITS.freshMs,
    nearby: distanceM <= CONTACT_LIMITS.radiusM,
    upright: tiltDeg <= CONTACT_LIMITS.tiltDeg,
    steady:
      readings.length >= CONTACT_LIMITS.minSamples &&
      stableMs >= CONTACT_LIMITS.spanMs,
  };
  const ready = Object.values(checks).every(Boolean);
  let reason =
    "Ready. Press the button below only with the bottom edge touching ground.";
  if (!checks.tracking)
    reason =
      "Tracking is poor. Keep textured surroundings visible and move slowly.";
  else if (!checks.fresh) reason = "Waiting for a fresh, valid camera pose.";
  else if (!checks.nearby)
    reason = `Move closer to point ${target.id}: ${(distanceM * 100).toFixed(0)} cm away (limit ${CONTACT_LIMITS.radiusM * 100} cm).`;
  else if (!checks.upright)
    reason = `Straighten the phone: ${tiltDeg.toFixed(1)}° tilt (limit ${CONTACT_LIMITS.tiltDeg}°).`;
  else if (!checks.steady)
    reason = `Keep still: ${(Math.min(stableMs, CONTACT_LIMITS.spanMs) / 1000).toFixed(1)} / ${CONTACT_LIMITS.spanMs / 1000} seconds.`;
  return {
    ready,
    reason,
    checks,
    stableMs,
    distanceM,
    tiltDeg,
    spreadM,
    readings,
  };
}
export function captureContact(
  samples: CameraReading[],
  target: SupportPoint,
  tracking: TrackingQuality,
  now: number,
): ContactCapture | null {
  const quality = contactQuality(samples, target, tracking, now);
  if (!quality.ready) return null;
  const median = (values: number[]) =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  return Object.freeze({
    id: target.id,
    timestamp: now,
    cameraPosition: Object.freeze(
      [0, 1, 2].map((axis) =>
        median(quality.readings.map((s) => s.positionAR[axis])),
      ),
    ) as unknown as Vector3,
    spreadCm: quality.spreadM * 100,
    tiltDeg: quality.tiltDeg,
  });
}
export function contactResult(
  capture: ContactCapture,
  reference: ContactCapture,
  target: SupportPoint,
) {
  // Same phone/case, bottom edge on ground, same upright orientation: the unknown
  // camera-to-bottom height cancels in the DIFFERENCE. No invented device height.
  // Camera X/Z approximate the contact point's horizontal coordinates. The
  // camera is offset from the bottom-edge centre, so this is not exact contact
  // metrology. Keep measured camera coordinates separate from planned supports.
  const deltaHeightCm =
    (capture.cameraPosition[1] - reference.cameraPosition[1]) * 100;
  return {
    id: capture.id,
    plannedPosition: [...target.position],
    cameraPosition: [...capture.cameraPosition],
    relativeHeightCm: deltaHeightCm,
    estimatedPosition: [
      capture.cameraPosition[0],
      target.position[1] + deltaHeightCm / 100,
      capture.cameraPosition[2],
    ],
    timestamp: capture.timestamp,
    spreadCm: capture.spreadCm,
    tiltDeg: capture.tiltDeg,
  };
}
