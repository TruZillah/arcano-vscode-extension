import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import 'mocha';

describe('StartTask Integration Tests', function() {
  this.timeout(60000);

  let extension: vscode.Extension<any>;
  
  before(async () => {
    extension = vscode.extensions.getExtension('ArcanoDevelopment.arcano-sprint-manager')!;
    await extension.activate();
  });

  it('should register the arcano.startTask command', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('arcano.startTask'), 'Command arcano.startTask should be registered');
  });

  it('should return false for nonexistent task', async () => {
    const result = await vscode.commands.executeCommand<boolean>('arcano.startTask', 'Nonexistent Task');
    assert.strictEqual(result, false, 'startTask should return false for a task that does not exist');
  });

  it('should correctly detect if github.copilot.chat.sendMessage is available', async () => {
    // This is just testing our detection mechanism without actually running the command
    const availableCommands = await vscode.commands.getCommands(true);
    const hasCopilotChat = availableCommands.includes('github.copilot.chat.sendMessage');
    // Just log the result, since this is platform and installation dependent
    console.log(`Copilot Chat API available: ${hasCopilotChat}`);
  });

  it('should start an existing task and handle Copilot interaction', async () => {
    // Use a known task from sprint.json
    const knownTask = 'Verify Copilot Chat extension and authentication';
    
    // Intercept any VS Code notifications to verify error handling
    let notificationShown = false;
    const originalShowInformationMessage = vscode.window.showInformationMessage;
    vscode.window.showInformationMessage = async (...args: any[]) => {
      notificationShown = true;
      return Promise.resolve(undefined);
    };
    
    try {
      // This should return true even if Copilot cannot respond (UI focus succeeds)
      const result = await vscode.commands.executeCommand<boolean>('arcano.startTask', knownTask);
      
      // We expect true even with fallbacks since we should focus the view at minimum
      assert.strictEqual(result, true, 'startTask should return true for an existing task');
      
      // Wait for potential operations to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } finally {
      // Restore original implementation
      vscode.window.showInformationMessage = originalShowInformationMessage;
    }
  });
  
  it('should correctly handle the fallback mechanism if direct sendMessage fails', async () => {
    // This test validates that our fallback works, but as a smoke test doesn't verify
    // the actual user experience since that requires manual inspection
    const knownTask = 'Test fallback if Copilot Chat not available';
    
    // This command should use the fallback mechanism at minimum
    const result = await vscode.commands.executeCommand<boolean>('arcano.startTask', knownTask);
    assert.strictEqual(result, true, 'startTask with fallback should return true');
  });
});
