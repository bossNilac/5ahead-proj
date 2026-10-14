import { useEffect, useRef } from "react";
import {
  ViroARPlaneSelector,
  ViroARScene,
  ViroMaterials,
  ViroNode,
  ViroPolygon,
  ViroQuad,
  ViroTrackingStateConstants,
} from "@reactvision/react-viro";
import type { PlacementProps } from "./types";
import type { ViroARHitTestResult } from "@reactvision/react-viro";
import FrozenPlacement from "./FrozenPlacement";

ViroMaterials.createMaterials({
  container: {
    diffuseColor: "rgba(255, 150, 30, 0.5)",
    lightingModel: "Constant",
    blendMode: "Alpha",
  },
  selected: {
    diffuseColor: "rgba(100, 210, 170, 0.3)",
    lightingModel: "Constant",
    blendMode: "Alpha",
    cullMode: "None",
    writesToDepthBuffer: false,
  },
  edge: { diffuseColor: "#88B64A", lightingModel: "Constant" },
});
type Props = { sceneNavigator: { viroAppProps: PlacementProps } };

// The installed navigator declaration calls this a zero-argument component,
// although the native navigator injects sceneNavigator at runtime.
export default function ARPlacementScene(props?: Props) {
  if (!props?.sceneNavigator)
    throw new Error("Use ViroARSceneNavigator to render the AR scene.");
  const {
    model,
    dispatch,
    onCameraReading,
    activeSupportId,
    capturedSupportIds,
    supportHeights,
  } = props.sceneNavigator.viroAppProps;
  const selector = useRef<ViroARPlaneSelector>(null);
  const scene = useRef<ViroARScene>(null);
  const forwarded = useRef(new Set<string>());
  const lastCamera = useRef(0);
  const selected = model.selectedSurface;
  const locked = !!model.lockedSurface;
  useEffect(() => {
    console.log("AR SCENE MOUNTED");
    return () => console.log("AR SCENE UNMOUNTED");
  }, []);
  useEffect(() => {
    const request = model.manualRequest;
    if (!request || locked || !scene.current) return;
    let cancelled = false;
    async function hitOnce() {
      try {
        // RN tap points are converted to physical pixels in App. This native
        // call runs once per explicit manual tap, never during a drag.
        const results: ViroARHitTestResult[] =
          await scene.current!.performARHitTestWithPoint(
            request!.x,
            request!.y,
          );
        if (!Array.isArray(results))
          throw new Error("Unexpected AR hit-test response.");
        const hit = results.find(
          (result) =>
            result.type !== "DepthPoint" &&
            result.transform?.position?.length === 3 &&
            result.transform.position.every(Number.isFinite),
        );
        if (!cancelled)
          dispatch({
            type: "manual-result",
            id: request!.id,
            point: hit ? [...hit.transform.position] : null,
          });
      } catch (error) {
        if (!cancelled)
          dispatch({
            type: "manual-result",
            id: request!.id,
            point: null,
            error: `Manual hit failed: ${error instanceof Error ? error.message : String(error)}`,
          });
      }
    }
    void hitOnce();
    return () => {
      cancelled = true;
    };
  }, [model.manualRequest, locked, dispatch]);

  // Current selector API requires all three anchor methods. Discovery is held
  // briefly for stability and size; updated candidates can become selectable.
  useEffect(() => {
    if (!selector.current) {
      forwarded.current.clear();
      return;
    }
    for (const [id, record] of Object.entries(model.detectedPlanes)) {
      if (record.selectable) {
        if (forwarded.current.has(id))
          selector.current.handleAnchorUpdated(record.anchor);
        else {
          selector.current.handleAnchorFound(record.anchor);
          forwarded.current.add(id);
        }
      } else if (forwarded.current.delete(id))
        selector.current.handleAnchorRemoved(record.anchor);
    }
    for (const id of forwarded.current) {
      if (!model.detectedPlanes[id]) {
        selector.current.handleAnchorRemoved({ anchorId: id } as Parameters<
          ViroARPlaneSelector["handleAnchorRemoved"]
        >[0]);
        forwarded.current.delete(id);
      }
    }
  }, [model.detectedPlanes, locked, model.mode]);
  useEffect(() => {
    if (!selected) selector.current?.reset();
  }, [selected]);

  return (
    <ViroARScene
      ref={scene}
      anchorDetectionTypes={["PlanesHorizontal"]}
      onAnchorFound={(anchor) =>
        dispatch({ type: "plane", anchor, now: Date.now() })
      }
      onAnchorUpdated={(anchor) =>
        dispatch({ type: "plane", anchor, now: Date.now() })
      }
      onAnchorRemoved={(anchor) => {
        if (anchor) dispatch({ type: "remove-plane", id: anchor.anchorId });
      }}
      onTrackingUpdated={(quality) =>
        dispatch({
          type: "tracking",
          quality:
            quality === ViroTrackingStateConstants.TRACKING_NORMAL
              ? "normal"
              : quality === ViroTrackingStateConstants.TRACKING_LIMITED
                ? "limited"
                : "initializing",
        })
      }
      onCameraTransformUpdate={({ cameraTransform }) => {
        const now = Date.now();
        if (now - lastCamera.current < 200) return;
        lastCamera.current = now;
        onCameraReading?.({
          timestamp: now,
          positionAR: [...cameraTransform.position],
          forward: [...cameraTransform.forward],
          up: [...cameraTransform.up],
          rotation: [...cameraTransform.rotation],
        });
        dispatch({
          type: "camera",
          position: [...cameraTransform.position],
          now,
        });
      }}
    >
      {model.mode === "detected" && !locked && (
        <ViroARPlaneSelector
          ref={selector}
          alignment="Horizontal"
          useActualShape
          hideOverlayOnSelection
          disableClickSelection={!!selected || model.tracking !== "normal"}
          onPlaneSelected={(anchor, point) => {
            if (point)
              dispatch({
                type: "select",
                id: anchor.anchorId,
                point: [...point],
              });
          }}
        />
      )}
      {selected && !locked && (
        <ViroNode
          position={[
            selected.position[0],
            model.lockedSurface?.groundY ?? selected.position[1],
            selected.position[2],
          ]}
          rotation={[0, selected.rotation[1], 0]}
        >
          {selected.vertices && selected.vertices.length >= 3 ? (
            <ViroPolygon
              vertices={selected.vertices.map(([x, , z]) => [x, -z])}
              holes={[]}
              rotation={[-90, 0, 0]}
              materials={["selected"]}
            />
          ) : (
            <ViroQuad
              width={selected.width}
              height={selected.depth}
              rotation={[-90, 0, 0]}
              materials={["selected"]}
            />
          )}
        </ViroNode>
      )}
      {model.phase === "object-placed" &&
        model.lockedWorldPosition &&
        model.lockedSurface && (
          <FrozenPlacement
            position={model.lockedWorldPosition}
            groundY={model.lockedSurface.groundY}
            dimensions={model.dimensions}
            layout={model.layout}
            rotation={model.objectRotation}
            offset={model.verticalOffset}
            tracking={model.tracking}
            dispatch={dispatch}
            locked={model.assessmentLocked}
            activeSupportId={activeSupportId}
            capturedSupportIds={capturedSupportIds}
            supportHeights={supportHeights}
          />
        )}
    </ViroARScene>
  );
}
