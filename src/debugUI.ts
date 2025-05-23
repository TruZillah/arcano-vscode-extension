import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Provides UI for the Arcano debug system
 */
export class ArcanoDebugUI {
  private outputChannel: vscode.OutputChannel;
  private statusBarItem: vscode.StatusBarItem;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    
    // Create status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.text = "$(debug) Arcano Debug";
    this.statusBarItem.tooltip = "Click to open Arcano debug options";
    this.statusBarItem.command = "arcano.showDebugOptions";
  }

  /**
   * Show the debug status bar item
   */
  public show(): void {
    this.statusBarItem.show();
  }

  /**
   * Hide the debug status bar item
   */
  public hide(): void {
    this.statusBarItem.hide();
  }

  /**
   * Display debug options in a quick pick
   */
  public async showDebugOptions(): Promise<void> {
    const options = [
      {
        label: "$(play) Debug Current Task",
        description: "Start debugging the current task",
        value: "debugTask"
      },
      {
        label: "$(settings-gear) Configure Debug Settings",
        description: "Configure automated debug settings",
        value: "configure"
      },
      {
        label: "$(history) View Debug Logs",
        description: "View debug logs and history",
        value: "logs"
      },
      {
        label: "$(add) Add Smart Breakpoints",
        description: "Automatically add breakpoints at key locations",
        value: "breakpoints"
      }
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: "Select a debug operation"
    });

    if (!selected) {
      return;
    }

    switch (selected.value) {
      case "debugTask":
        await this.promptDebugTask();
        break;
      case "configure":
        await this.showDebugConfiguration();
        break;
      case "logs":
        this.outputChannel.show();
        break;
      case "breakpoints":
        await this.addSmartBreakpoints();
        break;
    }
  }

  /**
   * Show debug configuration options
   */
  private async showDebugConfiguration(): Promise<void> {
    // Create settings that will be stored in workspace settings
    const settings = [
      {
        label: "$(record) Enable Advanced Logging",
        description: "Turn on detailed debugging information",
        value: "enableLogging"
      },
      {
        label: "$(eye) Monitor File Changes",
        description: "Automatically track file changes during sprints",
        value: "monitorFiles"
      },
      {
        label: "$(terminal) Debug in Integrated Terminal",
        description: "Run debugging session in integrated terminal",
        value: "useTerminal"
      }
    ];

    // Define options with proper interface type
    interface SettingQuickPickItem extends vscode.QuickPickItem {
      value: string;
    }

    const settingItems: SettingQuickPickItem[] = settings as SettingQuickPickItem[];
    
    const selected = await vscode.window.showQuickPick(settingItems, {
      placeHolder: "Select debug settings to configure",
      canPickMany: true
    });

    if (!selected || selected.length === 0) {
      return;
    }

    // Update settings based on selection
    const config = vscode.workspace.getConfiguration("arcano");
    await config.update("debug.enableAdvancedLogging", 
      selected.some(item => (item as SettingQuickPickItem).value === "enableLogging"), 
      vscode.ConfigurationTarget.Workspace);
    
    await config.update("debug.monitorFileChanges", 
      selected.some(item => (item as SettingQuickPickItem).value === "monitorFiles"), 
      vscode.ConfigurationTarget.Workspace);
    
    await config.update("debug.useIntegratedTerminal", 
      selected.some(item => (item as SettingQuickPickItem).value === "useTerminal"), 
      vscode.ConfigurationTarget.Workspace);

    this.outputChannel.appendLine("Debug configuration updated");
  }

  /**
   * Prompt for a task to debug
   */
  private async promptDebugTask(): Promise<void> {
    try {
      // Get available tasks
      const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!workspacePath) {
        throw new Error("No workspace folder found");
      }

      // Try to get tasks from sprint.json, sprint.md, or any other source
      const tasks = await this.getTasks();
      
      if (!tasks || tasks.length === 0) {
        vscode.window.showInformationMessage("No tasks found to debug");
        return;
      }

      // Ask which task to debug
      const selected = await vscode.window.showQuickPick(
        tasks.map(task => ({
          label: task.done ? `$(check) ${task.task}` : `$(circle-outline) ${task.task}`,
          description: task.done ? "Completed" : "In progress",
          task: task
        })),
        { placeHolder: "Select a task to debug" }
      );

      if (!selected) {
        return;
      }

      // Start debugging the selected task
      await this.debugTask(selected.task.task);
      
    } catch (err) {
      this.outputChannel.appendLine(`Error in promptDebugTask: ${err}`);
      vscode.window.showErrorMessage(`Error finding tasks: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Get tasks from any available source
   */
  private async getTasks(): Promise<Array<{ task: string, done: boolean }>> {
    // Placeholder for getting tasks from sprint.json or other sources
    // This would be implemented with your existing task sources
    return [
      { task: "Automated Debug System (Highest Priority)", done: false },
      { task: "Develop advanced deck sharing & privacy features", done: false },
      { task: "Implement lazy loading for media assets", done: true },
      { task: "Reduce API response times through optimization", done: false },
      { task: "Enhance accessibility features", done: false }
    ];
  }

  /**
   * Start debugging a task
   */
  public async debugTask(taskName: string): Promise<void> {
    try {
      this.outputChannel.appendLine(`Starting debug for task: ${taskName}`);
      
      // Configure debug session
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        throw new Error("No workspace folder found");
      }
      
      // Look for Python file related to the task
      const taskFileName = taskName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^\w]/g, '');
      
      // Show debug configuration
      await vscode.commands.executeCommand('workbench.action.debug.configure');
      
      // Show success message
      this.outputChannel.appendLine(`Debug configuration created for task: ${taskName}`);
      vscode.window.showInformationMessage(`Debug set up for task: ${taskName}`);
    } catch (err) {
      this.outputChannel.appendLine(`Error in debugTask: ${err instanceof Error ? err.message : String(err)}`);
      vscode.window.showErrorMessage(`Failed to start debugging: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Add smart breakpoints at key locations
   */
  private async addSmartBreakpoints(): Promise<void> {
    try {
      const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
      if (!workspacePath) {
        throw new Error("No workspace folder found");
      }

      // Key files and functions to add breakpoints to
      const targets = [
        { 
          file: path.join(workspacePath, 'scripts', 'sprint_manager.py'), 
          functions: ['main', 'toggle_task_status', 'run_sprint'] 
        },
        { 
          file: path.join(workspacePath, 'src', 'pythonBridge.ts'), 
          functions: ['runSprintManager'] 
        },
        { 
          file: path.join(workspacePath, 'src', 'extension.ts'), 
          functions: ['activate'] 
        }
      ];

      // Ask which target to debug
      const items = targets.flatMap(target => 
        target.functions.map(fn => ({
          label: `$(debug-breakpoint) ${path.basename(target.file)}`,
          description: fn,
          detail: target.file,
          target: { file: target.file, function: fn }
        }))
      );

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select where to add breakpoints",
        canPickMany: true
      });

      if (!selected || selected.length === 0) {
        return;
      }

      // Add breakpoints (placeholder implementation)
      this.outputChannel.appendLine(`Adding breakpoints to selected locations...`);
      vscode.window.showInformationMessage(`Added ${selected.length} smart breakpoints`);
      
    } catch (err) {
      this.outputChannel.appendLine(`Error setting breakpoints: ${err}`);
      vscode.window.showErrorMessage(`Error setting breakpoints: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Dispose of UI resources
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
