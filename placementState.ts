import type { PlacementAction, PlacementModel, Surface, Vector3 } from './types';
import { enforceContactPosition } from './placementGeometry';
import { CONTAINER } from './src/assessment/measurement';

export const MIN_PLANE_SIZE = 0.5;
export const PLANE_SETTLE_MS = 1500;
export const FLOOR_WINDOW_MS = 3000;
export const FLOOR_FRESH_MS = 1500;
export const FLOOR_MIN_SAMPLES = 4;
export const FLOOR_MAX_Y_RANGE = .02;
function candidateReady(p: PlacementModel['detectedPlanes'][string], now: number): boolean {
  const samples = p.samples.filter(sample => now - sample.now <= FLOOR_WINDOW_MS);
  const ys = samples.map(sample => sample.y);
  return samples.length >= FLOOR_MIN_SAMPLES && now - p.firstSeen >= PLANE_SETTLE_MS
    && samples[samples.length - 1].now - samples[0].now >= PLANE_SETTLE_MS
    && now - samples[samples.length - 1].now <= FLOOR_FRESH_MS
    && Math.max(...ys) - Math.min(...ys) <= FLOOR_MAX_Y_RANGE
    && (p.anchor.width ?? 0) >= MIN_PLANE_SIZE && (p.anchor.height ?? 0) >= MIN_PLANE_SIZE;
}
const finitePoint = (point: Vector3) => point.length === 3 && point.every(Number.isFinite);
export function initialPlacement(): PlacementModel {
  return { phase: 'scanning', mode: 'detected', detectedPlanes: {}, selectedSurface: null, lockedSurface: null,
    selectionPoint: null, lockedWorldPosition: null, poseRevision: 0, assessmentLocked:false, objectRotation: 0, verticalOffset: 0,
    dimensions: CONTAINER, tracking: 'initializing', camera: null,
    manualRequest: null, manualGeneration: 0, manualError: null };
}
function clearSelection(s: PlacementModel): PlacementModel {
  // Keep the camera, tracking state, coordinate origin and detected plane map.
  return { ...s, phase: 'scanning', selectedSurface: null, lockedSurface: null, selectionPoint: null, assessmentLocked:false,
    lockedWorldPosition: null, objectRotation: 0, verticalOffset: 0, manualRequest: null,
    manualGeneration: s.manualGeneration + 1, manualError: null };
}
function surfaceFromPlane(record: PlacementModel['detectedPlanes'][string]): Surface {
  const a = record.anchor;
  return { id: a.anchorId, source: 'detected', position: [...a.position], rotation: [...a.rotation],
    width: a.width ?? 0, depth: a.height ?? 0, vertices: a.vertices?.map(v => [...v]) };
}
export function isSurfaceAvailable(s: PlacementModel): boolean {
  return !!s.selectedSurface && (s.selectedSurface.source === 'manual' || !!s.detectedPlanes[s.selectedSurface.id]);
}
function contactAt(s: PlacementModel, point: Vector3): Vector3 {
  return enforceContactPosition(point, s.lockedSurface!.groundY, s.verticalOffset);
}
export function canConfirmSurface(s: PlacementModel): boolean {
  if (s.tracking !== 'normal' || !s.selectedSurface || !s.selectionPoint || s.lockedSurface) return false;
  if (s.selectedSurface.source === 'manual') return true;
  const candidate = s.detectedPlanes[s.selectedSurface.id];
  return !!candidate?.selectable && Math.abs(candidate.anchor.position[1] - s.selectionPoint[1]) <= FLOOR_MAX_Y_RANGE;
}
const explicitActions = new Set<PlacementAction['type']>([
  'confirm', 'place', 'drag', 'move', 'height', 'rotate', 'reset-rotation',
  'reposition', 'choose-another', 'reset', 'restart-tracking', 'mode',
]);
export function unexpectedPoseChange(before: PlacementModel, after: PlacementModel): boolean {
  return !!before.lockedWorldPosition && before.poseRevision === after.poseRevision
    && (!after.lockedWorldPosition || before.lockedWorldPosition.some((v, i) => v !== after.lockedWorldPosition![i])
      || before.objectRotation !== after.objectRotation);
}
export function placementReducer(s: PlacementModel, action: PlacementAction): PlacementModel {
  const next = reducePlacement(s, action);
  return next !== s && explicitActions.has(action.type) ? {...next, poseRevision:s.poseRevision + 1} : next;
}
// The only assignment to lockedSurface's groundY is explicit CONFIRM.
// Plane/camera updates cannot change it, even when the SAME anchor is refined.
function reducePlacement(s: PlacementModel, action: PlacementAction): PlacementModel {
  if (s.assessmentLocked && ['drag','move','height','rotate','reset-rotation','reposition','dimensions'].includes(action.type)) return s;
  switch (action.type) {
    case 'lock-placement': return s.phase==='object-placed' && s.tracking==='normal' ? {...s,assessmentLocked:true} : s;
    case 'edit-placement': return {...s,assessmentLocked:false};
    case 'tracking': return { ...s, tracking: action.quality };
    case 'plane': {
      const a = action.anchor;
      if (a.type !== 'plane' || !a.alignment?.startsWith('Horizontal') || !finitePoint(a.position)) return s;
      const previous = s.detectedPlanes[a.anchorId];
      const samples = (previous?.samples ?? []).filter(sample => action.now - sample.now <= FLOOR_WINDOW_MS);
      // Keep distinct observations, not repeated camera frames of one anchor.
      if (!samples.length || action.now > samples[samples.length - 1].now) samples.push({now:action.now, y:a.position[1]});
      const record = {anchor:a, firstSeen:previous?.firstSeen ?? action.now, samples, selectable:false};
      record.selectable = candidateReady(record, action.now);
      return { ...s, detectedPlanes: { ...s.detectedPlanes, [a.anchorId]:record } };
    }
    case 'camera': {
      if (!finitePoint(action.position)) return s;
      const planes = { ...s.detectedPlanes };
      for (const [id, p] of Object.entries(planes)) {
        // Size/stability only. The user decides whether this is floor or furniture.
        planes[id] = { ...p, selectable: candidateReady(p, action.now) };
      }
      const phase = s.phase === 'scanning' && s.mode === 'detected' && Object.values(planes).some(p => p.selectable)
        ? 'surface-selection' : s.phase;
      return { ...s, phase, camera: action.position, detectedPlanes: planes };
    }
    case 'remove-plane': {
      const planes = { ...s.detectedPlanes };
      delete planes[action.id];
      // Preserve the immutable lock and pose. Availability is derived separately.
      return { ...s, detectedPlanes: planes };
    }
    case 'select': {
      if (s.mode !== 'detected' || s.tracking !== 'normal' || s.lockedSurface) return s;
      const plane = s.detectedPlanes[action.id];
      if (!plane?.selectable || !finitePoint(action.point)) return s;
      return { ...s, phase: 'surface-selection', selectedSurface: surfaceFromPlane(plane), selectionPoint: [...action.point] };
    }
    case 'confirm':
      if (!canConfirmSurface(s) || !s.selectedSurface || !s.selectionPoint
        || s.phase !== 'surface-selection' || s.lockedSurface) return s;
      return { ...s, phase: 'surface-locked', lockedWorldPosition:[...s.selectionPoint], lockedSurface: {
        id: s.selectedSurface.id, groundY: s.selectionPoint[1], hitPosition: [...s.selectionPoint],
        initialPlaneY: s.selectedSurface.source === 'detected' ? s.detectedPlanes[s.selectedSurface.id].anchor.position[1] : null,
      } };
    case 'choose-another': return clearSelection(s);
    case 'mode': return s.lockedSurface ? s : { ...clearSelection(s), mode: action.mode };
    case 'manual-tap': {
      if (s.mode !== 'manual' || s.selectedSurface || s.lockedSurface || s.tracking !== 'normal'
        || !Number.isFinite(action.x) || !Number.isFinite(action.y) || action.x < 0 || action.y < 0) return s;
      const id = s.manualGeneration + 1;
      return { ...s, manualGeneration: id, manualError: null, manualRequest: {id, x: action.x, y: action.y} };
    }
    case 'manual-result': {
      if (s.manualRequest?.id !== action.id || s.mode !== 'manual' || s.lockedSurface || s.selectedSurface) return s;
      if (!action.point || !finitePoint(action.point) || s.tracking !== 'normal') return {
        ...s, manualRequest: null, manualError: action.error || 'No reliable hit. Move slowly over a textured surface, then tap again.',
      };
      return { ...s, manualRequest: null, manualError: null, phase: 'surface-selection', selectionPoint: [...action.point],
        selectedSurface: { id: 'manual-height', source: 'manual', position: [...action.point], rotation:[0,0,0],
          width:2, depth:2 } };
    }
    case 'place':
      if (s.phase !== 'surface-locked' || !s.lockedSurface || s.tracking !== 'normal' || !finitePoint(action.point)) return s;
      // Confirmation already copied WORLD XYZ. Placing only reveals that snapshot.
      return { ...s, phase: 'object-placed' };
    case 'drag':
      if (!s.lockedWorldPosition || !s.lockedSurface || s.tracking !== 'normal' || !finitePoint(action.point)) return s;
      return { ...s, lockedWorldPosition: contactAt(s, action.point) };
    case 'move':
      if (!s.lockedWorldPosition || !s.lockedSurface || s.tracking !== 'normal' || !Number.isFinite(action.x + action.z)) return s;
      return { ...s, lockedWorldPosition: contactAt(s, [s.lockedWorldPosition[0] + action.x, 0, s.lockedWorldPosition[2] + action.z]) };
    case 'height': {
      if (!s.lockedWorldPosition || !s.lockedSurface || s.tracking !== 'normal' || !Number.isFinite(action.delta)) return s;
      const next = { ...s, verticalOffset: s.verticalOffset + action.delta };
      return { ...next, lockedWorldPosition: contactAt(next, s.lockedWorldPosition) };
    }
    case 'rotate':
      if (!s.lockedWorldPosition || s.tracking !== 'normal' || !Number.isFinite(action.delta)) return s;
      return { ...s, objectRotation: ((s.objectRotation + action.delta) % 360 + 360) % 360 };
    case 'reset-rotation': return { ...s, objectRotation: 0 };
    case 'dimensions':
      // One standard container, including programmatic requests.
      return s;
    case 'reposition': return s.lockedSurface ? { ...s, phase: 'surface-locked' } : s;
    case 'reset': return { ...clearSelection(s), mode: 'detected' };
    case 'restart-tracking': return { ...initialPlacement(), dimensions:s.dimensions, manualGeneration:s.manualGeneration + 1 };
  }
}
