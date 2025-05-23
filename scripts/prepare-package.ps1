# Package Preparation Script for Arcano Sprint Manager
# Run this script before packaging the extension to ensure optimal size and performance

# Ensure we're in the right directory
$currentDir = Get-Location
Write-Host "Current directory: $currentDir" -ForegroundColor Cyan

# Ensure typescript is compiled
Write-Host "Compiling TypeScript..." -ForegroundColor Yellow
npm run compile

# Clean backup files
Write-Host "Cleaning backup files..." -ForegroundColor Yellow
Remove-Item -Path ".\src\*.bak" -ErrorAction SilentlyContinue
Remove-Item -Path ".\src\*.backup" -ErrorAction SilentlyContinue
Remove-Item -Path ".\src\*.bkup" -ErrorAction SilentlyContinue
Remove-Item -Path ".\src\*.broken" -ErrorAction SilentlyContinue
Remove-Item -Path ".\src\*.ts.new" -ErrorAction SilentlyContinue

# Check if there are any development-only files that should be removed
Write-Host "Checking for development-only files..." -ForegroundColor Yellow
$devFiles = Get-ChildItem -Path ".\src\*.ts.*" -ErrorAction SilentlyContinue
if ($devFiles) {
    Write-Host "Found development files that will be excluded from package:" -ForegroundColor Magenta
    foreach ($file in $devFiles) {
        Write-Host "  - $($file.Name)" -ForegroundColor Gray
    }
}

# Verify the .vscodeignore file
Write-Host "Verifying .vscodeignore file..." -ForegroundColor Yellow
if (Test-Path -Path ".\.vscodeignore") {
    Write-Host ".vscodeignore file found. Contents:" -ForegroundColor Green
    Get-Content -Path ".\.vscodeignore" | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host ".vscodeignore file not found!" -ForegroundColor Red
}

# Check package.json version
$packageJson = Get-Content -Path ".\package.json" -Raw | ConvertFrom-Json
Write-Host "Current package version: $($packageJson.version)" -ForegroundColor Green

# Verify icon path
$iconPath = $packageJson.icon
if (Test-Path -Path $iconPath) {
    Write-Host "Icon file found at: $iconPath" -ForegroundColor Green
} else {
    Write-Host "WARNING: Icon file not found at: $iconPath" -ForegroundColor Red
}

# Instructions for packaging
Write-Host "`nTo package the extension, run:" -ForegroundColor Cyan
Write-Host "vsce package" -ForegroundColor Yellow

# Check if vsce is installed
$vsceInstalled = $null
try {
    $vsceInstalled = vsce --version
} catch {
    $vsceInstalled = $null
}

if ($vsceInstalled) {
    Write-Host "vsce is installed (version: $vsceInstalled)" -ForegroundColor Green
} else {
    Write-Host "vsce not found. Install it with: npm install -g vsce" -ForegroundColor Red
}

Write-Host "`nPackage preparation complete!" -ForegroundColor Cyan
