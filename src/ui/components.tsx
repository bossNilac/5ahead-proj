import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, type Palette } from "./theme";
import { Icon, type IconName } from "./Icon";
export function Action({
  label,
  onPress,
  icon,
  variant = "blue",
  disabled = false,
  busy = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "blue" | "orange" | "green" | "quiet" | "danger";
  disabled?: boolean;
  busy?: boolean;
  compact?: boolean;
}) {
  const background = {
    blue: colors.blue,
    orange: colors.orange,
    green: colors.green,
    quiet: "#54595C",
    danger: colors.red,
  }[variant];
  const foreground = variant === "orange" ? "#171D22" : "#FFFFFF";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          backgroundColor: background,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        compact && { paddingHorizontal: 12 },
        variant === "blue" && {
          borderColor: colors.blueDark,
          borderWidth: 1.5,
        },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : icon ? (
        <Icon name={icon} color={foreground} />
      ) : null}
      <Text style={[styles.actionText, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}
export function IconButton({
  icon,
  label,
  onPress,
  color = colors.ink,
  disabled = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.iconButton,
        { opacity: disabled ? 0.35 : pressed ? 0.65 : 1 },
      ]}
    >
      <Icon name={icon} color={color} />
    </Pressable>
  );
}
export function Header({
  title,
  left = "back",
  onLeft,
  right,
  onRight,
}: {
  title: string;
  left?: IconName;
  onLeft: () => void;
  right?: IconName;
  onRight?: () => void;
}) {
  return (
    <View style={styles.header}>
      <IconButton
        icon={left}
        label={left === "settings" ? "Settings" : "Back"}
        onPress={onLeft}
      />
      <Text
        style={[
          styles.headerTitle,
          title === "PLCR" && { letterSpacing: 5, fontSize: 25 },
        ]}
      >
        {title}
      </Text>
      {right && onRight ? (
        <IconButton
          icon={right}
          label={right === "user" ? "Account" : right}
          onPress={onRight}
        />
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
}
export function Page({
  children,
  palette,
}: {
  children: ReactNode;
  palette: Palette;
}) {
  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: palette.background }]}
    >
      {children}
    </SafeAreaView>
  );
}
export function Sheet({
  title,
  visible,
  onClose,
  children,
  palette,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  palette: Palette;
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.scrim}>
        <SafeAreaView
          edges={["bottom"]}
          style={[styles.sheet, { backgroundColor: palette.background }]}
        >
          <View style={styles.sheetHead}>
            <Text style={[styles.heading, { color: palette.text, flex: 1 }]}>
              {title}
            </Text>
            <IconButton
              icon="close"
              label="Close"
              onPress={onClose}
              color={palette.text}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 28 }}
          >
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
export function Copy({
  children,
  palette,
}: {
  children: ReactNode;
  palette: Palette;
}) {
  return (
    <Text style={[styles.copy, { color: palette.muted }]}>{children}</Text>
  );
}
export const styles = StyleSheet.create({
  page: { flex: 1 },
  header: {
    backgroundColor: colors.orange,
    minHeight: 64,
    paddingHorizontal: 8,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 19,
    fontWeight: "800",
    color: colors.ink,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
  },
  action: {
    minHeight: 50,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "center",
  },
  heading: { fontSize: 22, fontWeight: "700", lineHeight: 29 },
  copy: { fontSize: 14, lineHeight: 22 },
  scrim: { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000080" },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  sheetHead: {
    paddingLeft: 22,
    paddingRight: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#77777740",
  },
});
