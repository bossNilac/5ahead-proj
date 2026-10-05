import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlacementModel } from '../../types';
import { CONTACT_LIMITS, captureContact, contactQuality, contactResult, supportPoints, type CameraReading, type ContactCapture } from './measurement';

export function useAssessment(model:PlacementModel) {
  const [samples,setSamples]=useState<CameraReading[]>([]);
  const [captures,setCaptures]=useState<ContactCapture[]>([]);
  const [interrupted,setInterrupted]=useState(false);
  const [now,setNow]=useState(Date.now());
  const latest=useRef(model); latest.current=model;
  const lastDiagnostic=useRef(0);
  const points=useMemo(()=>model.lockedWorldPosition ? supportPoints(model.lockedWorldPosition,model.objectRotation) : [],
    [model.lockedWorldPosition,model.objectRotation]);
  const capturedSupportIds=useMemo(()=>captures.map(c=>c.id),[captures]);
  const target=points[captures.length];
  const onCameraReading=useCallback((reading:CameraReading)=>{
    if (!latest.current.assessmentLocked || latest.current.tracking!=='normal') return;
    if (reading.timestamp-lastDiagnostic.current>=2000) {
      lastDiagnostic.current=reading.timestamp;
      console.log('MEASUREMENT CAMERA', {position:reading.positionAR,up:reading.up});
    }
    setSamples(previous=>[...previous.filter(s=>reading.timestamp-s.timestamp<=CONTACT_LIMITS.windowMs),reading]);
    setNow(reading.timestamp);
  },[]);
  const restart=useCallback(()=>{setSamples([]);setCaptures([]);setInterrupted(false);},[]);
  useEffect(()=>{restart();},[model.assessmentLocked,model.lockedSurface,restart]);
  useEffect(()=>{
    if (model.assessmentLocked && model.tracking!=='normal') {setSamples([]);setInterrupted(true);}
  },[model.tracking,model.assessmentLocked]);
  useEffect(()=>{
    if (!model.assessmentLocked) return;
    const timer=setInterval(()=>setNow(Date.now()),250);
    return ()=>clearInterval(timer);
  },[model.assessmentLocked]);
  const quality=target ? contactQuality(samples,target,model.tracking,now) : null;
  useEffect(()=>{
    if (model.assessmentLocked) console.log('MEASUREMENT STATUS', {point:target?.id,reason:quality?.reason,interrupted});
  },[model.assessmentLocked,target?.id,quality?.reason,interrupted]);
  function capture() {
    // Pressing the single capture button explicitly confirms ground contact.
    if (!model.assessmentLocked || !target || interrupted) return;
    const captured=captureContact(samples,target,model.tracking,Date.now());
    if (!captured) return;
    setCaptures(previous=>previous.some(c=>c.id===captured.id) ? previous : [...previous,captured]);
    console.log('GROUND CONTACT CAPTURE', captured);
    setSamples([]);
  }
  const results=model.assessmentLocked && points.length && captures.length ? captures.map(c=>contactResult(c,captures[0],points[c.id-1])) : [];
  return {points,target,quality,captures,capturedSupportIds,results,interrupted,capture,restart,onCameraReading,
    complete:captures.length===6,canCapture:model.assessmentLocked && !!quality?.ready && !interrupted};
}
