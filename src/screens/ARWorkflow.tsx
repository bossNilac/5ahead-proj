import { Alert } from "../ui/alerts";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  AppState,
  Linking,
  PixelRatio,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  ViroARSceneNavigator,
  isARSupportedOnDevice,
  requestRequiredPermissions,
} from "@reactvision/react-viro";
import { File, Paths } from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ARViewport from "../../ARViewport";
import PlacementControls from "../../PlacementControls";
import {
  canConfirmSurface,
  initialPlacement,
  placementReducer,
  unexpectedPoseChange,
} from "../../placementState";
import type { PlacementAction } from "../../types";
import { useAssessment } from "../assessment/useAssessment";
import AssessmentPanel from "../assessment/AssessmentPanel";
import { Action, IconButton, Sheet } from "../ui/components";
import { colors, palettes } from "../ui/theme";
import { SupportDiagram } from "../ui/ContainerArt";
import { Icon } from "../ui/Icon";
import type { Project } from "../projects/model";
export type ARWorkflowProps = {
  project: Project;
  onExit: () => void;
  onSave: (p: Project) => Promise<void>;
  onPhoto: (uri: string) => Promise<void>;
  t: (s: string) => string;
};
export default function ARWorkflow({
  project,
  onExit,
  onSave,
  onPhoto,
  t,
}: ARWorkflowProps) {
  const [model, reduce] = useReducer(
    placementReducer,
    undefined,
    initialPlacement,
  );
  const assessment = useAssessment(model);
  const navigator = useRef<ViroARSceneNavigator>(null);
  const previousPose = useRef(model);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState(false);
  const [details, setDetails] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState(project.photoUri);
  const [photoBusy, setPhotoBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const dispatch = useCallback((action: PlacementAction) => reduce(action), []);
  useEffect(() => {
    if (unexpectedPoseChange(previousPose.current, model))
      console.warn("Locked pose changed without explicit interaction");
    previousPose.current = model;
  }, [model]);
  const checkDevice = useCallback(async () => {
    setError("");
    try {
      const support = await isARSupportedOnDevice();
      if (!support.isARSupported) {
        setError("Use an ARKit-capable physical iPhone.");
        return;
      }
      const permissions = await requestRequiredPermissions(["camera"]);
      if (!permissions.camera) {
        setError("Enable camera access in Settings, then retry.");
        return;
      }
      setReady(true);
    } catch (e) {
      setError(
        `Could not start AR: ${String(e)}. Install a development build with run.sh --build.`,
      );
    }
  }, []);
  useEffect(() => {
    void checkDevice();
  }, [checkDevice]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active")
        dispatch({ type: "tracking", quality: "limited" });
    });
    return () => listener.remove();
  }, [dispatch]);
  const stage =
    review && assessment.complete
      ? 4
      : model.assessmentLocked
        ? 3
        : model.lockedSurface
          ? 2
          : 1;
  const normal = model.tracking === "normal";
  function exit() {
    Alert.alert(
      "Leave assessment?",
      "Your project draft is saved. A new AR session must scan and measure again.",
      [
        { text: t("Cancel"), style: "cancel" },
        { text: "Leave", onPress: onExit },
      ],
    );
  }
  async function takePhoto() {
    if (!navigator.current || photoBusy) return;
    setPhotoBusy(true);
    try {
      const result = await navigator.current.arSceneNavigator.takeScreenshot(
        `plcr-${project.id}`,
        false,
      );
      if (!result.success || !result.url)
        throw new Error("The AR photo could not be captured.");
      const source = new File(
        result.url.startsWith("/") ? `file://${result.url}` : result.url,
      );
      const destination = new File(Paths.document, `plcr-${project.id}.jpg`);
      await source.copy(destination, { overwrite: true });
      await onPhoto(destination.uri);
      setPhoto(destination.uri);
      Alert.alert(
        "Photo captured",
        "Your AR photo will be saved with the completed assessment.",
      );
    } catch (e) {
      Alert.alert("Photo failed", String(e));
    } finally {
      setPhotoBusy(false);
    }
  }
  async function save() {
    if (!assessment.complete || !model.lockedWorldPosition) return;
    setBusy(true);
    try {
      await onSave({
        ...project,
        status: "completed",
        updatedAt: Date.now(),
        position: [...model.lockedWorldPosition],
        rotation: model.objectRotation,
        measurements: assessment.results,
        captures: assessment.captures,
        photoUri: photo,
      });
    } catch (e) {
      Alert.alert("Could not save", String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={s.screen}>
      {ready && (
        <View style={StyleSheet.absoluteFill}>
          <ARViewport
            navigatorRef={navigator}
            model={model}
            dispatch={dispatch}
            onCameraReading={assessment.onCameraReading}
            activeSupportId={
              model.assessmentLocked ? assessment.target?.id : undefined
            }
            capturedSupportIds={assessment.capturedSupportIds}
            supportHeights={review ? assessment.results : undefined}
          />
        </View>
      )}
      {ready &&
        model.mode === "manual" &&
        !model.selectedSurface &&
        !model.lockedSurface && (
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityLabel="Tap approximate ground"
            onPress={(event) =>
              dispatch({
                type: "manual-tap",
                x: event.nativeEvent.locationX * PixelRatio.get(),
                y: event.nativeEvent.locationY * PixelRatio.get(),
              })
            }
          />
        )}
      <View style={[s.steps, { paddingTop: insets.top + 8 }]}>
        {["Scan ground", "Position", "Measure", "Results"].map((label, i) => (
          <View key={label} style={s.step}>
            <View
              style={[
                s.stepCircle,
                {
                  backgroundColor:
                    stage > i + 1
                      ? colors.green
                      : stage === i + 1
                        ? colors.blue
                        : "#777D80",
                },
              ]}
            >
              {stage > i + 1 ? (
                <Icon name="check" />
              ) : (
                <Text style={s.stepNumber}>{i + 1}</Text>
              )}
            </View>
            <Text
              style={[
                s.stepLabel,
                { color: stage === i + 1 ? "#FFFFFF" : "#C0C8CE" },
              ]}
            >
              {t(label)}
            </Text>
          </View>
        ))}
      </View>
      {!ready ? (
        <View style={s.startup}>
          <Icon name="camera" size={64} color={colors.orange} />
          <Text style={s.title}>
            {error || "Checking camera and AR access…"}
          </Text>
          {!!error && (
            <>
              <Action
                label={t("Open settings")}
                onPress={() => void Linking.openSettings()}
              />
              <Action label={t("Retry")} onPress={() => void checkDevice()} />
            </>
          )}
          <Action label={t("Back")} variant="quiet" onPress={onExit} />
        </View>
      ) : (
        <>
          <View style={s.topInfo} pointerEvents="box-none">
            <View style={s.status}>
              <View
                style={[
                  s.statusDot,
                  { backgroundColor: normal ? colors.green : colors.red },
                ]}
              />
              <Text style={s.statusText}>
                {normal ? "Tracking ready" : "Move slowly · tracking limited"}
              </Text>
            </View>
            {stage === 4 && (
              <View style={s.resultBanner}>
                <Text style={s.resultTitle}>{t("Results")}</Text>
              </View>
            )}
          </View>
          <View
            style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 12) }]}
          >
            <ScrollView
              style={{
                maxHeight:
                  stage === 3
                    ? 260
                    : stage === 2
                      ? 230
                      : stage === 4
                        ? 160
                        : 185,
              }}
              contentContainerStyle={{ gap: 12 }}
              keyboardShouldPersistTaps="handled"
            >
              {stage === 1 && (
                <>
                  <Text style={s.title}>
                    {model.selectedSurface
                      ? "Confirm your ground surface"
                      : "Find a clear, stable surface"}
                  </Text>
                  <Text style={s.copy}>
                    {model.manualError ||
                      (model.selectedSurface
                        ? "Check this is the intended ground. Its height is frozen when confirmed."
                        : "Point down and move sideways over textured ground in good light. Tap a detected surface, or choose Manual and tap the ground.")}
                  </Text>
                  {!model.selectedSurface ? (
                    <View style={s.segment}>
                      {(["manual", "detected"] as const).map((mode) => (
                        <Pressable
                          key={mode}
                          onPress={() => dispatch({ type: "mode", mode })}
                          accessibilityRole="button"
                          accessibilityState={{ selected: model.mode === mode }}
                          style={[
                            s.segmentItem,
                            model.mode === mode && {
                              backgroundColor: colors.white,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color:
                                model.mode === mode ? colors.ink : "#FFFFFF",
                              fontWeight: "700",
                              fontSize: 13,
                            }}
                          >
                            {t(mode === "manual" ? "Manual" : "Auto")}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <>
                      <Action
                        label={t("Confirm surface")}
                        disabled={!canConfirmSurface(model)}
                        onPress={() => dispatch({ type: "confirm" })}
                      />
                      <Action
                        label={t("Choose another")}
                        variant="quiet"
                        onPress={() => dispatch({ type: "choose-another" })}
                      />
                    </>
                  )}
                </>
              )}
              {stage === 2 && (
                <>
                  {model.phase === "surface-locked" ? (
                    <>
                      <Text style={s.title}>Place your 6 × 3 m container</Text>
                      <Action
                        label={t("Place container")}
                        disabled={!normal}
                        onPress={() => {
                          if (model.selectionPoint)
                            dispatch({
                              type: "place",
                              point: model.selectionPoint,
                            });
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <PlacementControls model={model} dispatch={dispatch} />
                      <Action
                        label={t("Lock & measure")}
                        disabled={!normal}
                        onPress={() => dispatch({ type: "lock-placement" })}
                      />
                    </>
                  )}
                </>
              )}
              {stage === 3 && (
                <>
                  <AssessmentPanel assessment={assessment} />
                  {assessment.interrupted ? (
                    <Action
                      label={t("Restart measurements")}
                      disabled={!normal}
                      onPress={assessment.restart}
                    />
                  ) : assessment.complete ? (
                    <Action
                      label={t("Results")}
                      icon="next"
                      onPress={() => setReview(true)}
                    />
                  ) : (
                    <Action
                      label={`Confirm contact · capture P${assessment.target?.id ?? 1}`}
                      disabled={!assessment.canCapture}
                      onPress={assessment.capture}
                    />
                  )}
                </>
              )}
              {stage === 4 && (
                <>
                  <Text style={s.title}>6 support points measured</Text>
                  <Text style={s.copy}>
                    Satisfied with this placement? Save it and review your
                    report.
                  </Text>
                  <Action
                    label={t("Save & view report")}
                    variant="green"
                    icon="check"
                    busy={busy}
                    onPress={() => void save()}
                  />
                </>
              )}
            </ScrollView>
            <View style={s.toolbar}>
              <IconButton
                icon="back"
                label={t("Back")}
                color="#FFFFFF"
                onPress={() => {
                  if (stage === 4) setReview(false);
                  else if (stage === 3)
                    Alert.alert(
                      t("Edit placement"),
                      "This clears all captured measurements.",
                      [
                        { text: t("Cancel"), style: "cancel" },
                        {
                          text: t("Confirm"),
                          onPress: () => dispatch({ type: "edit-placement" }),
                        },
                      ],
                    );
                  else if (stage === 2)
                    Alert.alert(
                      t("Rescan ground"),
                      "This clears the placement.",
                      [
                        { text: t("Cancel"), style: "cancel" },
                        {
                          text: t("Confirm"),
                          onPress: () => dispatch({ type: "reset" }),
                        },
                      ],
                    );
                  else exit();
                }}
              />
              {stage === 3 || stage === 4 ? (
                <Action
                  label={t("Data details")}
                  variant="orange"
                  compact
                  icon="file"
                  onPress={() => setDetails(true)}
                />
              ) : (
                <IconButton
                  icon="camera"
                  label={t("Take photo")}
                  color={colors.orange}
                  disabled={photoBusy}
                  onPress={() => void takePhoto()}
                />
              )}
              <IconButton
                icon="close"
                label="Leave assessment"
                color="#FFFFFF"
                onPress={exit}
              />
            </View>
          </View>
        </>
      )}
      <Sheet
        title={t("Data details")}
        visible={details}
        onClose={() => setDetails(false)}
        palette={palettes.night}
      >
        <SupportDiagram values={assessment.results} dark />
        {assessment.results.map((r) => (
          <View key={r.id} style={s.detail}>
            <Text style={s.title}>
              P{r.id} · {r.relativeHeightCm.toFixed(1)} cm
            </Text>
            <Text style={s.copy}>
              Estimated contact XYZ:{" "}
              {r.estimatedPosition.map((v) => (v * 100).toFixed(1)).join(" / ")}{" "}
              cm
            </Text>
            <Text style={s.copy}>
              Planned XYZ:{" "}
              {r.plannedPosition.map((v) => (v * 100).toFixed(1)).join(" / ")}{" "}
              cm{"\n"}
              Camera XYZ:{" "}
              {r.cameraPosition.map((v) => (v * 100).toFixed(1)).join(" / ")} cm
              {"\n"}
              Spread {r.spreadCm.toFixed(1)} cm · tilt {r.tiltDeg.toFixed(1)}°
            </Text>
          </View>
        ))}
        <Text style={s.copy}>
          Point 1 is the reference. Local coordinates are AR estimates, not
          geographic elevations. X/Z use the camera as an approximate contact
          location.
        </Text>
        <Action
          label="Remeasure all points"
          variant="quiet"
          onPress={() => {
            assessment.restart();
            setReview(false);
            setDetails(false);
          }}
        />
        <Action
          label="Log local assessment"
          variant="quiet"
          onPress={() =>
            console.log("LOCAL ASSESSMENT", {
              dimensions: model.dimensions,
              lockedWorldPosition: model.lockedWorldPosition,
              rotation: model.objectRotation,
              points: assessment.points,
              measurements: assessment.results,
            })
          }
        />
        <Action
          label="Restart AR tracking"
          variant="quiet"
          onPress={() =>
            Alert.alert(
              "Restart tracking?",
              "This clears the placement and all measurements.",
              [
                { text: t("Cancel"), style: "cancel" },
                {
                  text: t("Confirm"),
                  onPress: () => {
                    navigator.current?.arSceneNavigator.resetARSession(
                      true,
                      true,
                    );
                    dispatch({ type: "restart-tracking" });
                    setReview(false);
                    setDetails(false);
                  },
                },
              ],
            )
          }
        />
      </Sheet>
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.charcoal },
  steps: {
    paddingBottom: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    backgroundColor: colors.charcoal,
  },
  step: { flex: 1, alignItems: "center", gap: 6 },
  stepCircle: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: { fontWeight: "700", fontSize: 20, color: "#FFFFFF" },
  stepLabel: { fontSize: 10, fontWeight: "600" },
  topInfo: { padding: 12, gap: 10 },
  status: {
    alignSelf: "flex-start",
    backgroundColor: "#292E32DD",
    borderRadius: 20,
    padding: 10,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },
  statusDot: { height: 7, width: 7, borderRadius: 4 },
  statusText: { color: "#FFFFFF", fontSize: 11 },
  resultBanner: {
    backgroundColor: colors.orange,
    borderRadius: 14,
    padding: 12,
  },
  resultTitle: {
    color: colors.ink,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "700",
  },
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#353636F5",
    paddingTop: 16,
    paddingHorizontal: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  title: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", lineHeight: 23 },
  copy: { color: "#CCD3D8", fontSize: 12, lineHeight: 19 },
  segment: {
    alignSelf: "center",
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: 20,
    padding: 3,
  },
  segmentItem: {
    minWidth: 104,
    padding: 9,
    borderRadius: 16,
    alignItems: "center",
  },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
  },
  startup: { flex: 1, padding: 24, gap: 18, justifyContent: "center" },
  detail: {
    gap: 6,
    borderBottomWidth: 1,
    borderColor: "#606060",
    paddingBottom: 12,
  },
});
