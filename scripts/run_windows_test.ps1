# Run Cross-Platform Smoke Test for Arcano Sprint Manager
# For Windows environments

$ErrorActionPreference = "Stop"

Write-Host "Starting Arcano Sprint Manager Cross-Platform Smoke Test (Windows)..." -ForegroundColor Green

# Check if Python is installed
try {
    $pythonVersion = python --version
    Write-Host "Using $pythonVersion" -ForegroundColor Cyan
}
catch {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.6 or higher" -ForegroundColor Red
    exit 1
}

# Run the cross-platform test script
Write-Host "`nRunning cross-platform test script..." -ForegroundColor Cyan
python "$PSScriptRoot\cross_platform_test.py"

Write-Host "`nTest script completed. Follow the instructions provided above to complete the manual testing." -ForegroundColor Green

# Open test results file for taking notes
$resultsFile = "$PSScriptRoot\..\tests\windows-test-results.md"

if (-not (Test-Path $resultsFile)) {
    @"
# Windows Test Results

Date: $(Get-Date -Format "yyyy-MM-dd")
Tester: 

## System Information
- Windows Version: $(Get-WmiObject -Class Win32_OperatingSystem).Caption
- VS Code Version: 
- GitHub Copilot Version:

## Test Results

| Test | Result | Notes |
|------|--------|-------|
| Extension Activation | | |
| Sprint File Loading | | |
| Task Display | | |
| Mark Task Done | | |
| Send to Copilot - Plan | | |
| Send to Copilot - Code | | |

## Issues Found



## Additional Notes


"@ | Out-File -FilePath $resultsFile -Encoding utf8
}

Write-Host "`nCreated results template at: $resultsFile" -ForegroundColor Cyan
Write-Host "Please document your findings there." -ForegroundColor Cyan

# Try to open the results file
try {
    Start-Process $resultsFile
}
catch {
    Write-Host "Could not automatically open results file. Please open manually: $resultsFile" -ForegroundColor Yellow
}

Write-Host "`nSmoke test procedure complete!" -ForegroundColor Green
