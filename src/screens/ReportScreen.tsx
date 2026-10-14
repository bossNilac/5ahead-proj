import { layoutSpec } from "../layout/layout";
import { Alert } from "../ui/alerts";
import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { Action, Header } from "../ui/components";
import { colors } from "../ui/theme";
import { SupportDiagram } from "../ui/ContainerArt";
import { summary, type Project, type Profile } from "../projects/model";
import { exportReport } from "../projects/exportReport";
export default function ReportScreen({
  project,
  profile,
  onBack,
  onConfirm,
  t,
}: {
  project: Project;
  profile: Profile;
  onBack: () => void;
  onConfirm: () => void;
  t: (s: string) => string;
}) {
  const [busy, setBusy] = useState(false);
  const stats = summary(project.measurements);
  async function share() {
    setBusy(true);
    try {
      await exportReport(project, profile);
    } catch (e) {
      Alert.alert("Export failed", String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.white }}>
      <Header title={t("Results")} onLeft={onBack} />
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.success}>
          <View style={s.badge}>
            <Text style={s.badgeText}>{t("Completed").toUpperCase()}</Text>
          </View>
          <Text style={s.title}>{t("Measurement complete")}</Text>
          <Text style={s.subtitle}>
            {project.name} · {new Date(project.updatedAt).toLocaleDateString()}
          </Text>
          {!!project.location && (
            <Text style={s.subtitle}>{project.location}</Text>
          )}
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("Container position")}</Text>
          <Text style={s.note}>
            {t(layoutSpec(project.layout).label)} ·{" "}
            {layoutSpec(project.layout).pointCount} support points
          </Text>
          <SupportDiagram
            values={project.measurements}
            layout={project.layout}
          />
          <Text style={s.note}>
            Colors show relative height: green ≤2 cm, orange ≤5 cm, red &gt;5
            cm. They do not indicate site suitability.
          </Text>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("Height measurement")}</Text>
          <View style={s.grid}>
            {project.measurements.map((r) => (
              <View key={r.id} style={s.cell}>
                <Text style={s.cellLabel}>Support point {r.id}</Text>
                <Text
                  style={[
                    s.value,
                    {
                      color:
                        Math.abs(r.relativeHeightCm) > 5
                          ? colors.red
                          : Math.abs(r.relativeHeightCm) > 2
                            ? "#A96C00"
                            : "#4C7D26",
                    },
                  ]}
                >
                  {r.relativeHeightCm > 0 ? "+" : ""}
                  {r.relativeHeightCm.toFixed(1)} cm
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("Summary")}</Text>
          <View style={s.grid}>
            {[
              [t("Maximum height"), stats.max],
              [t("Minimum height"), stats.min],
              [t("Height difference"), stats.range],
            ].map(([label, v]) => (
              <View key={String(label)} style={s.cell}>
                <Text style={s.cellLabel}>{label}</Text>
                <Text style={[s.value, { color: colors.blue }]}>
                  {Number(v).toFixed(1)} cm
                </Text>
              </View>
            ))}
          </View>
        </View>
        {!!project.photoUri && (
          <Image
            source={{ uri: project.photoUri }}
            style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 16 }}
            accessibilityLabel="Captured AR placement"
          />
        )}
        {!!project.notes && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>{t("Notes")}</Text>
            <Text style={s.note}>{project.notes}</Text>
          </View>
        )}
        <Text style={s.note}>
          Point 1 is the height reference. Local AR estimates are not surveyed
          elevations. Camera X/Z approximate contact location. Capture quality
          does not certify accuracy or safe container installation.
        </Text>
      </ScrollView>
      <View style={s.footer}>
        <View style={{ flex: 1 }}>
          <Action label={t("Confirm")} variant="quiet" onPress={onConfirm} />
        </View>
        <View style={{ flex: 1.4 }}>
          <Action
            label={t("Export & share")}
            icon="share"
            onPress={() => void share()}
            busy={busy}
          />
        </View>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  content: { padding: 16, gap: 18 },
  success: {
    backgroundColor: "#D3F5C6",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
    gap: 6,
  },
  badge: {
    backgroundColor: "#609A3B",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 16,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: { fontSize: 21, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 13, color: "#374932", textAlign: "center" },
  section: {
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#D8DEE3",
    gap: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.ink },
  note: { fontSize: 12, lineHeight: 19, color: "#57636C" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cell: {
    width: "48%",
    backgroundColor: "#E9EDF0",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  cellLabel: { fontSize: 12, color: "#59666F", textAlign: "center" },
  value: { fontSize: 21, fontWeight: "700" },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderColor: "#E0E5E8",
  },
});
