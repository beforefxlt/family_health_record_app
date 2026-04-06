#!/usr/bin/env bash
set -euo pipefail
echo "Starting Release APK build..."
cd mobile_app/android
if [ -f ./gradlew ]; then
  ./gradlew clean assembleRelease -PreactNativeArchitectures=arm64-v8a,x86_64
  APK_PATH=$(realpath ./app/build/outputs/apk/release/app-release.apk)
  echo "Release APK path: $APK_PATH"
else
  echo "gradlew not found; ensure this script is run from the repository root on a Linux/WSL environment" >&2
  exit 1
fi
