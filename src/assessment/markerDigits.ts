// Flat seven-segment numbers avoid native text/billboard calculations when the
// camera is only centimetres from a ground marker. Coordinates are local X/Z.
export const DIGIT_SEGMENTS: Record<number, string> = {
  1: "bc",
  2: "abged",
  3: "abgcd",
  4: "fgbc",
  5: "afgcd",
  6: "afgecd",
  7: "abc",
  8: "abcdefg",
  9: "abfgcd",
};
export const SEGMENT_GEOMETRY: Record<
  string,
  { x: number; z: number; width: number; length: number }
> = {
  a: { x: 0, z: -0.065, width: 0.07, length: 0.012 },
  g: { x: 0, z: 0, width: 0.07, length: 0.012 },
  d: { x: 0, z: 0.065, width: 0.07, length: 0.012 },
  f: { x: -0.035, z: -0.0325, width: 0.012, length: 0.065 },
  b: { x: 0.035, z: -0.0325, width: 0.012, length: 0.065 },
  e: { x: -0.035, z: 0.0325, width: 0.012, length: 0.065 },
  c: { x: 0.035, z: 0.0325, width: 0.012, length: 0.065 },
};
