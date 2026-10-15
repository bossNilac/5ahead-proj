# PLCR

PLCR helps position containers in augmented reality and record relative ground heights at their support points. It supports one **6 × 3 m container with six points**, or two adjoining containers in a **6 × 6 m layout with nine points**.

**The full app works on physical ARKit-capable iPhones only.** Android and iOS Simulator are not supported targets for this handover. Windows, macOS and Linux can all host the development server or run the browser preview. The browser previews the interface and local project management; it cannot perform AR measurements.

The functional app has been tested on an iPhone. The project team also collected 35 test measurements, already known to the company. Final UI changes await the company's designs. See [the technical report](TECHNICAL_REPORT.md) for implementation details and [the testing guide](TESTING.md) for checks after changes.

## Requirements

- Git and Node.js **22.13 or newer**, including npm. Node 22 is the recommended baseline for this repository. Check with `node --version` and `npm --version`.
- A terminal: PowerShell/Command Prompt on Windows, Terminal on macOS, or a Linux shell.
- For AR: a physical ARKit-capable iPhone on iOS **16.4 or newer**, camera access, and a PLCR development build. The project targeted a non-LiDAR iPhone 15; LiDAR is not required.
- For the cloud iPhone build: the **company's own Expo account/EAS project and paid Apple Developer Program membership**, with access to signing credentials and device registration. An Apple Developer account is not needed for the browser preview.

Viro uses native code, so **Expo Go cannot run PLCR**. SDK requirements are documented in the [Expo SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/).

## Get the source

Clone the company repository using the URL supplied by the supervisor, then open a terminal in its root (the folder containing `package.json`). All commands below run from that folder. No backend, database service, API key or `.env` file is required.

## Browser preview on any operating system

```sh
npm ci
npm run web
```

Open the local URL printed by Expo, or press `w` in the terminal. Stop the server with Ctrl+C.

You can review onboarding, settings, profile, new-project forms and history. Starting a project shows the explanation that AR requires an iPhone. Completed reports can be viewed when completed project data exists in that browser; phone data is not synchronised to the browser. Browser export uses a print window and the browser's save-as-PDF feature.

## First iPhone build: company setup

Do this once for the company, before using `--build`:

1. In `app.json`, replace `expo.ios.bundleIdentifier` (`com.example.plcr`) with a unique company-controlled identifier, such as `com.yourcompany.plcr`. The supplied value is a placeholder.
2. Optionally set `expo.extra.supportUrl` to the company's HTTPS support page or issue tracker. With the default empty value, Contact directs users to their company supervisor.
3. Use the company's Expo account and Apple Developer team during the prompts below. The previous developer's EAS project link and personal bundle identifier have been removed. Do not reuse their accounts or credentials.

On **Windows**, in PowerShell:

```powershell
.\run.bat --build
```

On **macOS or Linux**:

```sh
bash run.sh --build
```

The script installs locked dependencies, applies the committed Viro patch, checks TypeScript and runs tests. It then signs into Expo if needed, initialises/links the company's EAS project, configures an iOS build, registers the phone and requests an internal development build. If already logged in, verify the displayed account is the company's; use `npx --yes eas-cli@latest logout` and `login` to switch if necessary. Select the company account/organisation when linking the project.

EAS writes the new project ID into `app.json`. Keep the company's resulting configuration for subsequent builds. Apple signing/device-registration prompts require someone with the appropriate team permissions. Cloud builds work from all three desktop operating systems; Xcode is not required for this route.

Install the finished build using the EAS link on the registered iPhone. Enable Developer Mode if iOS requests it. Keep the terminal running, then scan the Metro QR code with the iPhone camera and open it in PLCR. You may also open PLCR's development launcher and connect to the server there. Installation/signing details are covered in Expo's [internal distribution guide](https://docs.expo.dev/build/internal-distribution/).

Each new iPhone must be registered and included in a provisioning profile; register it and create a new build, or have the build administrator re-sign a compatible existing build. A supervisor with a supplied development build for their registered phone can skip building and follow the next section.

## Daily use with an installed development build

| Computer | Command |
| --- | --- |
| Windows PowerShell | `.\run.bat` |
| macOS / Linux | `bash run.sh` |

Keep the computer and iPhone on the same Wi-Fi, then scan the QR code. These scripts install dependencies and run checks each time. For a faster start after dependencies are installed, use `npm start`.

If the network prevents the phone reaching the computer, use `.\run.bat --tunnel` on Windows or `bash run.sh --tunnel` on macOS/Linux. Expo may prompt to install its tunnel helper; a tunnel requires internet access.

Rebuild after changing native dependencies, SDK version, signing/bundle settings or native app configuration. Ordinary TypeScript/UI changes generally only need Metro and a reload. The development build loads code from the development server; this repository does not provide a standalone production distribution workflow.

### Optional local build on macOS

With Xcode **26.4 or newer**, its command-line tools, a connected trusted iPhone and company signing configured:

```sh
npm ci
npm run ios
```

This invokes `expo run:ios --device`, generates the native project if needed, compiles, installs and starts development. After native configuration/dependency changes, regenerate with `npx expo prebuild --clean --platform ios` before rebuilding; this replaces generated native files. Windows and Linux must use the EAS cloud route for iPhone builds. See Expo's [development build guide](https://docs.expo.dev/develop/development-builds/introduction/).

## Use the app

1. Follow or skip onboarding; allow camera access when entering AR. Optionally set your local profile, theme and English/Dutch controls.
2. Create a named project, choose single or dual layout, and optionally enter a site description and notes. Location is manually entered text, not GPS. The draft saves before AR opens.
3. Scan textured ground in good light. Select a stable detected surface, or select Manual and tap an approximate ground hit. Confirm the intended ground surface.
4. Place, drag, move and rotate the container. Fine/coarse movement steps are 1/10 cm and rotation steps are 5°. Lock placement before measuring.
5. Visit the numbered points in order. Rest the centre of the phone's bottom edge on the ground, upright in portrait, keeping the camera uncovered. Use the same phone, case and posture throughout. Hold still for two seconds, then press capture to confirm ground contact when enabled.
6. If tracking is interrupted, restore tracking and restart all measurements. Editing placement also clears the captures.
7. Review all six/nine results and save. Reopen completed reports from History; export opens iOS PDF sharing. Optional AR photos are stored with the project but are not embedded in the PDF.

Drafts restart with a fresh AR scan; saved world coordinates cannot resume a new AR camera session. Projects, profile and preferences stay locally on that phone/browser. There is no login service or cross-device sync. Export needed reports before deleting the app; a PDF is not an importable project backup.

Heights are relative to point 1, not surveyed elevations. Report colours indicate the magnitude of relative height (green ≤2 cm, orange ≤5 cm, red >5 cm); they do not certify container installation suitability. See the technical report for the measurement method and its limits.

## Checks and troubleshooting

```sh
npm run typecheck
npm test
npm run export
```

`export` creates JavaScript/assets in `dist/` for iOS, Android and web. Successful Android bundling does not mean Android is a supported app. Export does not create an installable iPhone build. Device checks are in [TESTING.md](TESTING.md).

| Symptom | Action |
| --- | --- |
| Node or npm not found | Install Node 22.13+ with npm, reopen the terminal and check both versions. |
| Missing native module / opened in Expo Go | Open the PLCR development build; rebuild after native changes. |
| Phone cannot connect | Keep Metro running, use the same Wi-Fi, permit local network access, check firewall/VPN settings, or use `--tunnel`. |
| EAS project/signing access denied | Verify company Expo login, EAS ownership, company Apple team permissions and phone registration. |
| Camera denied | Enable camera access for PLCR in iPhone Settings. |
| Capture stays disabled | Follow the live tracking, distance, tilt and hold feedback; keep ground contact and texture visible. Restart measurements after tracking interruption. |
| Old JavaScript persists | Stop Metro and run `npx expo start --dev-client --clear`. |
| Patch fails during install | Use the committed lockfile and Viro version; inspect `patches/` before updating Viro. |
| Saved-data error on startup | Do not clear storage as the first response. Preserve device data and investigate the validation error; there is no project restore/import feature. |
| Browser report window blocked | Allow pop-ups for the preview origin and retry export. |

## Company handover and GitHub publication

The source uses a placeholder bundle ID, has no previous EAS project link, and has no personal support URL. Required company configuration is described above. Keep signing keys, provisioning profiles, account credentials and real project/test data out of Git.

This existing GitHub repository is the shared handover repository. The handover is committed normally, preserving earlier commits. Personal details have been removed from the current source/configuration; earlier commits and Git author metadata remain visible in the repository history.

The previous local development configuration is available at commit `7156227`. To run that version without reverting or changing the shared branch, create a separate local checkout with `git worktree add --detach ../plcr-local 7156227`, then follow the README in that checkout. Do not push its personal configuration back onto the shared branch. Preserve third-party copyright/licence notices in `LICENSE` and dependency packages.
