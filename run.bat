@echo off
setlocal
cd /d "%~dp0"
set "AR_BUILD=0"
set "AR_CONNECTION=--lan"

:parse
if "%~1"=="" goto setup
if /i "%~1"=="--build" (
  set "AR_BUILD=1"
  shift
  goto parse
)
if /i "%~1"=="--tunnel" (
  set "AR_CONNECTION=--tunnel"
  shift
  goto parse
)
if /i "%~1"=="--help" goto help
echo Unknown option: %~1
goto failed

:help
echo Usage: run.bat [--build] [--tunnel]
echo   --build   Configure and build the iPhone development app using EAS.
echo   --tunnel  Use an Expo tunnel instead of the same Wi-Fi network.
echo Requires Node.js with npm. Expo Go cannot run Viro.
exit /b 0

:setup
where node >nul 2>&1
if errorlevel 1 goto missingnode
where npm >nul 2>&1
if errorlevel 1 goto missingnode
node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major < 22 || (major === 22 && minor < 13)) { console.error('Expo 57 requires Node.js 22.13 or newer.'); process.exit(1); }"
if errorlevel 1 goto failed
echo Installing locked dependencies...
call npm ci
if errorlevel 1 goto failed
call npm run typecheck
if errorlevel 1 goto failed
call npm test
if errorlevel 1 goto failed
if "%AR_BUILD%"=="0" goto start

echo Follow the Expo and Apple account/signing prompts.
echo EAS iPhone builds require Apple Developer Program membership.
echo Set your own ios.bundleIdentifier in app.json before building.
call npx --yes eas-cli@latest whoami
if not errorlevel 1 goto configure
call npx --yes eas-cli@latest login
if errorlevel 1 goto failed

:configure
call npx --yes eas-cli@latest init
if errorlevel 1 goto failed
call npx --yes eas-cli@latest build:configure --platform ios
if errorlevel 1 goto failed
call npx --yes eas-cli@latest device:create
if errorlevel 1 goto failed
call npx --yes eas-cli@latest build --platform ios --profile development --wait
if errorlevel 1 goto failed
echo Install the development build on your registered iPhone using the EAS link.
echo Enable iOS Developer Mode if prompted.

:start
echo Scan the QR code with your iPhone Camera to open the installed PLCR app.
echo Expo Go cannot run this app. For first-time setup, use: run.bat --build
echo Keep the phone and computer on the same Wi-Fi, or use: run.bat --tunnel
call npx expo start --dev-client %AR_CONNECTION%
if errorlevel 1 goto failed
exit /b 0

:missingnode
echo Install Node.js LTS including npm, reopen your terminal, and retry.

:failed
echo The script stopped because a step failed. See the message above.
pause
exit /b 1
