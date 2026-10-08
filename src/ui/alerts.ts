import { Alert as NativeAlert, Platform, type AlertButton } from "react-native";
// React Native Web's Alert has no implementation. Use browser dialogs there.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (Platform.OS !== "web") {
      NativeAlert.alert(title, message, buttons);
      return;
    }
    const body = message ? `${title}\n\n${message}` : title;
    if (buttons && buttons.length > 1) {
      const accepted = globalThis.confirm(body);
      const action = accepted
        ? buttons.find((b) => b.style !== "cancel")
        : buttons.find((b) => b.style === "cancel");
      action?.onPress?.();
    } else {
      globalThis.alert(body);
      buttons?.[0]?.onPress?.();
    }
  },
};
