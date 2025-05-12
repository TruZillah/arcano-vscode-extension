# Arcano Sprint Manager - Smoke Testing Guide

This guide explains how to run smoke tests for the Arcano Sprint Manager VS Code extension.

## Prerequisites

- Visual Studio Code (latest stable version)
- GitHub Copilot extension installed and authenticated
- Node.js installed

## Running Smoke Tests

### Automated Smoke Test

1. Clone the repository
2. Open the repository folder in VS Code
3. Install all dependencies:
   ```
   npm install
   ```
4. Press F5 or go to Run and Debug panel and select "Run Arcano Smoke Test"
5. Check the Debug Console for test results and any errors

The automated smoke test will verify:
- Extension is properly registered and activated
- Commands are registered correctly
- Panel can be opened
- Copilot integration commands are available

### Manual Smoke Test

For a more comprehensive test, follow the manual smoke test guide:

1. Open the file `tests/smoke-test-guide.md`
2. Follow the steps in the guide to manually test all features
3. Record your findings in the results section

Important areas to test manually:
- Task loading from sprint files
- Marking tasks as done
- Sending tasks to GitHub Copilot for planning
- Sending tasks to GitHub Copilot for implementation
- Cross-platform compatibility (Windows and macOS)

## Reporting Issues

If you encounter any issues during testing, please report them by:

1. Capturing any error messages from the VS Code Output panel (Arcano Debug)
2. Taking screenshots of the issue if applicable
3. Noting the steps to reproduce the issue
4. Filing an issue in the GitHub repository with the above details
