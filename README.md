# PLCR

A React Native + Expo SDK 57 app for positioning one **6 × 3 m** container (six
support points) or two side by side in a **6 × 6 m** layout (nine support points). The interface follows
the 17 references in `lo-fi/`: orange headers and menus, charcoal backgrounds,
deep blue actions, green capture feedback, and white measurement reports.

## Run

Requires **Node.js 22.13+**, npm, and a physical ARKit-capable iPhone.
Viro requires a development build; **Expo Go cannot run this app**.

```sh
./run.sh
# First-time setup, or after adding native dependencies:
./run.sh --build
# If the phone and computer cannot use the same Wi-Fi:
./run.sh --tunnel
```

`run.sh` mirrors `run.bat` on Windows: install locked dependencies, check
TypeScript, run tests, optionally configure/register/build an iPhone development
app through EAS, and start Metro in development-client mode. EAS device builds
require Expo login and Apple Developer Program membership. Install the resulting
build, enable iOS Developer Mode if prompted, and scan Metro's QR code.

**This redesign adds native modules for storage, safe areas, SVG, PDF generation,
and sharing. Install a fresh development build before testing on your phone.**
The bundle identifier, EAS project ID, and existing Viro patch are preserved.
The app's display name is now PLCR.

On macOS, local builds can use `npx expo run:ios --device`. On Linux/Windows, use
the EAS cloud build in `run.sh --build` / `run.bat --build`.

A browser preview supports onboarding, preferences, profile, history and reports:

```sh
npm ci
npm run web
```

AR itself requires the iPhone app. Browser storage and phone storage are separate.
A browser-created draft opens an explanation of how to continue on the phone.

## Workflow

1. Follow or skip the onboarding tutorial. Camera permission is requested on
   demand, either at the tutorial's final screen or when opening AR.
2. Create a named project, select the **Two containers side by side** switch for
   the dual layout, and optionally add location and notes. The draft is saved
   locally before starting the camera.
3. **Scan ground:** slowly scan textured ground in good lighting. Select a stable
   automatic surface or choose Manual and tap an approximate ground hit. Confirm
   the intended surface to freeze its height.
4. **Position:** place, drag, move and rotate the container. Controls offer 1 cm
   and 10 cm steps, ±5° rotation and rotation reset. The wireframe volume is a
   visual aid; the contact footprint remains on the confirmed ground plane.
5. **Measure:** lock the placement, then visit points 1–6 or 1–9 in order for your selected layout. Rest the center
   of the phone's bottom edge on the ground, upright in portrait, with the camera
   uncovered. Use the same phone/case at every point. Hold still for two seconds
   and explicitly confirm ground contact to capture. Interrupted tracking requires
   restarting all measurements before proceeding.
6. **Results:** inspect capture details, remeasure if needed, then save and review
   the completed report. Export & share generates a PDF and opens the native share
   sheet; the browser uses its print dialog.
7. History supports searching, favorites, opening reports, continuing drafts with
   a fresh AR scan, and deleting projects. Completed measurements survive restarts.

Settings persist day/night theme and English/Dutch navigation and control labels.
Technical guidance and PDF reports remain English. Account provides a local,
optional name/email/company profile used in reports, plus privacy information.
Contact opens the repository's real issue tracker.

## Data and accuracy

There is no server or authentication service in this repository. Projects,
preferences, profile, captures and optional AR photos are stored on the device.
Storage writes are queued and awaited; failures are surfaced without claiming a
successful save. Invalid saved data is reported rather than silently overwritten.
No sample projects or invented measurement values appear in the shipped UI.

AR world coordinates are **metres** internally and **centimetres** in reports.
Point 1 establishes the height reference. The same upright phone/case at every
point lets its unknown camera-to-bottom vertical offset cancel in the difference.
Camera X/Z approximate horizontal contact location; that offset is not calibrated.
These are local relative estimates, not geographic coordinates or surveyed
heights. Capture conditions do not certify accuracy or installation suitability.

Captures still require normal tracking, proximity within 30 cm, tilt ≤10°, a
continuous two-second hold with ≤1.5 cm movement spread, fresh camera data and no
long sample gaps. The app cannot sense physical ground contact. Report colors
show absolute relative height (green ≤2 cm, orange ≤5 cm, red >5 cm), **not** a
validated ground suitability classification.

Saved AR coordinates cannot be restored into a new camera session. Drafts restart
scanning; completed projects reopen their reports. Rescanning during an active
assessment resets application state without remounting the AR navigator.

## Architecture and checks

- `App.tsx`: application navigation, orange menus, profile and project forms.
- `src/ui/`: shared controls, safe-area layout, icons, vector container artwork,
  theme and navigation translations.
- `src/screens/`: onboarding, project history, report, and AR workflow.
- `src/projects/`: typed local data, validated persistence, report summary and PDF.
- `placementState.ts` / `placementGeometry.ts`: existing immutable placement logic.
- `ARPlacementScene.tsx` / `ARViewport.tsx` / `FrozenPlacement.tsx`: native AR scene,
  stable Gravity-aligned navigator, volume and numbered contact markers.
- `src/assessment/`: existing quality gates, capture and relative-height logic.

```sh
npm run typecheck
npm test
npm run export
```

Export bundles JavaScript and assets for iOS, Android and web. Native compilation,
live tracking, physical measurements, photo capture and iOS PDF sharing still
require a development build and physical device. See `TESTING.md` for the original
AR acceptance checks and `UI_TESTING.md` for redesign checks.

## Dual layout

The project layout is saved with the draft and cannot change during measurement.
The 6 × 6 m footprint contains two adjoining 6 × 3 m containers. Points 1–3 run
end–midpoint–end along the first outer long edge, 4–6 along the shared seam, and
7–9 along the opposite outer edge. Shared points are measured once. Reports, PDF
diagrams, height tables and summaries use all nine captures. Existing projects
without a layout field are read as the original single layout.

This is a JavaScript-only feature; it adds no native dependencies. Physical-device
acceptance should verify all nine numbered markers, movement/rotation, capture
order, reset behavior and native PDF sharing.
