# Arcano Sprint Manager

This extension helps you manage your ArcanoFlow sprints inside VS Code with AI assistance.

## What's New in Version 1.0.7

- **Automated Debug System**: New comprehensive debugging system for sprint tasks
- **Debug UI Integration**: Status bar integration with quick access to debug tools
- **Smart Breakpoints**: Intelligent management of breakpoints for key functions
- **Task-Aware Debugging**: Debug sessions are context-aware of the current task
- **Advanced Logging**: Configurable verbosity levels for detailed troubleshooting
- **Debug Configuration Settings**: Customize your debugging experience
- **Task Status Tracking**: Enhanced tracking with timestamps and related files
- **Documentation**: Added detailed documentation in [docs/automated_debug_system.md](docs/automated_debug_system.md)

## What's New in Version 1.0.5

- **Enhanced UI Design**: Modern, sleek visual design aligned with the Arcano brand identity
- **Improved Task Layout**: Better task item layout with consistent right-aligned buttons
- **Visual Effects**: Subtle animations and transitions for a more polished experience
- **Progress Bar**: Visual progress indicator for sprint completion
- **Section Counters**: Clear display of completed tasks count in each section (e.g., "2/5")
- **Comprehensive Documentation**: Added UI enhancement documentation
- **Optimized Package Size**: Reduced extension size with improved .vscodeignore configuration

## What's New in Version 1.0.4

- **Fixed Section Collapse State**: Sections now maintain their collapsed/expanded state when toggling tasks
- **State Persistence**: Task sections remain collapsed when marking tasks as done/undone

## What's New in Version 1.0.3

- **Multiple UI Improvements**: Enhanced section rendering and task management experience
- **Fixed Visual Artifacts**: Resolved issues with task display in dark themes

## What's New in Version 1.0.2

- **Enhanced Copilot Task Integration**: Fixed compatibility issues with the latest GitHub Copilot extension
- **Improved API Commands**: Using direct VS Code API commands instead of keyboard simulation
- **Multiple Fallback Methods**: Added several fallback methods to ensure task integration works reliably
- **Documentation**: Added detailed documentation about the Start Task button implementation

## What's New in Version 1.0.1

- **Improved GitHub Copilot Integration**: Fixed issues with the Copilot Chat API integration
- **Enhanced Task Handling**: More reliable method for sending tasks to GitHub Copilot
- **Better Compatibility**: Works with the latest versions of VS Code and GitHub Copilot

## Features

- **Sprint Task Management**: View and manage your sprint tasks in a beautiful UI
- **Dual AI Integration**:
  - **ChatGPT Sprint Generation**: Opens ChatGPT to help generate and plan sprints
  - **GitHub Copilot Implementation**: Uses GitHub Copilot Chat for detailed implementation guidance
- **Task Progress Tracking**: Track completion of sprint tasks
- **VS Code Integration**: Seamlessly integrates with your development workflow
- **Cross-platform Support**: Works on both Windows and macOS

## Notice

This extension is proprietary. All rights reserved. Redistribution, modification, or reverse engineering is strictly prohibited.

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



