import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import { reportHtml, type Project, type Profile } from "./model";
export async function exportReport(project: Project, profile: Profile) {
  const html = reportHtml(project, profile);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("Sharing is unavailable on this device.");
  const result = await Print.printToFileAsync({ html });
  try {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: `PLCR · ${project.name}`,
    });
  } finally {
    const file = new File(result.uri);
    if (file.exists) file.delete();
  }
}
