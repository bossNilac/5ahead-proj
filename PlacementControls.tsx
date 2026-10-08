import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { PlacementProps } from "./types";
import { Action, IconButton } from "./src/ui/components";
import { colors } from "./src/ui/theme";
export default function PlacementControls({ model, dispatch }: PlacementProps) {
  const [fine, setFine] = useState(false);
  const step = fine ? 0.01 : 0.1;
  const disabled = model.assessmentLocked || model.tracking !== "normal";
  return (
    <View style={s.wrapper}>
      <View style={s.row}>
        <View style={s.circle}>
          <IconButton
            icon="rotate-left"
            label="Rotate −5 degrees"
            disabled={disabled}
            onPress={() => dispatch({ type: "rotate", delta: -5 })}
          />
        </View>
        <View style={s.circle}>
          <IconButton
            icon="up"
            label="Move Z −"
            disabled={disabled}
            onPress={() => dispatch({ type: "move", x: 0, z: -step })}
          />
        </View>
        <View style={s.circle}>
          <IconButton
            icon="rotate-right"
            label="Rotate +5 degrees"
            disabled={disabled}
            onPress={() => dispatch({ type: "rotate", delta: 5 })}
          />
        </View>
      </View>
      <View style={s.row}>
        <View style={s.circle}>
          <IconButton
            icon="left"
            label="Move X −"
            disabled={disabled}
            onPress={() => dispatch({ type: "move", x: -step, z: 0 })}
          />
        </View>
        <Text style={s.step}>{step * 100} cm</Text>
        <View style={s.circle}>
          <IconButton
            icon="right"
            label="Move X +"
            disabled={disabled}
            onPress={() => dispatch({ type: "move", x: step, z: 0 })}
          />
        </View>
      </View>
      <View style={s.row}>
        <Action
          compact
          variant="quiet"
          label={fine ? "10 cm steps" : "1 cm steps"}
          onPress={() => setFine((v) => !v)}
        />
        <View style={s.circle}>
          <IconButton
            icon="down"
            label="Move Z +"
            disabled={disabled}
            onPress={() => dispatch({ type: "move", x: 0, z: step })}
          />
        </View>
        <Action
          compact
          variant="quiet"
          label="0°"
          onPress={() => dispatch({ type: "reset-rotation" })}
          disabled={disabled}
        />
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  wrapper: { gap: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  circle: { backgroundColor: colors.orange, borderRadius: 22 },
  step: { width: 44, textAlign: "center", fontSize: 11, color: "#CBD2D9" },
});
