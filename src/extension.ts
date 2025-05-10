import * as vscode from 'vscode';
import { runSprintManager } from './pythonBridge';
import { ArcanoPanelProvider } from './panel';
import { insertCopilotHint, respondToCopilot } from './copilotAssist';
import { sendKeysToActive } from './windowsInput';

export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel('Arcano Debug');
  
  // Log extension activation
  outputChannel.appendLine('Arcano extension activating...');
  outputChannel.show();

  // Register the ArcanoPanelProvider for the sidebar view
  const provider = new ArcanoPanelProvider(context, outputChannel);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      ArcanoPanelProvider.viewType,
      provider
    )
  );

  // Register debug command
  context.subscriptions.push(
    vscode.commands.registerCommand('arcano.showDebugOutput', () => {
      outputChannel.show();
    })
  );

  // Register Copilot-related commands
  context.subscriptions.push(
    vscode.commands.registerCommand('arcano.showCopilot', async () => {
      outputChannel.appendLine('Opening GitHub Copilot Chat...');
      
      // Try Language Model API first
      try {
        const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
        if (model) {
          outputChannel.appendLine('Successfully connected to Copilot model');
          return;
        }
      } catch (modelErr) {
        outputChannel.appendLine(`Language model initialization failed: ${modelErr}`);
      }
      
      // Try each chat command in sequence
      const commands = [
        'github.copilot.chat.focus',
        'workbench.action.chatWith',
        'chat.open'
      ];
      
      for (const cmd of commands) {
        try {
          if (cmd === 'workbench.action.chatWith') {
            await vscode.commands.executeCommand(cmd, { provider: 'GitHub.copilot' });
          } else {
            await vscode.commands.executeCommand(cmd);
          }
          outputChannel.appendLine(`Successfully opened chat with command: ${cmd}`);
          return;
        } catch (cmdErr) {
          outputChannel.appendLine(`Command ${cmd} failed: ${cmdErr}`);
          continue;
        }
      }
      
      vscode.window.showErrorMessage('Failed to open Copilot chat. Please ensure Copilot is properly installed and authenticated.');
    }),
    
    vscode.commands.registerCommand('arcano.sendToCopilot', async (message: string) => {
      outputChannel.appendLine(`Sending message to Copilot: ${message}`);
      
      try {
        // Format the message
        const formattedMessage = `/help I need to implement this task: "${message}". Please help me with:
1. Breaking down the implementation steps
2. Suggesting which files to modify
3. Providing code examples with best practices
4. Including error handling
5. Adding proper documentation`;

        // Try Language Model API first
        try {
          const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
          if (model) {
            const response = await model.sendRequest([
              vscode.LanguageModelChatMessage.User([new vscode.LanguageModelTextPart(formattedMessage)])
            ], {}, new vscode.CancellationTokenSource().token);

            let fullResponse = '';
            for await (const text of response.text) {
              fullResponse += text;
            }

            await vscode.window.showInformationMessage('Implementation Guidance', {
              modal: true,
              detail: fullResponse
            });
            return;
          }
        } catch (lmErr) {
          outputChannel.appendLine(`Language Model API failed: ${lmErr}, trying chat commands...`);
        }

        // Try each chat command in sequence
        const commands = [
          'github.copilot.chat.focus',
          'workbench.action.chatWith',
          'chat.open'
        ];
        
        let success = false;
        for (const cmd of commands) {
          try {
            outputChannel.appendLine(`Trying command: ${cmd}`);
            if (cmd === 'workbench.action.chatWith') {
              await vscode.commands.executeCommand(cmd, { provider: 'GitHub.copilot' });
            } else {
              await vscode.commands.executeCommand(cmd);
            }
            success = true;
            break;
          } catch (cmdErr) {
            outputChannel.appendLine(`Command ${cmd} failed: ${cmdErr}`);
            continue;
          }
        }

        if (!success) {
          throw new Error('All chat commands failed');
        }

        // Wait longer for chat to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        await sendKeysToActive(formattedMessage);
        
        outputChannel.appendLine('Message sent successfully');
      } catch (err) {
        outputChannel.appendLine(`Error sending to Copilot chat: ${err}`);
        vscode.window.showErrorMessage('Failed to send message to Copilot. Please ensure Copilot is properly installed and authenticated.');
      }
    })
  );

  // Register commands
  // Register the Copilot assist command
  context.subscriptions.push(
    vscode.commands.registerCommand('arcano.copilotAssist', async (taskLabel: string) => {
      await insertCopilotHint(taskLabel);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('arcano.startSprint', async () => {
      const sprintName = await vscode.window.showInputBox({
        prompt: 'Enter sprint name to run',
        placeHolder: 'e.g. Deck Sharing'
      });
      if (sprintName) {
        await runSprintManager(['--sprint', sprintName]);
        vscode.window.showInformationMessage(`Sprint '${sprintName}' run.`);
      }
    }),
    vscode.commands.registerCommand('arcano.markTaskDone', async () => {
      const taskName = await vscode.window.showInputBox({
        prompt: 'Enter exact task name to mark as done',
        placeHolder: 'Paste or type the full task name'
      });
      if (taskName) {
        await runSprintManager(['--done', taskName]);
        vscode.window.showInformationMessage(`Task marked as done: ${taskName}`);
      }
    }),
    vscode.commands.registerCommand('arcano.showProgress', async () => {
      const output = await runSprintManager(['--status']);
      vscode.window.showInformationMessage(output);
    }),
    vscode.commands.registerCommand('arcano.runPanel', async () => {
      await vscode.commands.executeCommand('workbench.view.extension.arcanoViewContainer');
    }),
    vscode.commands.registerCommand('arcano.copilotHint', async (taskLabel: string) => {
      await insertCopilotHint(taskLabel);
    }),
    vscode.commands.registerCommand('arcano.copilotRespond', async (context: { question: string, task: string }) => {
      await respondToCopilot(context);
    })
  );

  outputChannel.appendLine('Arcano extension activated successfully.');
}

export function deactivate() {}
