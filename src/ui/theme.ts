export const colors = {
  orange: "#EC8900",
  blue: "#1238B8",
  blueDark: "#0B247F",
  charcoal: "#353636",
  panel: "#424444",
  white: "#FFFFFF",
  muted: "#BFC5CA",
  green: "#88B64A",
  red: "#DC4D4D",
  line: "#555858",
  ink: "#20282E",
  paper: "#F5F6F7",
};
export const palettes = {
  night: {
    background: colors.charcoal,
    surface: colors.panel,
    text: "#FFFFFF",
    muted: "#C3C8CC",
    line: "#555858",
  },
  day: {
    background: "#F2F0EA",
    surface: "#FFFFFF",
    text: "#242D33",
    muted: "#59656E",
    line: "#D4D9DC",
  },
};
export type Palette = typeof palettes.night;
