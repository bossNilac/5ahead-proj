import { diagramGeometry, layoutSpec, type Layout } from "../layout/layout";
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { View } from "react-native";
import { colors } from "./theme";
// Original vector artwork: the reference's blue blueprint identity, without
// embedding its stock-photo watermark or the surrounding prototype phone.
export function ContainerArt() {
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 360 280"
      accessibilityLabel="Blue wireframe shipping container"
    >
      <Defs>
        <LinearGradient id="blue" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#0B2350" />
          <Stop offset="1" stopColor="#0E438A" />
        </LinearGradient>
      </Defs>
      <Path
        d="M23 79C42 31 77 53 111 44C164 5 229 28 264 52C307 76 356 131 344 189C335 241 277 263 224 239C167 210 138 265 78 252C23 240 8 201 19 157C28 123 6 112 23 79Z"
        fill="url(#blue)"
      />
      <Path
        d="m44 112 195-49 80 37-195 55Zm0 0v91l80 39v-87m195-55v92l-195 50M44 203l195-49 80 38M239 63v91"
        stroke="#69C7F0"
        strokeWidth="1.5"
        fill="#43A7DC16"
      />
      <Path
        d="m51 117 186-46 73 31-186 46Zm0 0v80l66 32v-81m193-46v83l-186 44"
        stroke="#B6EEFF"
        strokeWidth="1"
        fill="none"
      />
      {Array.from({ length: 19 }, (_, i) => {
        const x = 132 + i * 9.6;
        const y = 153 - i * 2.4;
        return (
          <Path
            key={i}
            d={`M${x} ${y}v78M${x - 8} ${y - 4}l-73-34`}
            stroke="#80D7FA"
            strokeWidth="1"
            opacity={0.72}
          />
        );
      })}
      {Array.from({ length: 7 }, (_, i) => (
        <Path
          key={i}
          d={`M${52 + i * 9} ${120 + i * 4.5}v78`}
          stroke="#80D7FA"
          strokeWidth="1"
        />
      ))}
      <Path
        d="M79 133v78m-6-52h12m-12 9h12M116 153l195-49M116 226l195-49M47 128l73 35M47 188l73 35"
        stroke="#B6EEFF"
        strokeWidth="1"
        fill="none"
        opacity={0.7}
      />
    </Svg>
  );
}
export function SupportDiagram({
  values,
  dark = false,
  layout = "single",
}: {
  values?: { id: number; relativeHeightCm: number }[];
  dark?: boolean;
  layout?: Layout;
}) {
  const ink = dark ? "#FFFFFF" : colors.ink;
  const geometry = diagramGeometry(layout);
  const positions = geometry.points;
  return (
    <View style={{ width: "100%", aspectRatio: 360 / geometry.viewHeight }}>
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 360 ${geometry.viewHeight}`}
      >
        <Path
          d={`M${geometry.left} ${geometry.top}h${geometry.width}v${geometry.height}h-${geometry.width}Z`}
          stroke={dark ? "#9AA3AB" : "#76818A"}
          strokeWidth={1.5}
          fill="none"
        />
        {layout === "dual" && (
          <Path
            d={`M${geometry.left} ${geometry.top + geometry.height / 2}h${geometry.width}`}
            stroke={dark ? "#9AA3AB" : "#76818A"}
            strokeDasharray="4 3"
          />
        )}
        <SvgText
          fontFamily="Arial"
          x={180}
          y={geometry.labelY}
          textAnchor="middle"
          fill={ink}
          fontSize={15}
          fontWeight="600"
        >
          {layoutSpec(layout).sizeLabel}
        </SvgText>
        {positions.map(({ x, y, id, labelY }) => {
          const r = values?.find((v) => v.id === id);
          const color = r
            ? Math.abs(r.relativeHeightCm) > 5
              ? colors.red
              : Math.abs(r.relativeHeightCm) > 2
                ? colors.orange
                : colors.green
            : "#8797A3";
          return <Circle key={`c${id}`} cx={x} cy={y} r={7} fill={color} />;
        })}
        {positions.map(({ x, y, id, labelY }) => {
          const r = values?.find((v) => v.id === id);
          return (
            <SvgText
              fontFamily="Arial"
              key={id}
              x={x}
              y={labelY}
              fill={ink}
              fontSize={12}
              textAnchor="middle"
            >{`P${id}${r ? ` · ${r.relativeHeightCm.toFixed(1)} cm` : ""}`}</SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
