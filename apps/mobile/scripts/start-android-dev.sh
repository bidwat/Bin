#!/usr/bin/env bash
set -euo pipefail

adb reverse --remove-all || true
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000

export REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1
export EXPO_PUBLIC_API_BASE_URL_NATIVE=http://127.0.0.1:3000
export EXPO_PACKAGER_PROXY_URL=exp://127.0.0.1:8081

echo "Using packager host: 127.0.0.1"

exec expo start -c --host localhost --android
