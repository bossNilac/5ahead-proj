import Svg, { Circle, Path, Rect } from "react-native-svg";
export type IconName =
  | "star"
  | "plus"
  | "history"
  | "settings"
  | "user"
  | "back"
  | "next"
  | "check"
  | "camera"
  | "pin"
  | "share"
  | "trash"
  | "close"
  | "sun"
  | "moon"
  | "info"
  | "mail"
  | "download"
  | "rotate-left"
  | "rotate-right"
  | "up"
  | "down"
  | "left"
  | "right"
  | "file";
const paths: Partial<Record<IconName, string>> = {
  star: "m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1Z",
  plus: "M12 5v14M5 12h14",
  back: "M19 12H5m6-6-6 6 6 6",
  next: "M5 12h14m-6-6 6 6-6 6",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M18 6 6 18",
  up: "m6 15 6-6 6 6",
  down: "m6 9 6 6 6-6",
  left: "m15 6-6 6 6 6",
  right: "m9 6 6 6-6 6",
  share: "M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7",
  download: "M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4",
  trash: "M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7",
  history: "M3 5v5h5M3.5 10a9 9 0 1 1 1 8M12 7v5l3 2",
  "rotate-left": "M3 4v6h6M3 10a9 9 0 1 1 2 9",
  "rotate-right": "M21 4v6h-6M21 10a9 9 0 1 0-2 9",
  pin: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z",
  camera: "M3 7h4l2-3h6l2 3h4v14H3Z",
  user: "M4 21a8 8 0 0 1 16 0M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  mail: "M3 5h18v14H3ZM3 5l9 8 9-8",
  file: "M14 2H5v20h14V7ZM14 2v6h5M8 12h8m-8 4h8",
  moon: "M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12",
  sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1",
  settings:
    "m9 3 1-1h4l1 1 .5 3 2 .9 2.7-1 2 3.4-2.2 2 .1 2.4 2.1 1.9-2 3.4-2.8-.9-2 .9L15 22h-5l-.5-3.1-2-.9-2.8.9-2-3.4 2.1-1.9.1-2.4-2.2-2 2-3.4 2.7 1 2-.9Z",
};
export function Icon({
  name,
  size = 22,
  color = "#FFFFFF",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] && <Path d={paths[name]} />}
      {name === "settings" && <Circle cx={12} cy={12} r={3} />}
      {name === "camera" && <Circle cx={12} cy={13} r={4} />}
      {name === "pin" && <Circle cx={12} cy={10} r={2.5} />}
      {name === "sun" && <Circle cx={12} cy={12} r={4} />}
      {name === "info" && (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 11v6m0-10v.1" />
        </>
      )}
    </Svg>
  );
}
