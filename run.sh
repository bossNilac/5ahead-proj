#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

build=false
connection=--lan
for arg in "$@"; do
  case "$arg" in
    --build) build=true ;;
    --tunnel) connection=--tunnel ;;
    -h|--help)
      printf '%s\n' 'Usage: bash run.sh [--build] [--tunnel]' \
        '  --build   Configure and build the iPhone development app using EAS.' \
        '  --tunnel  Use an Expo tunnel instead of the same Wi-Fi network.' \
        'Requires Node.js/npm; on Windows use run.bat.' \
        'Expo Go cannot run Viro. Install the development build first.'
      exit 0 ;;
    *) printf 'Unknown option: %s\n' "$arg" >&2; exit 1 ;;
  esac
done

command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 || {
  printf '%s\n' 'Install Node.js LTS (including npm), reopen your terminal, and retry.' >&2
  exit 1
}

node -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (major < 22 || (major === 22 && minor < 13)) { console.error("Expo 57 requires Node.js 22.13 or newer."); process.exit(1); }'

printf '%s\n' 'Installing locked dependencies…'
npm ci
npm run typecheck
npm test

if "$build"; then
  printf '%s\n' \
    'One-time iPhone setup: follow the Expo/Apple account and signing prompts.' \
    'A paid Apple Developer membership is required for this EAS device build.' \
    'Use your own ios.bundleIdentifier in app.json before building.'
  npx --yes eas-cli@latest whoami || npx --yes eas-cli@latest login
  npx --yes eas-cli@latest init
  npx --yes eas-cli@latest build:configure --platform ios
  npx --yes eas-cli@latest device:create
  npx --yes eas-cli@latest build --platform ios --profile development --wait
  printf '%s\n' \
    'Install the development build on your registered iPhone using the EAS link above.' \
    'Enable iOS Developer Mode if prompted. Then scan the Metro QR code below.'
fi

printf '%s\n' \
  'Starting PLCR. Scan the QR code with the iPhone Camera app.' \
  'Open it in your installed PLCR development build, not Expo Go.' \
  'If you have not installed it yet, stop and run: bash run.sh --build' \
  'For LAN mode, keep your iPhone and computer on the same Wi-Fi.'
exec npx expo start --dev-client "$connection"
