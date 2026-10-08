# PLCR redesign acceptance checks

## Installation

- `npm ci`, `npm run typecheck`, `npm test`, and `npm run export` must succeed.
- `bash -n run.sh` and `./run.sh --help` must succeed.
- Install a new Viro development build after adding the redesign's native modules.
- Verify on a physical ARKit-capable iPhone; Expo Go is not supported.

## Navigation and persistence

- First launch opens the five-screen tutorial. Next, Back, Skip and camera access
  lead to the appropriate screens. Subsequent launches open Home.
- Home uses the orange PLCR header, blueprint container artwork and compact blue
  New project / History buttons. Settings and Account expand orange menus.
- Change day/night theme and English/Dutch controls, then relaunch and verify.
- Edit optional profile fields; invalid email is rejected and saved fields persist.
- Enter project name/location/notes. Empty names cannot start an assessment.
- Leave AR and verify the draft in History. Continuing restarts the AR scan.
- Search projects, favorite/unfavorite, filter favorites, and confirm/cancel deletion.
- Verify menu dismissal and all back/close actions. Test compact and tall phones,
  safe areas, the keyboard, scrollable content and larger system text sizes.

## AR and report

- Complete the existing checks in `TESTING.md`; retain the same placement and
  capture invariants. Four-stage controls must prevent skipping required gates.
- Confirm surface, place and move/rotate with coarse/fine steps. The visible
  container volume must keep its base at the frozen ground Y.
- Lock placement; moving controls and dragging cannot change measured placement.
- Capture points 1–6, interrupt tracking, and verify restart is required.
- Rescan ground without remounting the navigator during the active session.
- Capture an AR photo, finish, save and verify that History/report retains it.
- Open Data details and verify XYZ, tilt, spread and actual relative heights.
- Results show six points, max/min/range and explicit relative-measurement context.
- Save, force-close/relaunch, and reopen the completed report from History.
- Export & share produces a readable PDF containing project/profile metadata,
  six real measurements, summary and measurement limitations. Test sharing cancel.
- Verify that changing or deleting a project never fabricates measurements.

## Limits of automated verification

JavaScript exports and browser tests cannot verify ARKit tracking or certify
measurement accuracy. Physical testing is needed for native module initialization,
phone ground-contact capture, actual safe areas, AR photos and the native share sheet.

## Verification completed for this implementation

- Clean locked install, TypeScript checks and the placement/measurement/project
  test files passed; Expo exported iOS, Android and web bundles.
- Expo's dependency compatibility check passed on SDK 57.0.27.
- Browser checks passed for onboarding, settings/account menus, persisted theme
  and profile, project drafts, history, favorites, reload persistence and deletion.
- Mobile viewports 320 × 568, 390 × 844 and 430 × 932 had no horizontal overflow.
- Completed-report rendering and printable export were verified with test-only
  captures derived through the existing measurement functions. Test data was
  injected only into the temporary browser, never into shipped app data.
- Native ARKit, physical contact measurements, photos and iOS sharing remain
  physical-device acceptance checks.

The critical shell-quote transitive advisory was fixed. npm still reports moderate
and high advisories in the Expo/React Native/tooling dependency tree. Dependency
versions were kept compatible with SDK 57; no forced framework upgrade was applied.
