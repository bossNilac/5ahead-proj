import { View, Text } from "react-native";
import { Action } from "../ui/components";
import { colors } from "../ui/theme";
import type { Project } from "../projects/model";
export default function ARWorkflow({
  onExit,
}: {
  project: Project;
  onExit: () => void;
  onSave: (p: Project) => Promise<void>;
  onPhoto: (uri: string) => Promise<void>;
  t: (s: string) => string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.charcoal,
        padding: 28,
        gap: 20,
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "700" }}>
        Continue on your iPhone
      </Text>
      <Text style={{ color: "#CDD4D9", lineHeight: 23 }}>
        AR placement requires an ARKit-capable physical iPhone and the PLCR
        development build. Start Metro with run.sh, then scan its QR code. Your
        project draft is saved in this browser; create a project on the phone to
        measure.
      </Text>
      <Action label="Back to home" onPress={onExit} />
    </View>
  );
}
