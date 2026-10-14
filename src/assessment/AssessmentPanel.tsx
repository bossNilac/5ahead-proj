import { StyleSheet, Text, View } from "react-native";
import type { useAssessment } from "./useAssessment";
import { colors } from "../ui/theme";
import { Icon } from "../ui/Icon";
export default function AssessmentPanel({
  assessment: a,
}: {
  assessment: ReturnType<typeof useAssessment>;
}) {
  const q = a.quality;
  const checks = [
    ["Tracking ready", !!q?.checks.tracking],
    ["At support point", !!q?.checks.nearby],
    ["Phone upright", !!q?.checks.upright],
    ["Hold still for 2 seconds", !!q?.checks.steady],
  ] as const;
  return (
    <View style={s.panel} accessibilityLiveRegion="polite">
      <Text style={s.title}>
        {a.complete
          ? `All ${a.points.length} points captured`
          : `Support point ${a.target?.id ?? 1} / ${a.points.length}`}
      </Text>
      {!a.complete && (
        <>
          <Text style={s.copy}>
            {a.interrupted
              ? "Tracking interrupted. Restore tracking and restart measurements."
              : (q?.reason ?? "Waiting for camera tracking…")}
          </Text>
          <View style={s.checks}>
            {checks.map(([label, ready]) => (
              <View key={label} style={s.check}>
                <Icon
                  name={ready ? "check" : "close"}
                  size={15}
                  color={ready ? colors.green : colors.red}
                />
                <Text style={s.label}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={s.track}>
            <View
              style={[
                s.progress,
                { width: `${Math.min(100, (q?.stableMs ?? 0) / 20)}%` },
              ]}
            />
          </View>
          <Text style={s.copy}>
            Rest the center of the phone’s bottom edge on the ground. Keep the
            same phone and case upright, with the camera uncovered.
          </Text>
        </>
      )}
      {a.complete && (
        <Text style={s.copy}>
          Review relative heights next. Point 1 is the reference.
        </Text>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  panel: { gap: 10 },
  title: { fontWeight: "700", fontSize: 17, color: "#FFFFFF" },
  copy: { fontSize: 12, lineHeight: 18, color: "#D4DADE" },
  checks: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  check: { flexDirection: "row", alignItems: "center", gap: 5, width: "48%" },
  label: { color: "#FFFFFF", fontSize: 11, flexShrink: 1 },
  track: {
    height: 4,
    backgroundColor: "#60666C",
    borderRadius: 2,
    overflow: "hidden",
  },
  progress: { height: 4, backgroundColor: colors.green },
});
