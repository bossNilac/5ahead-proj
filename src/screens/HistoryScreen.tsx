import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Action, Header, IconButton } from "../ui/components";
import { ContainerArt } from "../ui/ContainerArt";
import { Icon } from "../ui/Icon";
import { colors, type Palette } from "../ui/theme";
import { Alert } from "../ui/alerts";
import { exportReport } from "../projects/exportReport";
import type { Profile, Project } from "../projects/model";
export default function HistoryScreen({
  projects,
  profile,
  onBack,
  onOpen,
  onNew,
  onFavorite,
  onDelete,
  palette,
  t,
}: {
  projects: Project[];
  profile: Profile;
  onBack: () => void;
  onOpen: (p: Project) => void;
  onNew: () => void;
  onFavorite: (p: Project) => void;
  onDelete: (p: Project) => void;
  palette: Palette;
  t: (s: string) => string;
}) {
  const [sharing, setSharing] = useState("");
  async function share(project: Project) {
    setSharing(project.id);
    try {
      await exportReport(project, profile);
    } catch (e) {
      Alert.alert("Export failed", String(e));
    } finally {
      setSharing("");
    }
  }
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState(false);
  const filtered = projects
    .filter(
      (p) =>
        (!favorites || p.favorite) &&
        `${p.name} ${p.location} ${p.notes}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return (
    <>
      <Header
        title={t("History")}
        onLeft={onBack}
        right="plus"
        onRight={onNew}
      />
      <View style={s.search}>
        <Icon name="history" color={palette.muted} />
        <TextInput
          placeholder={t("Search projects")}
          placeholderTextColor={palette.muted}
          value={query}
          onChangeText={setQuery}
          style={[s.searchInput, { color: palette.text }]}
          accessibilityLabel={t("Search projects")}
        />
      </View>
      <View style={s.filters}>
        {["All projects", "Favorites"].map((label, i) => (
          <Pressable
            key={label}
            onPress={() => setFavorites(i === 1)}
            accessibilityRole="button"
            accessibilityState={{ selected: favorites === (i === 1) }}
            style={[
              s.filter,
              {
                backgroundColor:
                  favorites === (i === 1) ? colors.blue : palette.surface,
              },
            ]}
          >
            <Text
              style={{
                fontWeight: "600",
                color: favorites === (i === 1) ? "#FFFFFF" : palette.text,
              }}
            >
              {t(label)}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={s.list}>
        {!filtered.length ? (
          <View style={s.empty}>
            <View style={{ height: 190, width: "100%" }}>
              <ContainerArt />
            </View>
            <Text style={[s.emptyTitle, { color: palette.text }]}>
              {t(projects.length ? "No matching projects" : "No projects yet")}
            </Text>
            <Text
              style={{
                color: palette.muted,
                textAlign: "center",
                lineHeight: 22,
              }}
            >
              Saved assessments and drafts will appear here.
            </Text>
            <Action label={t("New project")} icon="plus" onPress={onNew} />
          </View>
        ) : (
          filtered.map((p) => (
            <View key={p.id} style={s.card}>
              <View style={s.cardTop}>
                <View style={s.thumbnail}>
                  {p.photoUri ? (
                    <Image
                      source={{ uri: p.photoUri }}
                      style={{ width: "100%", height: "100%" }}
                    />
                  ) : (
                    <ContainerArt />
                  )}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={s.projectName}>{p.name}</Text>
                  <Text style={s.cardCopy} numberOfLines={2}>
                    {p.location || "Local AR assessment"}
                  </Text>
                  <Text style={s.date}>
                    {new Date(p.updatedAt).toLocaleDateString()} ·{" "}
                    {t(p.status === "completed" ? "Completed" : "Draft")}
                  </Text>
                </View>
              </View>
              <View style={s.cardBottom}>
                <View style={{ flex: 1 }}>
                  <Action
                    compact
                    label={t("Open project")}
                    variant="orange"
                    icon="file"
                    onPress={() => onOpen(p)}
                  />
                </View>
                <IconButton
                  icon="share"
                  label={`Share report: ${p.name}`}
                  color="#FFFFFF"
                  disabled={p.status !== "completed" || sharing !== ""}
                  onPress={() => void share(p)}
                />
                <IconButton
                  icon="star"
                  label={
                    p.favorite ? "Remove from favorites" : "Add to favorites"
                  }
                  color={p.favorite ? "#CAFF82" : "#D7E3FF"}
                  onPress={() => onFavorite(p)}
                />
                <IconButton
                  icon="trash"
                  label={`${t("Delete project")}: ${p.name}`}
                  color="#FFFFFF"
                  onPress={() => onDelete(p)}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </>
  );
}
const s = StyleSheet.create({
  search: {
    margin: 18,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#7B858A",
    borderRadius: 14,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, minHeight: 48, fontSize: 15 },
  filters: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  filter: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 11 },
  list: { padding: 18, paddingTop: 4, gap: 12 },
  card: {
    backgroundColor: colors.blue,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#315AD9",
  },
  cardTop: { flexDirection: "row", gap: 12, alignItems: "center" },
  thumbnail: {
    width: 74,
    height: 80,
    borderRadius: 10,
    backgroundColor: "#0B286A",
    overflow: "hidden",
  },
  projectName: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  cardCopy: { color: "#DAE5FF", fontSize: 12, lineHeight: 18 },
  date: { color: "#B7C9F6", fontSize: 11 },
  cardBottom: { flexDirection: "row", alignItems: "center", gap: 5 },
  empty: { gap: 18, alignItems: "stretch", paddingVertical: 28 },
  emptyTitle: { fontSize: 22, fontWeight: "700", textAlign: "center" },
});
