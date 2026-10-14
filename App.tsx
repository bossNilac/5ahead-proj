import { layoutSpec } from "./src/layout/layout";
import { Alert } from "./src/ui/alerts";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Switch,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import { File } from "expo-file-system";
import {
  Action,
  Copy,
  Header,
  IconButton,
  Page,
  Sheet,
} from "./src/ui/components";
import { ContainerArt } from "./src/ui/ContainerArt";
import { Icon } from "./src/ui/Icon";
import { colors, palettes, type Palette } from "./src/ui/theme";
import { translator } from "./src/ui/i18n";
import { useProjectStore } from "./src/projects/useProjectStore";
import {
  createProject,
  type Profile,
  type Project,
} from "./src/projects/model";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ReportScreen from "./src/screens/ReportScreen";
import ARWorkflow from "./src/screens/ARWorkflow";

type Route = "home" | "onboarding" | "history" | "report" | "ar";
type Dialog =
  | "new"
  | "profile"
  | "privacy"
  | "theme"
  | "language"
  | "version"
  | "about"
  | "contact"
  | null;
export default function App() {
  return (
    <SafeAreaProvider>
      <PLCR />
    </SafeAreaProvider>
  );
}
function PLCR() {
  const insets = useSafeAreaInsets();
  const store = useProjectStore();
  const { data } = store;
  const [route, setRoute] = useState<Route>("home");
  const [menu, setMenu] = useState<"settings" | "account" | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [selectedId, setSelectedId] = useState("");
  const [busy, setBusy] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: "",
    location: "",
    notes: "",
    dual: false,
  });
  const [profileForm, setProfileForm] = useState<Profile>(data.profile);
  const palette = palettes[data.preferences.theme];
  const t = translator(data.preferences.language);
  const selected = data.projects.find((p) => p.id === selectedId);
  useEffect(() => {
    if (!store.loading && !store.error && !data.preferences.onboarded)
      setRoute("onboarding");
  }, [store.loading, store.error]);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (route === "ar") return false;
      if (dialog) {
        setDialog(null);
        return true;
      }
      if (menu) {
        setMenu(null);
        return true;
      }
      if (route !== "home") {
        setRoute("home");
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [route, dialog, menu]);
  async function perform(operation: () => Promise<void>, after?: () => void) {
    setBusy(true);
    try {
      await operation();
      after?.();
    } catch (e) {
      Alert.alert("Could not save changes", String(e));
    } finally {
      setBusy(false);
    }
  }
  function home() {
    setRoute("home");
    setMenu(null);
  }
  function newProject() {
    setProjectForm({ name: "", location: "", notes: "", dual: false });
    setMenu(null);
    setDialog("new");
  }
  function openDialog(next: Dialog) {
    if (next === "profile") setProfileForm(data.profile);
    setMenu(null);
    setDialog(next);
  }
  async function finishTutorial() {
    await perform(
      () =>
        store.update((previous) => ({
          ...previous,
          preferences: { ...previous.preferences, onboarded: true },
        })),
      home,
    );
  }
  async function cameraAccess() {
    try {
      if (Platform.OS !== "web") {
        const { requestRequiredPermissions } =
          await import("@reactvision/react-viro");
        const result = await requestRequiredPermissions(["camera"]);
        if (!result.camera) {
          Alert.alert(
            "Camera access needed",
            "Enable camera access in your device settings to use AR.",
            [
              { text: "Later", onPress: () => void finishTutorial() },
              {
                text: t("Open settings"),
                onPress: () => void Linking.openSettings(),
              },
            ],
          );
          return;
        }
      }
      await finishTutorial();
    } catch (e) {
      Alert.alert(
        "Camera unavailable",
        `${String(e)}. Install a PLCR development build using run.sh --build.`,
        [{ text: "Continue", onPress: () => void finishTutorial() }],
      );
    }
  }
  function startProject() {
    const project = createProject(
      projectForm.name,
      projectForm.location,
      projectForm.notes,
      Date.now(),
      projectForm.dual ? "dual" : "single",
    );
    void perform(
      () =>
        store.update((previous) => ({
          ...previous,
          projects: [project, ...previous.projects],
        })),
      () => {
        setSelectedId(project.id);
        setDialog(null);
        setRoute("ar");
      },
    );
  }
  async function savePhoto(uri: string) {
    await store.update((previous) => ({
      ...previous,
      projects: previous.projects.map((p) =>
        p.id === selectedId ? { ...p, photoUri: uri } : p,
      ),
    }));
  }
  async function saveAssessment(project: Project) {
    await store.update((previous) => ({
      ...previous,
      projects: previous.projects.map((p) =>
        p.id === project.id ? project : p,
      ),
    }));
    setSelectedId(project.id);
    setRoute("report");
  }
  function openProject(project: Project) {
    setSelectedId(project.id);
    if (project.status === "completed") setRoute("report");
    else
      Alert.alert(
        "Continue draft",
        `Start a fresh AR scan for “${project.name}”. AR coordinates belong to a single camera session.`,
        [
          { text: t("Cancel"), style: "cancel" },
          { text: t("Start assessment"), onPress: () => setRoute("ar") },
        ],
      );
  }
  function deleteProject(project: Project) {
    Alert.alert(
      t("Delete project"),
      `Delete “${project.name}” and its saved measurements?`,
      [
        { text: t("Cancel"), style: "cancel" },
        {
          text: t("Delete project"),
          style: "destructive",
          onPress: () =>
            void perform(
              () =>
                store.update((previous) => ({
                  ...previous,
                  projects: previous.projects.filter(
                    (p) => p.id !== project.id,
                  ),
                })),
              () => {
                if (Platform.OS !== "web" && project.photoUri) {
                  try {
                    const file = new File(project.photoUri);
                    if (file.exists) file.delete();
                  } catch (e) {
                    console.warn("Could not clean up project photo", e);
                  }
                }
              },
            ),
        },
      ],
    );
  }
  function setPreference(
    key: "theme" | "language",
    value: "day" | "night" | "en" | "nl",
  ) {
    void perform(() =>
      store.update((previous) => ({
        ...previous,
        preferences: { ...previous.preferences, [key]: value },
      })),
    );
  }
  if (store.loading || store.error)
    return (
      <Page palette={palette}>
        <View style={s.loading}>
          {store.loading ? (
            <ActivityIndicator color={colors.orange} />
          ) : (
            <>
              <Text style={{ color: palette.text, fontSize: 18 }}>
                {store.error}
              </Text>
              <Action label={t("Retry")} onPress={() => void store.retry()} />
            </>
          )}
        </View>
      </Page>
    );
  if (route === "ar" && selected)
    return (
      <>
        <StatusBar style="light" />
        <ARWorkflow
          project={selected}
          onExit={home}
          onSave={saveAssessment}
          onPhoto={savePhoto}
          t={t}
        />
      </>
    );
  const menuItems =
    menu === "settings"
      ? [
          "Day / night theme",
          "Language settings",
          "App version",
          "About us",
          "Contact us",
        ]
      : ["Edit profile", "Privacy policy"];
  const menuDialogs: Record<string, Dialog> = {
    "Day / night theme": "theme",
    "Language settings": "language",
    "App version": "version",
    "About us": "about",
    "Contact us": "contact",
    "Edit profile": "profile",
    "Privacy policy": "privacy",
  };
  return (
    <Page
      palette={
        route === "report" ? { ...palette, background: "#FFFFFF" } : palette
      }
    >
      <StatusBar
        style={
          route === "report" || data.preferences.theme === "day"
            ? "dark"
            : "light"
        }
      />
      {route === "onboarding" ? (
        <OnboardingScreen
          onFinish={() => void finishTutorial()}
          onCamera={cameraAccess}
          palette={palette}
          t={t}
        />
      ) : route === "history" ? (
        <HistoryScreen
          projects={data.projects}
          profile={data.profile}
          onBack={home}
          onNew={newProject}
          onOpen={openProject}
          onFavorite={(p) =>
            void perform(() =>
              store.update((previous) => ({
                ...previous,
                projects: previous.projects.map((item) =>
                  item.id === p.id
                    ? { ...item, favorite: !item.favorite }
                    : item,
                ),
              })),
            )
          }
          onDelete={deleteProject}
          palette={palette}
          t={t}
        />
      ) : route === "report" && selected ? (
        <ReportScreen
          project={selected}
          profile={data.profile}
          onBack={() => setRoute("history")}
          onConfirm={home}
          t={t}
        />
      ) : (
        <>
          <Header
            title={
              menu ? t(menu === "settings" ? "Settings" : "Account") : "PLCR"
            }
            left={menu ? "back" : "settings"}
            onLeft={() => setMenu(menu ? null : "settings")}
            right="user"
            onRight={() => setMenu(menu === "account" ? null : "account")}
          />
          <ScrollView contentContainerStyle={s.home}>
            <View style={s.hero}>
              <View style={{ height: 230, width: "100%" }}>
                <ContainerArt />
              </View>
              <View style={s.heroCaption}>
                <Text style={[s.eyebrow, { color: palette.muted }]}>
                  CONTAINER GROUND ASSESSMENT
                </Text>
                <Text style={[s.homeTitle, { color: palette.text }]}>
                  Every good project starts{"\n"}on solid ground.
                </Text>
              </View>
            </View>
            <View style={s.homeActions}>
              <Action
                label={t("New project")}
                icon="plus"
                onPress={newProject}
              />
              <Action
                label={t("History")}
                icon="history"
                onPress={() => setRoute("history")}
              />
              <Pressable
                onPress={() => setRoute("onboarding")}
                accessibilityRole="button"
                style={s.tutorial}
              >
                <Text style={{ color: palette.muted, fontSize: 12 }}>
                  New here? {t("Replay tutorial")}{" "}
                  <Text style={{ color: colors.orange }}>→</Text>
                </Text>
              </Pressable>
            </View>
          </ScrollView>
          {menu && (
            <>
              <Pressable
                accessibilityLabel="Close menu"
                onPress={() => setMenu(null)}
                style={[
                  StyleSheet.absoluteFill,
                  { top: insets.top + 64, backgroundColor: "#00000020" },
                ]}
              />
              <View style={[s.menu, { top: insets.top + 56 }]}>
                {menuItems.map((label) => (
                  <Pressable
                    key={label}
                    onPress={() => openDialog(menuDialogs[label])}
                    accessibilityRole="button"
                    style={s.menuItem}
                  >
                    <Text style={s.menuLabel}>{t(label)}</Text>
                    <Icon name="next" size={16} color={colors.ink} />
                  </Pressable>
                ))}
              </View>
            </>
          )}
        </>
      )}
      <Sheet
        visible={dialog !== null}
        title={t(
          (
            {
              new: "New project",
              profile: "Edit profile",
              privacy: "Privacy policy",
              theme: "Day / night theme",
              language: "Language settings",
              version: "App version",
              about: "About us",
              contact: "Contact us",
            } as const
          )[dialog ?? "new"],
        )}
        onClose={() => {
          if (!busy) setDialog(null);
        }}
        palette={palette}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ gap: 16 }}
        >
          {dialog === "new" && (
            <>
              <Copy palette={palette}>
                Give your assessment a name. Your draft is saved before opening
                the camera.
              </Copy>
              <Field
                label={t("Project name")}
                value={projectForm.name}
                onChange={(name) => setProjectForm((p) => ({ ...p, name }))}
                palette={palette}
                placeholder="Construction A"
              />
              <View style={[s.dimension, { backgroundColor: palette.surface }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: palette.text, fontWeight: "600" }}>
                    {t("Two containers side by side")}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12 }}>
                    {projectForm.dual
                      ? "6 × 6 m · 9 support points"
                      : "6 × 3 m · 6 support points"}
                  </Text>
                </View>
                <Switch
                  accessibilityLabel={t("Two containers side by side")}
                  value={projectForm.dual}
                  onValueChange={(dual) =>
                    setProjectForm((p) => ({ ...p, dual }))
                  }
                  trackColor={{ false: palette.line, true: colors.blue }}
                  thumbColor={colors.white}
                />
              </View>
              <Field
                label={t("Location")}
                value={projectForm.location}
                onChange={(location) =>
                  setProjectForm((p) => ({ ...p, location }))
                }
                palette={palette}
                placeholder="Site address or description"
              />
              <Field
                label={t("Notes")}
                value={projectForm.notes}
                onChange={(notes) => setProjectForm((p) => ({ ...p, notes }))}
                palette={palette}
                multiline
              />
              <View style={[s.dimension, { backgroundColor: palette.surface }]}>
                <Icon name="info" color={colors.orange} />
                <Text style={{ color: palette.text, fontSize: 13, flex: 1 }}>
                  {t(layoutSpec(projectForm.dual ? "dual" : "single").label)} ·{" "}
                  {layoutSpec(projectForm.dual ? "dual" : "single").sizeLabel}
                  {"\n"}
                  {
                    layoutSpec(projectForm.dual ? "dual" : "single").pointCount
                  }{" "}
                  support points · local AR measurement
                </Text>
              </View>
              <Action
                label={t("Start assessment")}
                icon="next"
                busy={busy}
                disabled={!projectForm.name.trim()}
                onPress={startProject}
              />
            </>
          )}
          {dialog === "profile" && (
            <>
              <Copy palette={palette}>
                Your profile is stored on this device and included in exported
                reports.
              </Copy>
              <Field
                label={t("Name")}
                value={profileForm.name}
                onChange={(name) => setProfileForm((p) => ({ ...p, name }))}
                palette={palette}
              />
              <Field
                label="Email"
                value={profileForm.email}
                onChange={(email) => setProfileForm((p) => ({ ...p, email }))}
                palette={palette}
                email
              />
              <Field
                label={t("Company")}
                value={profileForm.company}
                onChange={(company) =>
                  setProfileForm((p) => ({ ...p, company }))
                }
                palette={palette}
              />
              <Action
                label={t("Save changes")}
                busy={busy}
                onPress={() => {
                  if (
                    profileForm.email &&
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)
                  ) {
                    Alert.alert(
                      "Invalid email",
                      "Enter a valid email address or leave the field empty.",
                    );
                    return;
                  }
                  void perform(
                    () =>
                      store.update((previous) => ({
                        ...previous,
                        profile: {
                          name: profileForm.name.trim(),
                          email: profileForm.email.trim(),
                          company: profileForm.company.trim(),
                        },
                      })),
                    () => setDialog(null),
                  );
                }}
              />
            </>
          )}
          {dialog === "theme" && (
            <>
              {(["night", "day"] as const).map((theme) => (
                <Action
                  key={theme}
                  label={`${t(theme === "night" ? "Night" : "Day")}${data.preferences.theme === theme ? " ✓" : ""}`}
                  icon={theme === "night" ? "moon" : "sun"}
                  variant={data.preferences.theme === theme ? "blue" : "quiet"}
                  busy={busy}
                  onPress={() => setPreference("theme", theme)}
                />
              ))}
            </>
          )}
          {dialog === "language" && (
            <>
              <Copy palette={palette}>
                Choose the language for navigation and workflow controls.
                Technical measurement guidance and exported reports are in
                English.
              </Copy>
              {(["en", "nl"] as const).map((language) => (
                <Action
                  key={language}
                  label={`${language === "en" ? "English" : "Nederlands"}${data.preferences.language === language ? " ✓" : ""}`}
                  variant={
                    data.preferences.language === language ? "blue" : "quiet"
                  }
                  busy={busy}
                  onPress={() => setPreference("language", language)}
                />
              ))}
            </>
          )}
          {dialog === "version" && (
            <>
              <Text style={[s.dialogTitle, { color: palette.text }]}>
                PLCR {Constants.expoConfig?.version ?? "1.0.0"}
              </Text>
              <Copy palette={palette}>
                Expo SDK 57 · Viro ARKit{"\n"}Development build · local project
                storage v1
              </Copy>
            </>
          )}
          {dialog === "about" && (
            <>
              <View style={{ height: 180 }}>
                <ContainerArt />
              </View>
              <Text style={[s.dialogTitle, { color: palette.text }]}>
                Plan. Place. Measure.
              </Text>
              <Copy palette={palette}>
                PLCR helps you position one container (6 × 3 m, six points) or
                two side by side (6 × 6 m, nine points) and compare ground
                heights. Camera and motion tracking guide you through each
                measurement.
              </Copy>
              <Copy palette={palette}>
                This testing version reports relative AR estimates. A qualified
                professional must assess ground preparation and installation
                suitability.
              </Copy>
              <Action
                label={t("Replay tutorial")}
                onPress={() => {
                  setDialog(null);
                  setRoute("onboarding");
                }}
              />
            </>
          )}
          {dialog === "privacy" && (
            <>
              <Text style={[s.dialogTitle, { color: palette.text }]}>
                Your projects stay on your device.
              </Text>
              <Copy palette={palette}>
                PLCR processes camera and motion readings in the native AR
                session. It does not upload your camera feed or projects to a
                backend. Project names, site descriptions, notes, captures,
                photos and your profile are saved locally.
              </Copy>
              <Copy palette={palette}>
                Export & share creates a report and opens your device’s share
                sheet. The destination you select receives that report. Your
                operating system may include app data in device backups.
              </Copy>
              <Copy palette={palette}>
                Delete a project from History to remove its saved record.
                Uninstalling the app removes local app data. Profile details are
                optional and can be cleared in Edit profile.
              </Copy>
            </>
          )}
          {dialog === "contact" && (
            <>
              <Copy palette={palette}>
                Report a problem or send feedback through the project’s GitHub
                issue tracker. Include your device, app version and the steps to
                reproduce the issue.
              </Copy>
              <Action
                label="Open issue tracker"
                icon="mail"
                onPress={() =>
                  void Linking.openURL(
                    "https://github.com/bossNilac/5ahead-proj/issues",
                  ).catch((e) => Alert.alert("Could not open link", String(e)))
                }
              />
            </>
          )}
        </KeyboardAvoidingView>
      </Sheet>
    </Page>
  );
}
function Field({
  label,
  value,
  onChange,
  palette,
  placeholder,
  multiline = false,
  email = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  palette: Palette;
  placeholder?: string;
  multiline?: boolean;
  email?: boolean;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: palette.text }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={palette.muted}
        multiline={multiline}
        maxLength={multiline ? 2000 : 160}
        autoCapitalize={email ? "none" : "sentences"}
        keyboardType={email ? "email-address" : "default"}
        autoCorrect={!email}
        style={[
          s.input,
          {
            color: palette.text,
            backgroundColor: palette.surface,
            borderColor: palette.line,
          },
          multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
const s = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", padding: 24, gap: 20 },
  home: { flexGrow: 1, padding: 24, justifyContent: "space-evenly", gap: 28 },
  hero: { height: 330, alignItems: "center" },
  heroCaption: { alignItems: "center", gap: 12, paddingTop: 6 },
  eyebrow: { fontSize: 9, letterSpacing: 1.7, fontWeight: "600" },
  homeTitle: {
    fontSize: 22,
    lineHeight: 30,
    textAlign: "center",
    fontWeight: "600",
  },
  homeActions: {
    gap: 12,
    width: "100%",
    maxWidth: 310,
    alignSelf: "center",
    paddingTop: 50,
  },
  tutorial: { paddingVertical: 12, alignItems: "center" },
  menu: {
    position: "absolute",
    top: 56,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: colors.orange,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 8,
    boxShadow: "0 8px 16px #00000022",
  },
  menuItem: {
    minHeight: 47,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderColor: "#7A4A0055",
  },
  menuLabel: { fontSize: 14, color: colors.ink, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 50,
    fontSize: 15,
  },
  dimension: {
    flexDirection: "row",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  dialogTitle: { fontSize: 22, fontWeight: "700", lineHeight: 30 },
});
