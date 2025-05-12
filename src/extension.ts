import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { runSprintManager, setExtensionContext } from './pythonBridge';
import { ArcanoPanelProvider } from './panel';
import { insertCopilotHint, respondToCopilot, startTaskFlow } from './copilotAssist';
import { sendKeysToActive, submitActiveInput } from './inputHelper';

// Define a type for the design instructions
interface DesignInstructions {
  agentInstructions: {
    general: string;
    taskFormat: string;
  };
  uiPreferences: {
    buttons: {
      style: Record<string, string>;
      icons: Record<string, string>;
    };
    colors: Record<string, string>;
  };
  prompts: {
    taskStart: string;
    contextFormat: string;
  };
}

// Global variable to store design instructions
let designInstructions: DesignInstructions | null = null;

/**
 * Loads design instructions from design.json
 */
async function loadDesignInstructions(context: vscode.ExtensionContext): Promise<DesignInstructions | null> {
  try {
    const designJsonPath = context.asAbsolutePath('docs/design.json');
    const data = await fs.promises.readFile(designJsonPath, 'utf-8');
    const instructions = JSON.parse(data) as DesignInstructions;
    return instructions;
  } catch (err) {
    console.error('Failed to load design instructions:', err);
    vscode.window.showErrorMessage(`Failed to load design instructions: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

/**
 * Formats and displays agent responses in the output channel
 */
class AgentResponseHandler {
  constructor(private outputChannel: vscode.OutputChannel) {}
  
  /**
   * Process and display agent response in the output channel
   * @param response The response text from the agent
   * @param taskName The task that was being worked on
   */
  public displayResponse(response: string, taskName: string): void {
    this.outputChannel.appendLine('\n==================================================');
    this.outputChannel.appendLine(`🤖 Agent Response for Task: ${taskName}`);
    this.outputChannel.appendLine('==================================================\n');
    
    // Format code blocks for better readability
    const formattedResponse = this.formatResponseText(response);
    
    this.outputChannel.appendLine(formattedResponse);
    this.outputChannel.appendLine('\n==================================================\n');
    this.outputChannel.show(true);
  }
  
  /**
   * Format the response text with better code block formatting
   * @param text The response text to format
   */
  private formatResponseText(text: string): string {
    // Highlight code blocks with better formatting
    let formatted = text.replace(/```([a-zA-Z]*)([\s\S]*?)```/g, (match, language, code) => {
      return `\n▶️ Code (${language || 'text'}):\n───────────────────────\n${code.trim()}\n───────────────────────\n`;
    });
    
    // Add bullet point highlighting
    formatted = formatted.replace(/^(\d+\.|\*|\-)\s+(.*)/gm, '• $2');
    
    return formatted;
  }
}

/**
 * Helper for interacting with GitHub Copilot Chat
 */
class CopilotChatHelper {
  constructor(private outputChannel: vscode.OutputChannel) {}

  /**
   * Opens GitHub Copilot Chat
   * @returns true if successful, false otherwise
   */
  async openChat(): Promise<boolean> {
    this.outputChannel.appendLine('Opening GitHub Copilot Chat...');
    
    // Try GitHub Copilot Chat Focus command first
    try {
      await vscode.commands.executeCommand('github.copilot.chat.focus');
      this.outputChannel.appendLine('Successfully opened chat with github.copilot.chat.focus');
      return true;
    } catch (err) {
      this.outputChannel.appendLine(`Failed to open chat with github.copilot.chat.focus: ${err}`);
    }
    
    // Try workbench.action.chatWith command
    try {
      await vscode.commands.executeCommand('workbench.action.chatWith', { provider: 'GitHub.copilot' });
      this.outputChannel.appendLine('Successfully opened chat with workbench.action.chatWith');
      return true;
    } catch (err) {
      this.outputChannel.appendLine(`Failed to open chat with workbench.action.chatWith: ${err}`);
    }
    
    // Try chat.open command
    try {
      await vscode.commands.executeCommand('chat.open');
      this.outputChannel.appendLine('Successfully opened chat with chat.open');
      return true;
    } catch (err) {
      this.outputChannel.appendLine(`Failed to open chat with chat.open: ${err}`);
    }
    
    return false;
  }

  /**
   * Sends a message to GitHub Copilot Chat
   * @param message The message to send
   * @returns true if successful, false otherwise
   */
  async sendMessage(message: string): Promise<boolean> {
    try {
      await this.openChat();
      await vscode.commands.executeCommand('github.copilot.chat.sendMessage', message);
      this.outputChannel.appendLine('Successfully sent message');
      return true;
    } catch (err) {
      this.outputChannel.appendLine(`Error sending message: ${err}`);
      
      try {
        // Fallback approach
        await vscode.commands.executeCommand('github.copilot.chat.insertTextIntoPrompt', message);
        await vscode.commands.executeCommand('github.copilot.chat.acceptInput');
        this.outputChannel.appendLine('Successfully sent message via fallback method');
        return true;
      } catch (fallbackErr) {
        this.outputChannel.appendLine(`Fallback method failed: ${fallbackErr}`);
        return false;
      }
    }
  }
  
  /**
   * Sends a message and captures the response
   * @param message The message to send
   * @param responseHandler The handler for processing the response
   * @param taskName The task being worked on
   * @returns true if successful, false otherwise
   */
  async sendMessageAndCaptureResponse(
    message: string, 
    responseHandler: AgentResponseHandler, 
    taskName: string
  ): Promise<boolean> {
    try {
      // Try to use the language model API to get a direct response
      const response = await this.sendToLanguageModel(message);
      
      if (response) {
        responseHandler.displayResponse(response, taskName);
        return true;
      }
      
      // If that fails, open the chat UI
      await this.openChat();
      await vscode.commands.executeCommand('github.copilot.chat.sendMessage', message);
      this.outputChannel.appendLine('Successfully sent message to Copilot Chat (response will appear in chat UI)');
      return true;
    } catch (err) {
      this.outputChannel.appendLine(`Error sending message and capturing response: ${err}`);
      return false;
    }
  }

  /**
   * Sends a message to GitHub Copilot Language Model API (no UI)
   * @param message The message to send
   * @returns The response text, or null if failed
   */
  async sendToLanguageModel(message: string): Promise<string | null> {
    try {
      const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (!model) {
        this.outputChannel.appendLine('No Copilot model available');
        return null;
      }
      
      const response = await model.sendRequest([
        vscode.LanguageModelChatMessage.User([new vscode.LanguageModelTextPart(message)])
      ], {}, new vscode.CancellationTokenSource().token);
      
      let fullResponse = '';
      for await (const text of response.text) {
        fullResponse += text;
      }
      
      return fullResponse;
    } catch (err) {
      this.outputChannel.appendLine(`Language model error: ${err}`);
      return null;
    }
  }
  
  /**
   * Generates a rich prompt with task, sprint context and design guidelines
   */
  async generateRichPrompt(task: string, sprintFile: string | null = null): Promise<string> {
    try {
      // Start with the basic task prompt
      let prompt = designInstructions?.prompts.taskStart.replace('{task}', task) || 
        `I'm working on this task: "${task}". Please help me implement it.`;
      
      // Add sprint context if available
      let sprintContext = '';
      if (sprintFile) {
        try {
          const docs_path = path.join(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '', 'docs');
          const sprintFilePath = path.join(docs_path, sprintFile);
          const sprintData = await fs.promises.readFile(sprintFilePath, 'utf-8');
          const tasks = JSON.parse(sprintData);
          
          if (Array.isArray(tasks)) {
            sprintContext = tasks.map(t => `- ${t.done ? '[x]' : '[ ]'} ${t.task}`).join('\n');
          }
        } catch (err) {
          this.outputChannel.appendLine(`Error reading sprint file: ${err}`);
        }
      }
      
      // Add design guidelines if available
      let designContext = '';
      if (designInstructions) {
        designContext = `
Agent Instructions:
${designInstructions.agentInstructions.general}
${designInstructions.agentInstructions.taskFormat}

UI Preferences:
- Primary color: ${designInstructions.uiPreferences.colors.electricBlue}
- Background: ${designInstructions.uiPreferences.colors.darkBg}
- Text color: ${designInstructions.uiPreferences.colors.silverWhite}
`;
      }
      
      // Combine everything using the template from design.json if available
      if (designInstructions?.prompts.contextFormat && (sprintContext || designContext)) {
        prompt = designInstructions.prompts.contextFormat
          .replace('{task}', task)
          .replace('{sprintContext}', sprintContext || 'No sprint context available')
          .replace('{designContext}', designContext || 'No design context available');
      }
      
      return prompt;
    } catch (err) {
      this.outputChannel.appendLine(`Error generating rich prompt: ${err}`);
      return `I'm working on this task: "${task}". Please help me implement it.`;
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  const outputChannel = vscode.window.createOutputChannel('Arcano Debug');
  
  // Log extension activation
  outputChannel.appendLine('Arcano extension activating...');
  outputChannel.show();
  
  // Set extension context for pythonBridge
  setExtensionContext(context);
  
  // Load design instructions
  loadDesignInstructions(context).then(instructions => {
    if (instructions) {
      designInstructions = instructions;
      outputChannel.appendLine('Design instructions loaded successfully');
    } else {
      outputChannel.appendLine('Warning: Could not load design instructions');
    }
  });
  
  // Create Copilot helper
  const copilotHelper = new CopilotChatHelper(outputChannel);
  
  // Create agent response handler
  const responseHandler = new AgentResponseHandler(outputChannel);
  
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
      
      const success = await copilotHelper.openChat();
      
      if (!success) {
        vscode.window.showErrorMessage('Failed to open Copilot chat. Please ensure Copilot is properly installed and authenticated.');
      }
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
    
    // New startTask command
    vscode.commands.registerCommand('arcano.startTask', async (taskName: string) => {
      outputChannel.appendLine(`Starting task: ${taskName}`);
      // Delegate to copilotAssist
      const success = await startTaskFlow(taskName, outputChannel);
      outputChannel.appendLine(`Start Task Flow result: ${success}`);
      return success;
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
    }),
    // Register commands for task planning and implementation
    vscode.commands.registerCommand('arcano.sendTaskToPlan', async (task: string) => {
      outputChannel.appendLine(`Sending task to plan: ${task}`);
      
      // Format the planning message
      const message = `I need help planning this sprint task: "${task}". Please help with:
1. Breaking down the task into smaller subtasks
2. Estimating time requirements
3. Identifying potential challenges
4. Suggesting implementation approaches
5. Resource planning and requirements`;
      
      const success = await copilotHelper.sendMessage(message);
      
      if (success) {
        outputChannel.appendLine('Successfully sent planning task to Copilot Chat');
        return true;
      } else {
        // Try to use the language model API as a fallback
        const response = await copilotHelper.sendToLanguageModel(message);
        
        if (response) {
          await vscode.window.showInformationMessage('Planning Guidance', {
            modal: true,
            detail: response
          });
          return true;
        } else {
          vscode.window.showErrorMessage(`Failed to send task for planning: Unable to connect to Copilot Chat`);
          return false;
        }
      }
    }),
    
    vscode.commands.registerCommand('arcano.sendTaskToImplement', async (task: string) => {
      outputChannel.appendLine(`Sending task to implement: ${task}`);
      
      // Format the implementation message
      const message = `/help I need to implement this task: "${task}". Please help me with:
1. Breaking down the implementation steps
2. Suggesting which files to modify
3. Providing code examples with best practices
4. Including error handling
5. Adding proper documentation`;
      
      const success = await copilotHelper.sendMessage(message);
      
      if (success) {
        outputChannel.appendLine('Successfully sent implementation task to Copilot Chat');
        return true;
      } else {
        // Try to use the language model API as a fallback
        const response = await copilotHelper.sendToLanguageModel(message);
        
        if (response) {
          await vscode.window.showInformationMessage('Implementation Guidance', {
            modal: true,
            detail: response
          });
          return true;
        } else {
          vscode.window.showErrorMessage(`Failed to send task for implementation: Unable to connect to Copilot Chat`);
          return false;
        }
      }
    })
  );

  outputChannel.appendLine('Arcano extension activated successfully.');
}

export function deactivate() {}

// Registration of extension commands and functionality continues below
