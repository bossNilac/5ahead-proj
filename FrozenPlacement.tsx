import { memo, useRef } from 'react';
import { ViroMaterials, ViroNode, ViroPolyline, ViroQuad } from '@reactvision/react-viro';
import { supportPoints } from './src/assessment/measurement';
import { DIGIT_SEGMENTS, SEGMENT_GEOMETRY } from './src/assessment/markerDigits';
import type { Dimensions, PlacementProps, TrackingQuality, Vector3 } from './types';
import { enforceContactPosition } from './placementGeometry';

ViroMaterials.createMaterials({
  contactMarker: {diffuseColor:'#ff00ff', lightingModel:'Constant', cullMode:'None'},
  supportPending: {diffuseColor:'#3478f6', lightingModel:'Constant', cullMode:'None'},
  supportActive: {diffuseColor:'#ffbd35', lightingModel:'Constant', cullMode:'None'},
  supportCaptured: {diffuseColor:'#1bac55', lightingModel:'Constant', cullMode:'None'},
  supportNumber: {diffuseColor:'#ffffff', lightingModel:'Constant', cullMode:'None', writesToDepthBuffer:false},
});

type Props = {
  position: Vector3;
  groundY: number;
  dimensions: Dimensions;
  rotation: number;
  offset: number;
  tracking: TrackingQuality;
  dispatch: PlacementProps['dispatch'];
  locked:boolean;
  activeSupportId?:number;
  capturedSupportIds?:number[];
};

// Both AUTO and MANUAL use this exact scene-root renderer. It receives no
// anchors, selectors, raycasts or candidate plane transforms. Camera/anchor
// events leave these props unchanged, so memo also avoids redundant rendering.
export default memo(function FrozenPlacement({position, groundY, dimensions, rotation, offset, tracking, dispatch, locked, activeSupportId, capturedSupportIds}: Props) {
  const node = useRef<ViroNode>(null);
  const {width, depth} = dimensions;
  const w = width / 2, d = depth / 2;
  function drag(incomingDragPosition: Vector3) {
    if (locked || tracking !== 'normal' || !incomingDragPosition.every(Number.isFinite)) return;
    const enforcedPosition = enforceContactPosition(incomingDragPosition, groundY, offset);
    node.current?.setNativeProps({position:enforcedPosition});
    if (__DEV__) console.log({incomingDragPosition, enforcedPosition, lockedGroundY:groundY});
    dispatch({type:'drag', point:enforcedPosition});
  }
  return <ViroNode ref={node} position={position} rotation={[0,rotation,0]}
    dragType={locked ? undefined : 'FixedToPlane'}
    dragPlane={locked ? undefined : {planePoint:[0,groundY + offset,0], planeNormal:[0,1,0], maxDistance:20}}
    ignoreEventHandling={locked}
    onDrag={!locked && tracking === 'normal' ? drag : undefined}>
    {/* Debug contact cross at the locked ground Y, without an artificial lift. */}
    <ViroQuad width={.24} height={.015} position={[0,-offset,0]} rotation={[-90,0,0]} materials={['contactMarker']} />
    <ViroQuad width={.015} height={.24} position={[0,-offset,0]} rotation={[-90,0,0]} materials={['contactMarker']} />
    {/* Must-have view: ground footprint only. Optional 3D volume is deferred. */}
    <ViroPolyline thickness={.01} materials={['edge']} points={[
      [-w,0,-d],[w,0,-d],[w,0,d],[-w,0,d],[-w,0,-d],
    ]} />
    {supportPoints([0,0,0],0).map(p=><ViroNode key={p.id} position={p.position} ignoreEventHandling>
      <ViroQuad ignoreEventHandling width={.20} height={.20} rotation={[-90,0,0]} materials={[capturedSupportIds?.includes(p.id) ? 'supportCaptured' : activeSupportId===p.id ? 'supportActive' : 'supportPending']} />
      {/* Only the decorative number sits 1 mm above the square to avoid
          z-fighting. The contact square itself remains exactly at ground Y. */}
      {[...DIGIT_SEGMENTS[p.id]].map(segment=>{
        const s=SEGMENT_GEOMETRY[segment];
        return <ViroQuad key={segment} ignoreEventHandling width={s.width} height={s.length}
          position={[s.x,.001,s.z]} rotation={[-90,0,0]} materials={['supportNumber']} />;
      })}
    </ViroNode>)}
  </ViroNode>;
});
