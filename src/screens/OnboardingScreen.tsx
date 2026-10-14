import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Action, Copy, IconButton } from "../ui/components";
import { ContainerArt, SupportDiagram } from "../ui/ContainerArt";
import { Icon } from "../ui/Icon";
import { colors, type Palette } from "../ui/theme";
export default function OnboardingScreen({
  onFinish,
  onCamera,
  palette,
  t,
}: {
  onFinish: () => void;
  onCamera: () => Promise<void>;
  palette: Palette;
  t: (s: string) => string;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [learn, setLearn] = useState(false);
  const titles = [
    "A better place to start",
    "Position container with AR",
    "Measure support points",
    "Ready to be shared",
    "Camera access needed",
  ];
  const descriptions = [
    "Plan your container placement with a guided ground assessment.",
    "Scan a stable ground surface, then move and rotate your single or dual container layout into position.",
    "Visit all six or nine numbered points for your selected layout. Rest the phone’s bottom edge on the ground and hold it upright and still.",
    "Review relative heights, save your project and share a PDF report.",
    "PLCR uses your camera and motion tracking to place a container in your surroundings. Camera access is requested only when you continue.",
  ];
  async function camera() {
    setBusy(true);
    try {
      await onCamera();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <View style={s.header}>
        <View style={s.brand}>
          <Text style={s.brandText}>PLCR</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onFinish} style={s.skip}>
          <Text style={{ color: palette.text, fontWeight: "600" }}>
            {t("Skip")}
          </Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.art}>
          {step === 0 ? (
            <ContainerArt />
          ) : step === 1 ? (
            <View style={s.pin}>
              <Icon name="pin" size={116} color={colors.red} />
            </View>
          ) : step === 2 ? (
            <SupportDiagram dark={palette.text === "#FFFFFF"} />
          ) : step === 3 ? (
            <View style={s.check}>
              <Icon name="check" size={80} />
            </View>
          ) : (
            <Icon name="camera" size={112} color={palette.text} />
          )}
        </View>
        <Text style={[s.title, { color: palette.text }]}>
          {t(titles[step])}
        </Text>
        <Copy palette={palette}>{descriptions[step]}</Copy>
        {step === 0 && (
          <View style={s.features}>
            {[
              "5-minute process",
              "No engineering skills needed",
              "Step-by-step guidance",
            ].map((label) => (
              <View key={label} style={s.feature}>
                <View style={s.dot}>
                  <Icon name="check" size={13} />
                </View>
                <Text style={{ color: palette.text, fontSize: 14 }}>
                  {t(label)}
                </Text>
              </View>
            ))}
          </View>
        )}
        {learn && (
          <Copy palette={palette}>
            Camera frames are processed by ARKit on your device. Projects are
            saved locally. No camera feed is uploaded. You choose when to export
            a report. The app estimates relative heights and cannot detect
            physical ground contact.
          </Copy>
        )}
      </ScrollView>
      <View style={s.footer}>
        <View style={s.dots}>
          {titles.map((_, i) => (
            <View
              key={i}
              style={[
                s.pageDot,
                { backgroundColor: i === step ? colors.orange : palette.line },
              ]}
            />
          ))}
        </View>
        <Action
          label={t(step === 4 ? "Allow camera & get started" : "Next")}
          onPress={() => (step === 4 ? void camera() : setStep(step + 1))}
          busy={busy}
        />
        {step === 4 ? (
          <Pressable
            onPress={() => setLearn((v) => !v)}
            accessibilityRole="button"
            style={s.learn}
          >
            <Text style={{ color: palette.muted, textAlign: "center" }}>
              Learn more
            </Text>
          </Pressable>
        ) : step > 0 ? (
          <View style={{ alignItems: "center" }}>
            <IconButton
              label={t("Back")}
              icon="back"
              color={palette.muted}
              onPress={() => setStep(step - 1)}
            />
          </View>
        ) : null}
      </View>
    </>
  );
}
const s = StyleSheet.create({
  header: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    backgroundColor: colors.orange,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 18,
  },
  brandText: {
    fontWeight: "800",
    fontSize: 19,
    letterSpacing: 2,
    color: colors.ink,
  },
  skip: { padding: 14 },
  content: {
    paddingHorizontal: 28,
    paddingBottom: 20,
    flexGrow: 1,
    justifyContent: "center",
    gap: 16,
  },
  art: { height: 230, alignItems: "center", justifyContent: "center" },
  pin: { alignItems: "center" },
  check: {
    height: 132,
    width: 132,
    borderRadius: 66,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: "700",
    textAlign: "center",
  },
  features: { gap: 20, paddingTop: 8 },
  feature: { flexDirection: "row", gap: 12, alignItems: "center" },
  dot: {
    backgroundColor: colors.green,
    width: 21,
    height: 21,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: { paddingHorizontal: 32, paddingBottom: 16, gap: 18 },
  dots: { flexDirection: "row", gap: 8, justifyContent: "center" },
  pageDot: { height: 6, width: 6, borderRadius: 3 },
  learn: { padding: 8 },
});
