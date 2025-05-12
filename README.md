# Arcano Sprint Manager

This extension helps you manage your ArcanoFlow sprints inside VS Code with AI assistance.

## Features

- **Sprint Task Management**: View and manage your sprint tasks in a beautiful UI
- **Dual AI Integration**:
  - **ChatGPT Sprint Generation**: Opens ChatGPT to help generate and plan sprints
  - **GitHub Copilot Implementation**: Uses GitHub Copilot Chat for detailed implementation guidance
- **Task Progress Tracking**: Track completion of sprint tasks
- **VS Code Integration**: Seamlessly integrates with your development workflow
- **Cross-platform Support**: Works on both Windows and macOS

## How to Use

1. Open the Arcano Sprint Panel from the activity bar
2. Select a sprint file to view tasks
3. For each task you can:
   - Use "Plan" to get sprint planning assistance with GitHub Copilot
   - Use "Code" to get implementation guidance from GitHub Copilot in VS Code
   - Mark tasks as complete when finished

## Development

### Smoke Testing

The extension includes automated and manual smoke tests to verify functionality:

#### Automated Tests
1. Open the project in VS Code
2. Run the `Run Arcano Smoke Test` launch configuration
3. Check the Debug Console for test results

#### Cross-Platform Tests
- **Windows**: Run `scripts\run_windows_test.ps1` in PowerShell
- **macOS**: Run `scripts/run_macos_test.sh` in Terminal

<!-- For detailed test procedures, see [Smoke Testing Guide](docs/smoke-testing.md) -->

