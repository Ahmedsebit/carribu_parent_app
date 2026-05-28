#!/usr/bin/env pwsh
# Build APK using EAS Build (Expo Application Services)
#
# Prerequisites:
#   1. Install EAS CLI: npm install -g eas-cli
#   2. Login to Expo: eas login
#
# Usage:
#   ./build-apk.ps1              # Build preview APK (default)
#   ./build-apk.ps1 -Profile production  # Build production AAB

param(
    [ValidateSet("preview", "production", "development")]
    [string]$Profile = "preview"
)

Write-Host "=== Carribu Parent App - APK Build ===" -ForegroundColor Cyan
Write-Host ""

# Check if eas-cli is installed
$easPath = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easPath) {
    Write-Host "EAS CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g eas-cli
    if (-not $?) {
        Write-Host "Failed to install EAS CLI." -ForegroundColor Red
        exit 1
    }
}

# Check if user is logged in
Write-Host "Checking EAS login status..." -ForegroundColor Yellow
eas whoami 2>$null
if (-not $?) {
    Write-Host "Not logged in. Please log in to your Expo account:" -ForegroundColor Yellow
    eas login
    if (-not $?) {
        Write-Host "Login failed." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Starting EAS Build with profile: $Profile" -ForegroundColor Green
Write-Host "Platform: Android" -ForegroundColor Green
Write-Host ""

eas build --platform android --profile $Profile

if ($?) {
    Write-Host ""
    Write-Host "Build submitted successfully!" -ForegroundColor Green
    Write-Host "You can check build status at: https://expo.dev" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "Build failed. Check the output above for errors." -ForegroundColor Red
    exit 1
}
