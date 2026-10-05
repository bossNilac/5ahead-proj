# Container ground assessment — Must-have prototype

React Native + Expo 57 + TypeScript, using @reactvision/react-viro 2.58.1 on
physical iPhones. Designed for iPhone 15 without LiDAR. ARKit uses camera and
motion tracking; no GPS, AHN, terrain mesh, backend or external measurement input.

## Run on Windows with an iPhone

Use Node.js 22.13+ and the project's installed Expo development app:

```bat
cd /d C:\Users\Calin\Desktop\5ahead-proj
run.bat
```

Scan the QR with the iPhone Camera to open the development app. Expo Go cannot
load Viro's native code. Same Wi-Fi is easiest; `run.bat --tunnel` is available.
These application changes work in the existing Viro development build. To also
remove the previously bundled location module/permissions from the native app,
create and install a fresh build with `run.bat --build`. This uses EAS cloud
builds and your paid Apple developer account; no Mac is needed on Windows.

On macOS, local native builds use `npx expo prebuild --platform ios`, followed by
`npx expo run:ios --device`. Viro's Expo plugin and camera permission are in
app.json. Preserve the existing bundle identifier and EAS project settings.

## Workflow

1. Scan slowly in daylight/good lighting. Select a stable automatic floor patch,
   or use Manual ground to tap an approximate initial ground point. Confirm it.
2. Place the fixed **600 × 300 cm** footprint. Drag or use X/Z controls to slide
   it; rotate using the buttons. There is no dimension-entry screen.
3. Press **Lock placement and measure**. No drag, movement or rotation can change
   it during measurement. The six points are corners and long-edge midpoints.
4. Follow the highlighted point, in order 1–6. Rest the centre of the phone's
   bottom edge on the ground. Use the same phone/case throughout, upright in
   portrait, camera uncovered and facing textured surroundings. Do not tilt or
   press down. Keep still for two seconds, then use the single bottom button to
   confirm ground contact and capture when feedback permits it.
5. Read height differences and estimated local contact XYZ in centimetres.
   Edit placement clears measurements. Rescan ground clears placement and
   measurements without remounting the camera or restarting ARKit.

The full footprint needs a clear 6 × 3 m site. Apartment tests can check rendering
and controls, but all six points must be physically accessible to finish capture.

## Coordinates and accuracy

Viro world coordinates are **metres** internally; the UI displays centimetres.
X/Y/Z belong to the current AR session; Y is vertical displacement. They are not
latitude, longitude or surveyed elevation. World alignment is **Gravity**.

Point 1 establishes the reference camera height. With the same upright phone and
bottom-edge contact at every point, the unknown camera-to-bottom vertical offset
cancels when calculating `cameraY(point) - cameraY(point1)`. Estimated ground Y
adds this difference to point 1's initially selected AR ground Y. X/Z use the
captured camera position as an approximation of horizontal contact location;
the camera-to-edge horizontal offset is not calibrated. Raw camera coordinates,
planned support coordinates and estimated contact coordinates are separate.

Capture requires normal tracking, camera X/Z within 30 cm of the target,
upright tilt ≤10°, a continuous two-second steady hold within a three-second
window, no gaps over 650 ms, a fresh pose within 750 ms, and movement spread
≤1.5 cm. These are configurable gates, **not an accuracy certification**. The app
cannot sense physical ground contact. Align the bottom edge to the numbered
square; the 30 cm gate is only a camera-proximity tolerance, not permission to
measure away from the intended point. Aim fully upright; 10° is a practical
acceptance limit, not the recommended posture. AR drift, poor texture, lighting and
inconsistent phone contact can affect measurements. ±5 cm remains unvalidated.

## Architecture

- `placementState.ts`: automatic candidate stabilization, immutable initial
  world pose, explicit movement, final measurement lock and state-only reset.
- `ARPlacementScene.tsx` / `ARViewport.tsx`: stable navigator with Gravity,
  current selector anchor forwarding and camera transform updates. Automatic
  and manual modes share the same frozen scene-root renderer.
- `FrozenPlacement.tsx`: footprint and six numbered markers, independent of
  detected-plane nodes. Later plane updates cannot alter the saved pose.
- `src/assessment/measurement.ts`: support geometry, capture quality and relative
  measurements. `useAssessment.ts` stores captures in React application state.
  Tracking interruptions block capture until all measurements are restarted.
- `App.tsx`: guided three-step UI. Debug can log the local assessment data.

Only Musts are in this milestone. Optional photos, 3D container volume, automatic
suitability classification and a verified accuracy target are deferred. This
does not yet determine whether a site is safe/suitable for a real container.

See [MUST_IMPLEMENTATION.md](MUST_IMPLEMENTATION.md) for requirement coverage and
[TESTING.md](TESTING.md) for physical acceptance checks.
