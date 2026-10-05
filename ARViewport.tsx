import { useEffect, type RefObject } from 'react';
import { ViroARSceneNavigator } from '@reactvision/react-viro';
import ARPlacementScene from './ARPlacementScene';
import type { PlacementProps } from './types';

const initialScene = { scene: ARPlacementScene };

export default function ARViewport({ navigatorRef, model, dispatch, onCameraReading, activeSupportId, capturedSupportIds }: PlacementProps & {
  navigatorRef: RefObject<ViroARSceneNavigator | null>;
}) {
  useEffect(() => {
    console.log('AR NAVIGATOR MOUNTED');
    return () => console.log('AR NAVIGATOR UNMOUNTED');
  }, []);
  return <ViroARSceneNavigator ref={navigatorRef} style={{flex:1}}
    initialScene={initialScene} worldAlignment="Gravity"
    provider="none" viroAppProps={{model, dispatch, onCameraReading, activeSupportId, capturedSupportIds}} />;
}
