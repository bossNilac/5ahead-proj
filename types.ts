import type { ViroAnchor } from '@reactvision/react-viro';
import type { CameraReading } from './src/assessment/measurement';

// AR world coordinates in metres, not GPS. Y is up; X/Z are horizontal.
// Gravity aligns Y vertically without compass heading. Local offsets only;
// NOT latitude/longitude. No GPS conversion is used for this placement test.
export type Vector3 = [number, number, number];
// depth is the fixed container's length along Z.
export type Dimensions = { width: number; depth: number; height: number };
export type PlacementState = 'scanning' | 'surface-selection' | 'surface-locked' | 'object-placed';
export type TrackingQuality = 'initializing' | 'limited' | 'normal';
export type LockedSurface = {
  readonly id: string;
  readonly groundY: number;
  readonly hitPosition: Vector3;
  readonly initialPlaneY: number | null; // Diagnostic only; never drives the pose.
};
export type Surface = {
  id: string;
  source: 'detected' | 'manual';
  position: Vector3;
  rotation: Vector3;
  width: number;
  depth: number;
  vertices?: Vector3[];
};
export type PlaneRecord = {
  anchor: ViroAnchor;
  firstSeen: number;
  samples: { now: number; y: number }[];
  selectable: boolean;
};
export type PlacementModel = {
  phase: PlacementState;
  mode: 'detected' | 'manual';
  detectedPlanes: Record<string, PlaneRecord>;
  selectedSurface: Surface | null;
  lockedSurface: LockedSurface | null;
  selectionPoint: Vector3 | null;
  lockedWorldPosition: Vector3 | null; // CONTACT point: lockedGroundY + verticalOffset
  poseRevision: number; // Advances only for explicit interaction, never AR events.
  assessmentLocked: boolean;
  objectRotation: number;
  verticalOffset: number;
  dimensions: Dimensions;
  tracking: TrackingQuality;
  camera: Vector3 | null;
  manualRequest: { id: number; x: number; y: number } | null;
  manualGeneration: number;
  manualError: string | null;
};
export type PlacementAction =
  | { type: 'tracking'; quality: TrackingQuality }
  | { type: 'camera'; position: Vector3; now: number }
  | { type: 'plane'; anchor: ViroAnchor; now: number }
  | { type: 'remove-plane'; id: string }
  | { type: 'select'; id: string; point: Vector3 }
  | { type: 'confirm' }
  | { type: 'choose-another' }
  | { type: 'mode'; mode: 'detected' | 'manual' }
  | { type: 'manual-tap'; x: number; y: number }
  | { type: 'manual-result'; id: number; point: Vector3 | null; error?: string }
  | { type: 'place'; point: Vector3 }
  | { type: 'drag'; point: Vector3 }
  | { type: 'move'; x: number; z: number }
  | { type: 'height'; delta: number }
  | { type: 'rotate'; delta: number }
  | { type: 'reset-rotation' }
  | { type: 'dimensions'; dimensions: Dimensions }
  | { type: 'reposition' }
  | { type: 'reset' }
  | { type: 'restart-tracking' }
  | { type: 'lock-placement' }
  | { type: 'edit-placement' };
export type PlacementProps = {
  model: PlacementModel;
  dispatch: (action: PlacementAction) => void;
  onCameraReading?: (reading: CameraReading) => void;
  activeSupportId?: number;
  capturedSupportIds?: number[];
};
