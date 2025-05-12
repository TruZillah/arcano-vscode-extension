# Arcano Sprint Manager - Smoke Test Guide

This document provides a step-by-step guide for manually testing the Arcano Sprint Manager VS Code extension on both Windows and macOS platforms.

## Prerequisites
1. Visual Studio Code (latest version)
2. GitHub Copilot extension installed and authenticated
3. Python 3.6 or higher installed
4. Arcano Sprint Manager extension installed

## Test Steps

### 1. Extension Activation
- [ ] Open VS Code
- [ ] Verify that Arcano Sprint Manager extension is activated (check for the icon in the activity bar)
- [ ] Open Arcano Sprint Manager panel using the icon or running command "Arcano: Show Panel"

### 2. Sprint File Loading
- [ ] Verify that the sprint files dropdown is populated
- [ ] Select a sprint file from the dropdown
- [ ] Verify that tasks from the selected sprint file are displayed correctly
- [ ] Check that task status (done/not done) is correctly shown

### 3. Marking Tasks as Done
- [ ] Select a task that is not marked as done
- [ ] Click the checkbox to mark it as done
- [ ] Verify that the task is visually updated to show "done" state
- [ ] Refresh the panel (wait for auto-refresh or reload VS Code)
- [ ] Verify that the task remains marked as done

### 4. Sending Tasks to Copilot
#### Planning Flow
- [ ] Select a task that is not marked as done
- [ ] Click the "Plan" button next to the task
- [ ] Verify that GitHub Copilot Chat opens
- [ ] Verify that a planning prompt including the task is sent to Copilot
- [ ] Verify that Copilot responds with planning guidance

#### Implementation Flow
- [ ] Select a task that is not marked as done
- [ ] Click the "Code" button next to the task
- [ ] Verify that GitHub Copilot Chat opens
- [ ] Verify that an implementation prompt including the task is sent to Copilot
- [ ] Verify that Copilot responds with implementation guidance

### 5. Cross-Platform Testing

#### Windows-Specific
- [ ] Run through all steps on a Windows machine
- [ ] Verify that keyboard shortcuts and commands work correctly
- [ ] Check for any Windows-specific error messages

#### macOS-Specific
- [ ] Run through all steps on a macOS machine
- [ ] Verify that keyboard shortcuts and commands work correctly
- [ ] Check for any macOS-specific error messages

## Results

Please document your findings here:

**Windows Test Results:**
- Version tested: _____________
- Date: _____________
- Overall status: ☐ Pass / ☐ Fail
- Issues found:
  1. 
  2.

**macOS Test Results:**
- Version tested: _____________
- Date: _____________
- Overall status: ☐ Pass / ☐ Fail
- Issues found:
  1.
  2.

## Additional Notes

If any issues are found, please include:
1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Screenshots if applicable
5. Error messages from the output panel
