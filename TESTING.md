# PLCR verification and regression guide

## Handover baseline

The project team confirms that the functional app was tested on an iPhone and works. The team collected **35 test measurements**, already known to the company. The raw dataset and reference/error analysis are not included in this repository. No accuracy percentage, error bound or measured workflow duration is asserted here.

The following checklist is for repeatable checks after changes. It replaces the previous milestone/redesign checklists; items are not a claim that a new device test was performed when these documents were written.

## Automated checks

Use Node 22.13+ and the committed lockfile:

```sh
npm ci
npm run typecheck
npm test
npm run export
```

On macOS/Linux also check the shell helper:

```sh
bash -n run.sh
bash run.sh --help
```

On Windows check `.\run.bat --help`, then use it for installation/startup. The batch workflow needs a real Windows machine for verification.

The suite covers plane stability, manual/automatic selection guards, frozen coordinates, placement lock/reset, fixed single/dual geometry, capture-quality gates, median/reference calculations, project validation and report generation. Export checks JavaScript and assets, not native compilation, physical accuracy or Android support.

## Browser preview

Run `npm run web` and check:

- Onboarding navigation/skip, home, menus and back/close actions.
- Theme, English/Dutch controls and optional profile persist across reloads; invalid email is rejected.
- New-project name validation, single/dual layout, saved drafts and the iPhone-only AR explanation.
- History search, favourites, deletion confirmation/cancellation and persistence after reload.
- Compact/tall viewports, keyboard behaviour, scrolling, larger text and absence of horizontal overflow.
- Contact shows a supervisor message with an empty support URL, or opens the configured company page.
- Completed reports and print/save-as-PDF with pop-ups allowed, when completed data exists in the browser. Use test data only in an isolated test browser; do not ship seeded measurements.

## Physical iPhone regression

Install a company-signed development build on a registered ARKit-capable iPhone; Expo Go and Simulator are unsuitable. Use a textured, adequately lit site large enough for the real 6 × 3 m or 6 × 6 m footprint.

1. Check first launch, camera permission grant/denial/recovery, safe areas and portrait controls.
2. Create a single-layout draft. Select automatic ground, confirm and place. Check physical scale against known distances, drag, 1/10 cm movement, ±5° rotation and rotation reset.
3. Lock placement. Check movement/rotation are blocked. Walk around, lower the camera and allow more surfaces to be discovered; stored pose and targets must remain unchanged. Distinguish AR tracking drift from application pose changes using Debug values.
4. Capture P1–P6 in order, with the same phone/case and bottom-edge ground contact. Verify the next target is highlighted and captured markers change state. Approach every marker closely to check native stability.
5. Move too far away, tilt, move during the hold, obscure texture and background the app. Capture must stay disabled while quality fails. After tracking interruption, require restarting the measurement sequence.
6. Edit placement and verify captures clear. Rescan repeatedly during the active session and verify the camera remains live. Test the explicit native tracking restart separately.
7. Repeat using Manual ground selection; selection/confirmation/lock/capture behaviour must remain consistent.
8. Capture a photo, finish and save. Force-close/reopen, inspect History and reopen the completed report. Check real values, data details, min/max/range and photo retention.
9. Export/share the PDF to a chosen destination; verify readable layout, metadata, six values and limitations. Cancel sharing and confirm the project remains saved. Photos are not embedded in the PDF.
10. Repeat with dual layout: two adjoining containers, nine unique markers, shared P4–P6 seam, all nine captures required, nine results/table entries and correct square report diagram. Layout must survive draft reload/reset/restart.
11. Check search/favourites/deletion, persisted profile/preferences and reopening drafts with a fresh scan. Phone and browser data must remain separate.

## Measurement evidence

For future measurement comparisons, record device/iOS/app build, site conditions, phone/case/contact posture, reference method, raw values, repeated runs and any tracking interruptions. Compare against independently known heights and report both error and repeatability. Short-window spread alone is not accuracy. Measure elapsed time if assessing a workflow-duration target.

Keep datasets in company test records and link them from the handover when available; do not commit personal project/profile/site data to a public repository.

## Debugging native failures

Metro logs include `AR NAVIGATOR MOUNTED/UNMOUNTED`, `AR INTERACTION`, `MEASUREMENT CAMERA`, `MEASUREMENT STATUS` and `GROUND CONTACT CAPTURE`. Debug also exposes placement/capture values. Treat logs as potentially containing site measurements when sharing them.

If iOS terminates the app, collect the matching crash/termination report from Settings → Privacy & Security → Analytics & Improvements → Analytics Data. A matching JetsamEvent can indicate memory termination. Record device/build, reproduction steps and timestamp; successful TypeScript/tests/export cannot rule out native crashes.
