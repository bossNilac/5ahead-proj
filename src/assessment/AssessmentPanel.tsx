import { Button, Text, View } from 'react-native';
import type { useAssessment } from './useAssessment';
import { CONTACT_LIMITS } from './measurement';
const cm=(v:number)=>`${(v*100).toFixed(1)} cm`;
export default function AssessmentPanel({assessment:a}:{assessment:ReturnType<typeof useAssessment>}) {
  return <View>
    <Text style={{fontWeight:'bold'}}>Step 3: {a.complete ? 'Results' : `Measure point ${a.target?.id} of 6`}</Text>
    {a.interrupted ? <>
      <Text>Tracking was interrupted. Keep the locked footprint, restore normal tracking and restart measurements to avoid mixing height references.</Text>
      <Button title="Restart measurements" onPress={a.restart} />
    </> : !a.complete && <>
      <Text>{a.target?.id===1 ? 'Point 1 establishes the contact reference for this phone and case.' : 'Use exactly the same phone, case and upright contact position as point 1.'}</Text>
      <Text>Move slowly to the highlighted number. Rest the centre of the bottom edge on the ground. Keep the camera uncovered and facing a textured area. Hold upright in portrait; do not tilt, press down or lift the phone.</Text>
      <Text>Keep still until the two-second hold completes. The button at the bottom confirms ground contact and captures together. The app cannot sense physical contact.</Text>
      <View style={{padding:8,backgroundColor:a.canCapture ? '#c9f5d1' : '#ffe9c5'}} accessibilityLiveRegion="polite">
        <Text>{a.quality?.reason}</Text>
        <Text>Horizontal distance: {a.quality && Number.isFinite(a.quality.distanceM) ? cm(a.quality.distanceM) : '--'}</Text>
        <Text>Tilt: {a.quality && Number.isFinite(a.quality.tiltDeg) ? a.quality.tiltDeg.toFixed(1) : '--'} degrees (limit {CONTACT_LIMITS.tiltDeg}; aim upright)</Text>
        <Text>Camera movement: {a.quality && Number.isFinite(a.quality.spreadM) ? cm(a.quality.spreadM) : '--'}</Text>
        <Text>{a.quality?.checks.tracking ? '✓' : '✗'} Normal tracking</Text>
        <Text>{a.quality?.checks.fresh ? '✓' : '✗'} Fresh camera reading</Text>
        <Text>{a.quality?.checks.nearby ? '✓' : '✗'} Camera within {CONTACT_LIMITS.radiusM*100} cm of point {a.target?.id}</Text>
        <Text>{a.quality?.checks.upright ? '✓' : '✗'} Upright phone</Text>
        <Text>{a.quality?.checks.steady ? '✓' : '✗'} Steady hold: {Math.min((a.quality?.stableMs ?? 0)/1000,CONTACT_LIMITS.spanMs/1000).toFixed(1)} / {CONTACT_LIMITS.spanMs/1000} s</Text>
      </View>
    </>}
    <Text>Planned support coordinates (local AR):</Text>
    {a.points.map(p=><Text key={p.id}>{p.id}: X {cm(p.position[0])} / Y {cm(p.position[1])} / Z {cm(p.position[2])}</Text>)}
    {a.results.length>0 && <>
      <Text>Estimated heights relative to point 1:</Text>
      {a.results.map(r=><View key={r.id}>
        <Text>{r.id}: {r.relativeHeightCm>=0?'+':''}{r.relativeHeightCm.toFixed(1)} cm; sample spread {r.spreadCm.toFixed(1)} cm</Text>
        <Text>Estimated contact: X {cm(r.estimatedPosition[0])} / Y {cm(r.estimatedPosition[1])} / Z {cm(r.estimatedPosition[2])}</Text>
      </View>)}
      <Text>Point 1 is the height datum. Initial ground Y is an AR estimate; these are relative measurements, not surveyed absolute elevations.</Text>
      <Text>X/Z use the camera position as an approximate ground contact location. The camera-to-edge offset is not calibrated.</Text>
      <Text>Green means capture conditions are met. It does not establish +/-5 cm measurement accuracy.</Text>
      <Button title="Remeasure all points" onPress={a.restart} />
    </>}
  </View>;
}
