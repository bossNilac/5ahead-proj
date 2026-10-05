import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';
import type { PlacementProps } from './types';

export default function PlacementControls({ model, dispatch }: PlacementProps) {
  const [mode, setMode] = useState<'move' | 'rotate'>('move');
  const [fine, setFine] = useState(false);
  const disabled = model.assessmentLocked || model.tracking !== 'normal';
  const step = fine ? .01 : .1;
  return <View>
    <View style={styles.row}>
      <Button title="Move" onPress={() => setMode('move')} />
      <Button title="Rotate" onPress={() => setMode('rotate')} />
    </View>
    {mode === 'move' && <>
      <Text>World axes; drag moves X/Z only. Step: {step * 100} cm</Text>
      <View style={styles.row}>
        <Button title="X −" disabled={disabled} onPress={() => dispatch({type:'move', x:-step, z:0})} />
        <Button title="X +" disabled={disabled} onPress={() => dispatch({type:'move', x:step, z:0})} />
        <Button title="Z −" disabled={disabled} onPress={() => dispatch({type:'move', x:0, z:-step})} />
        <Button title="Z +" disabled={disabled} onPress={() => dispatch({type:'move', x:0, z:step})} />
      </View>
      <Button title={fine ? 'Use 10 cm steps' : 'Use 1 cm steps'} onPress={() => setFine(v => !v)} />
    </>}
    {mode === 'rotate' && <View style={styles.row}>
      <Button title="−5°" disabled={disabled} onPress={() => dispatch({type:'rotate', delta:-5})} />
      <Button title="+5°" disabled={disabled} onPress={() => dispatch({type:'rotate', delta:5})} />
      <Button title="Reset rotation" disabled={disabled} onPress={() => dispatch({type:'reset-rotation'})} />
    </View>}
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', justifyContent: 'space-around' } });
