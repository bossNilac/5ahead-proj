// Flat seven-segment numbers avoid native text/billboard calculations when the
// camera is only centimetres from a ground marker. Coordinates are local X/Z.
export const DIGIT_SEGMENTS:Record<number,string> = {
  1:'bc', 2:'abged', 3:'abgcd', 4:'fgbc', 5:'afgcd', 6:'afgecd',
};
export const SEGMENT_GEOMETRY:Record<string,{x:number;z:number;width:number;length:number}> = {
  a:{x:0,z:-.065,width:.07,length:.012},
  g:{x:0,z:0,width:.07,length:.012},
  d:{x:0,z:.065,width:.07,length:.012},
  f:{x:-.035,z:-.0325,width:.012,length:.065},
  b:{x:.035,z:-.0325,width:.012,length:.065},
  e:{x:-.035,z:.0325,width:.012,length:.065},
  c:{x:.035,z:.0325,width:.012,length:.065},
};
