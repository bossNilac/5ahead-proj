# Verification

Local checks:

```sh
npm run typecheck
npm test
npx expo export --platform ios --output-dir dist
```

Tests cover plane stabilization, frozen world coordinates through anchor
refinement and furniture discovery, manual/automatic parity, reset continuity,
fixed dimensions, rotated support geometry, final lock guards, camera-quality
gates, median capture and relative height calculations. They do not simulate
physical ARKit accuracy or certify performance outdoors.

## iPhone 15 acceptance

1. Fully reopen the installed development app after running run.bat. Use a clear
   textured 6 × 3 m site. Time the complete workflow from opening to six results;
   the requirement is under three minutes, including scanning and walking.
2. In daylight, select automatic floor, confirm, place, move and rotate. Check
   the 6 × 3 m outline against physical known distances. Indoor tests should
   not use reduced dimensions; this milestone deliberately fixes the size.
3. Lock placement. Record XYZ/yaw in Debug. Walk around and lower the camera.
   Let it discover a nearby table/cupboard. Saved pose and target coordinates
   must stay unchanged. If the entire AR view drifts despite unchanged numbers,
   record a tracking failure rather than treating it as a reducer pose change.
4. At point 1, rest the centre of the bottom edge on the ground, upright in
   portrait. Keep the camera uncovered and texture visible. Verify distance,
   tilt, tracking and steady-hold progress. Use the always-visible bottom button
   to confirm ground contact and capture. There is no separate confirmation toggle.
5. Repeat at points 2–6 using the same phone/case/contact posture. Captured marks
   turn green; the next mark is highlighted. Results show cm relative to point 1
   and estimated contact coordinates. On a level site, repeat the sequence to
   quantify repeatability. Compare against known-height test surfaces separately
   to measure error. Low sample spread alone must not be called accuracy.
6. Tilt the phone, move it, stand too far away, obscure texture, and background
   the app. Capture must be disabled. A tracking interruption requires restarting
   all measurements before continuing with a consistent reference.
7. Edit placement: six captures disappear, movement is available, same world
   origin remains. Relock and repeat. Rescan ground: clear everything except live
   camera/tracking/plane cache. Repeat ten times without a black camera.
8. Repeat the placement and six-point workflow using Manual ground. Behavior
   after confirmation and final lock must match automatic mode.
9. Test daylight glare and shadowed/textured sites. Record success/failure and
   elapsed time; daylight operation and the three-minute target remain pending
   real-device acceptance. A new native build must not request location access.

The first ground Y is still an AR estimate. Horizontal contact coordinates use
the camera as a proxy, with an uncalibrated camera-to-edge offset. Six samples do
not reconstruct terrain between points or prove absence of obstacles/clearance.

## Close-camera crash regression

The numbered ground markers now use flat quad strokes, without native 3D text
or billboarding. Locked measurement nodes have no active drag callback or drag
plane configuration. This is a mitigation for the reported close-camera native
exit; the underlying cause requires the iPhone crash report and is not confirmed.

Reload the development bundle and fully reopen the app. Approach every numbered
square, lower the camera to bottom-edge ground contact, and repeat all six
captures. Check movement still works before final lock and remains disabled
after it. Metro should print AR INTERACTION, MEASUREMENT STATUS and a throttled
MEASUREMENT CAMERA heartbeat during measurement.

If iOS closes the app to the home screen, collect the latest AR Placement crash
report from Settings > Privacy & Security > Analytics & Improvements > Analytics
Data. A matching JetsamEvent report may indicate an OS memory termination.
JavaScript logs and successful bundle export cannot rule out native crashes.
