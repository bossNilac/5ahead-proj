import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { AppState, Button, Linking, PixelRatio, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ViroARSceneNavigator, isARSupportedOnDevice, requestRequiredPermissions } from '@reactvision/react-viro';
import ARViewport from './ARViewport';
import PlacementControls from './PlacementControls';
import type { PlacementAction } from './types';
import { canConfirmSurface, initialPlacement, placementReducer, unexpectedPoseChange } from './placementState';
import { useAssessment } from './src/assessment/useAssessment';
import AssessmentPanel from './src/assessment/AssessmentPanel';

export default function App() {
  const [model, reduce] = useReducer(placementReducer, undefined, initialPlacement);
  const assessment = useAssessment(model);
  const navigator = useRef<ViroARSceneNavigator>(null);
  const previousPose = useRef(model);
  const [ready, setReady] = useState(false);
  const [startupError, setStartupError] = useState('');
  const [debug, setDebug] = useState(false);
  const dispatch = useCallback((action: PlacementAction) => {
    if (action.type === 'tracking') console.log('AR TRACKING', action.quality);
    if (['place','lock-placement','edit-placement','reset'].includes(action.type)) console.log('AR INTERACTION',action.type);
    reduce(action);
  }, []);
  useEffect(() => {
    if (unexpectedPoseChange(previousPose.current, model)) console.warn('BUG: locked AR pose changed without explicit interaction.');
    previousPose.current = {...model, lockedWorldPosition:model.lockedWorldPosition ? [...model.lockedWorldPosition] : null};
  }, [model]);
  const checkDevice = useCallback(async () => {
    setStartupError('');
    try {
      const support = await isARSupportedOnDevice();
      if (!support.isARSupported) { setStartupError('Use an ARKit-capable physical iPhone.'); return; }
      const permissions = await requestRequiredPermissions(['camera']);
      if (!permissions.camera) { setStartupError('Enable camera access in Settings, then retry.'); return; }
      setReady(true);
    } catch (error) {
      setStartupError(`Could not start AR: ${String(error)}. Use the installed development build.`);
    }
  }, []);
  useEffect(() => { void checkDevice(); }, [checkDevice]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') dispatch({type:'tracking', quality:'limited'});
    });
    return () => listener.remove();
  }, [dispatch]);
  useEffect(() => {
    if (model.lockedWorldPosition) console.log('Locked contact world metres:', model.lockedWorldPosition);
  }, [model.lockedWorldPosition]);
  const selected = model.selectedSurface;
  const surfaceLocked = !!model.lockedSurface;
  const normal = model.tracking === 'normal';
  const position = model.lockedWorldPosition;
  const cm = (value:number) => (value * 100).toFixed(1);
  return <View style={styles.screen}>
    {ready && <ARViewport navigatorRef={navigator} model={model} dispatch={dispatch}
      onCameraReading={assessment.onCameraReading}
      activeSupportId={model.assessmentLocked ? assessment.target?.id : undefined}
      capturedSupportIds={assessment.capturedSupportIds} />}
    {ready && model.mode === 'manual' && !selected && <Pressable style={StyleSheet.absoluteFill}
      accessibilityLabel="Tap approximate ground" onPress={event => dispatch({type:'manual-tap',
        x:event.nativeEvent.locationX * PixelRatio.get(), y:event.nativeEvent.locationY * PixelRatio.get()})} />}
    {!ready ? <View style={styles.startup}>
      <Text>{startupError || 'Checking camera and AR access…'}</Text>
      {!!startupError && <><Button title="Open Settings" onPress={() => void Linking.openSettings()} />
        <Button title="Retry" onPress={() => void checkDevice()} /></>}
    </View> : <>
      <ScrollView style={styles.panel} contentContainerStyle={{padding:8}}>
        <Text style={styles.title}>Container site assessment</Text>
        <Text>Fixed footprint: 600 × 300 cm</Text>
        <Text>{normal ? 'Tracking ready.' : 'Move slowly; keep textured surroundings visible. Tracking is not ready.'}</Text>
        {!surfaceLocked && <>
          <Text>1. Select ground</Text>
          <Text>Use daylight or good lighting. Point down and move sideways slowly over textured ground; avoid glare. Tap the intended floor patch.</Text>
          <Text>{model.mode === 'manual' ? model.manualError || 'Manual: tap the ground to obtain an approximate initial height.'
            : normal && Object.values(model.detectedPlanes).some(p => p.selectable) ? 'Automatic floor ready.' : 'Stabilizing automatic floor…'}</Text>
          {selected && <Text>Inspect the surface before confirming. Its height will be frozen.</Text>}
        </>}
        {surfaceLocked && !model.assessmentLocked && <>
          <Text>2. Position footprint</Text>
          <Text>Place, slide and rotate the outline. The six numbered marks are the measurement points. Lock when its position is final.</Text>
          {position && <Text>Contact X {cm(position[0])}, Y {cm(position[1])}, Z {cm(position[2])} cm · Rotation {model.objectRotation.toFixed(0)}°</Text>}
        </>}
        {model.assessmentLocked && <AssessmentPanel assessment={assessment} />}
        {debug && <>
          <Text>Local AR coordinates in cm; session origin, not geographic elevation.</Text>
          {['X','Y','Z'].map((axis,i) => <Text key={axis}>Camera {axis}: {model.camera ? cm(model.camera[i]) : '—'} cm</Text>)}
          <Text>Planes: {Object.keys(model.detectedPlanes).length}</Text>
          <Button title="Log local measurements" onPress={() => console.log('LOCAL ASSESSMENT', {
            dimensions:model.dimensions, lockedWorldPosition:position, rotation:model.objectRotation,
            points:assessment.points, measurements:assessment.results,
          })} />
          <Button title="Restart AR tracking (debug)" onPress={() => {
            navigator.current?.arSceneNavigator.resetARSession(true, true);
            dispatch({type:'restart-tracking'});
          }} />
        </>}
      </ScrollView>
      <View style={styles.controls}>
        {!surfaceLocked && !selected && <View style={styles.row}>
          <Button title="Auto" onPress={() => dispatch({type:'mode',mode:'detected'})} />
          <Button title="Manual ground" onPress={() => dispatch({type:'mode',mode:'manual'})} />
        </View>}
        {selected && !surfaceLocked && <View style={styles.row}>
          <Button title="Confirm surface" disabled={!canConfirmSurface(model)} onPress={() => dispatch({type:'confirm'})} />
          <Button title="Choose another" onPress={() => dispatch({type:'choose-another'})} />
        </View>}
        {model.phase === 'surface-locked' && <Button title="Place footprint" disabled={!normal}
          onPress={() => { if (model.selectionPoint) dispatch({type:'place',point:model.selectionPoint}); }} />}
        {model.phase === 'object-placed' && !model.assessmentLocked && <>
          <PlacementControls model={model} dispatch={dispatch} />
          <Button title="Lock placement and measure" disabled={!normal} onPress={() => dispatch({type:'lock-placement'})} />
        </>}
        {model.assessmentLocked && <>
          <Button title={assessment.complete ? 'Six points captured' : `Confirm ground contact & capture point ${assessment.target?.id}`}
            disabled={!assessment.canCapture} onPress={assessment.capture} />
          <Button title="Edit placement (clears measurements)" onPress={() => dispatch({type:'edit-placement'})} />
        </>}
        <View style={styles.row}>
          <Button title="Rescan ground" onPress={() => dispatch({type:'reset'})} />
          <Button title={debug ? 'Hide debug' : 'Debug'} onPress={() => setDebug(v => !v)} />
        </View>
      </View>
    </>}
  </View>;
}
const styles = StyleSheet.create({
  screen:{flex:1}, startup:{flex:1,justifyContent:'center',padding:24}, title:{fontSize:17,fontWeight:'bold'},
  panel:{position:'absolute',top:55,left:10,right:10,maxHeight:'48%',backgroundColor:'#ffffffee'},
  controls:{position:'absolute',bottom:28,left:10,right:10,padding:6,backgroundColor:'#ffffffee'},
  row:{flexDirection:'row',justifyContent:'space-around'},
});
