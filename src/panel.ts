import * as vscode from 'vscode';
import { runSprintManager, listSprintFiles, loadTasksFromFile } from './pythonBridge';
import { sendKeysToActive } from './windowsInput';

export class ArcanoPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'arcanoTaskList';
  private currentFile: string | null = null;
  private webviewView: vscode.WebviewView | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly outputChannel: vscode.OutputChannel
  ) {}

  private async fallbackToLanguageModel(task: string) {
    try {
      const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (!model) {
        throw new Error('No Copilot model available');
      }

      const messages = [
        vscode.LanguageModelChatMessage.User([
          new vscode.LanguageModelTextPart(`I need help implementing this task: "${task}". Please provide step-by-step guidance including best practices, error handling, and proper documentation.`)
        ])
      ];
      
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Getting implementation guidance...',
        cancellable: false
      }, async () => {
        const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
        
        let fullResponse = '';
        for await (const text of response.text) {
          fullResponse += text;
        }
        
        await vscode.window.showInformationMessage('Implementation Guidance', { 
          modal: true, 
          detail: fullResponse 
        });
      });

      return true;
    } catch (err) {
      this.outputChannel.appendLine(`Language model error: ${err}`);
      return false;
    }
  }

  private async openTaskInCopilotChat(task: string) {
    try {
      this.outputChannel.appendLine('Sending task to GitHub Copilot Chat...');
      
      // Format the message for Copilot Chat
      const message = `/help I need to implement this task: "${task}". Please help me with:
1. Breaking down the implementation steps
2. Suggesting which files to modify
3. Providing code examples with best practices
4. Including error handling
5. Adding proper documentation`;

      // First, open and focus the Copilot Chat panel
      await vscode.commands.executeCommand('github.copilot.chat.focus');
      
      // Then send the message
      await vscode.commands.executeCommand('github.copilot.chat.sendMessage', message);
      
      this.outputChannel.appendLine('Successfully sent task to Copilot Chat');
      return true;
    } catch (err) {
      this.outputChannel.appendLine(`Error in openTaskInCopilotChat: ${err}`);
      vscode.window.showErrorMessage('Failed to send to Copilot Chat: ' + (err instanceof Error ? err.message : String(err)));
      throw err;
    }
  }

  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.outputChannel.appendLine('Panel view is being resolved...');
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
    };

    const refreshPanel = async () => {
      this.outputChannel.appendLine('Refreshing panel...');
      const files = await listSprintFiles();
      this.outputChannel.appendLine(`Found ${files.length} sprint files`);
      
      let fileOptionsHtml = files.map(f => 
        `<option value="${f}"${this.currentFile === f ? ' selected' : ''}>${f}</option>`
      ).join('');
      
      if (!this.currentFile && files.length > 0) {
        this.currentFile = files[0];
        this.outputChannel.appendLine(`Selected default file: ${this.currentFile}`);
      }

      let tasks = [];
      if (this.currentFile) {
        tasks = await loadTasksFromFile(this.currentFile);
        this.outputChannel.appendLine(`Loaded ${tasks.length} tasks from ${this.currentFile}`);
      }

      const doneCount = tasks.filter((t: any) => t.done).length;
      const totalCount = tasks.length;
      
      const tasksHtml = tasks.map((t: any, i: number) => `
        <div class="task-item ${t.done ? 'done' : ''}" data-index="${i}">
            <label class="checkbox-container">
              <input type="checkbox" class="task-checkbox" ${t.done ? 'checked' : ''}>
              <span class="checkmark"></span>
            </label>
            <span class="task-label">${this.escapeHtml(t.task)}</span>
            <div class="task-buttons">
              <button class="task-button start-chatgpt" ${t.done ? 'disabled' : ''}>
                <span class="button-icon">🎯</span> Plan
              </button>
              <button class="task-button start-copilot" ${t.done ? 'disabled' : ''}>
                <span class="button-icon">💻</span> Code
              </button>
            </div>
          </div>
      `).join('');

      const html = this.getHtml(fileOptionsHtml, tasksHtml, doneCount, totalCount);
      this.outputChannel.appendLine('Generated HTML for webview');
      this.outputChannel.appendLine('HTML length: ' + html.length);

      webviewView.webview.html = html;
    };

    await refreshPanel();
    
    // Set up auto-refresh
    const interval = setInterval(refreshPanel, 10000);
    webviewView.onDidDispose(() => {
      this.outputChannel.appendLine('Panel disposed, clearing interval');
      clearInterval(interval);
    });

    // Message handling
    webviewView.webview.onDidReceiveMessage(async (message) => {
      this.outputChannel.appendLine(`Received message: ${JSON.stringify(message)}`);
      
      switch (message.command) {
        case 'selectFile':
          this.currentFile = message.file;
          await refreshPanel();
          break;        
        case 'startChatGPT': {
          const tasks = await loadTasksFromFile(this.currentFile!);
          const task = tasks[message.index];
          if (task && !task.done) {
            try {
              this.outputChannel.appendLine('Opening chat for planning...');
              
              // First try language model API
              try {
                const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
                if (model) {
                  const planPrompt = `Help me plan this sprint task: "${task.task}". Please provide:
1. Task breakdown into smaller steps
2. Time estimates for each step
3. Key considerations and potential challenges
4. Required resources or dependencies
5. Success criteria`;

                  const messages = [
                    vscode.LanguageModelChatMessage.User([new vscode.LanguageModelTextPart(planPrompt)])
                  ];

                  const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
                  
                  let fullResponse = '';
                  for await (const text of response.text) {
                    fullResponse += text;
                  }
                  
                  await vscode.window.showInformationMessage('Planning Guidance', {
                    modal: true,
                    detail: fullResponse
                  });
                  return;
                }
              } catch (modelErr) {
                this.outputChannel.appendLine(`Language model failed: ${modelErr}, trying chat commands...`);
              }
              
              // Try each chat command in sequence
              const commands = [
                'workbench.action.quickChat.open',
                'chat.open',
                'workbench.action.chat.focus'
              ];
              
              let success = false;
              for (const cmd of commands) {
                try {
                  this.outputChannel.appendLine(`Trying command: ${cmd}`);
                  await vscode.commands.executeCommand(cmd);
                  success = true;
                  break;
                } catch (cmdErr) {
                  this.outputChannel.appendLine(`Command ${cmd} failed: ${cmdErr}`);
                  continue;
                }
              }

              if (!success) {
                throw new Error('All chat commands failed');
              }

              // Wait longer for chat to be ready
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              const planPrompt = `Help me plan this sprint task: "${task.task}". Please provide:
1. Task breakdown into smaller steps
2. Time estimates for each step
3. Key considerations and potential challenges
4. Required resources or dependencies
5. Success criteria`;
              
              await sendKeysToActive(planPrompt);
              this.outputChannel.appendLine(`Started planning for task: ${task.task}`);
            } catch (err) {
              this.outputChannel.appendLine(`Error in planning: ${err}`);
              vscode.window.showErrorMessage('Failed to send to ChatGPT: ' + (err instanceof Error ? err.message : String(err)));
            }
          }
          break;
        }        
        case 'startCopilot': {
          const tasks = await loadTasksFromFile(this.currentFile!);
          const task = tasks[message.index];
          if (task && !task.done) {
            try {
              this.outputChannel.appendLine('Opening Copilot Chat for implementation...');
              
              const message = `/help I need to implement this task: "${task.task}". Please help me with:
1. Breaking down the implementation steps
2. Suggesting which files to modify
3. Providing code examples with best practices
4. Including error handling
5. Adding proper documentation`;

              // First try the language model API approach
              try {
                const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
                if (model) {
                  const response = await model.sendRequest([
                    vscode.LanguageModelChatMessage.User([new vscode.LanguageModelTextPart(message)])
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
              } catch (modelErr) {
                this.outputChannel.appendLine(`Language model failed: ${modelErr}, trying Copilot Chat...`);
              }

              // Make sure Copilot Chat extension is ready
              const copilotExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
              if (!copilotExtension) {
                throw new Error('GitHub Copilot Chat extension not found');
              }

              if (!copilotExtension.isActive) {
                await copilotExtension.activate();
              }

              // Try multiple approaches to open and interact with chat
              const attempts = [
                {
                  name: 'Modern Chat API',
                  action: async () => {
                    await vscode.commands.executeCommand('workbench.action.chatWith', { provider: 'GitHub.copilot' });
                  }
                },
                {
                  name: 'Quick Chat',
                  action: async () => {
                    await vscode.commands.executeCommand('workbench.action.quickChat.open');
                  }
                },
                {
                  name: 'Focus Chat',
                  action: async () => {
                    await vscode.commands.executeCommand('workbench.action.chat.focus');
                  }
                },
                {
                  name: 'Legacy Copilot Commands',
                  action: async () => {
                    await vscode.commands.executeCommand('github.copilot.chat.focus');
                  }
                }
              ];

              let success = false;
              for (const attempt of attempts) {
                try {
                  this.outputChannel.appendLine(`Trying ${attempt.name}...`);
                  await attempt.action();
                  await new Promise(resolve => setTimeout(resolve, 1500)); // Give UI time to respond
                  await sendKeysToActive(message);
                  this.outputChannel.appendLine(`Success with ${attempt.name}`);
                  success = true;
                  break;
                } catch (err) {
                  this.outputChannel.appendLine(`${attempt.name} failed: ${err}`);
                  continue;
                }
              }

              if (!success) {
                // Try one last approach with direct message sending
                try {
                  await vscode.commands.executeCommand('github.copilot.chat.sendMessage', message);
                  success = true;
                } catch (err) {
                  this.outputChannel.appendLine(`Direct message send failed: ${err}`);
                }
              }

              if (!success) {
                throw new Error('All chat approaches failed');
              }

            } catch (err) {
              this.outputChannel.appendLine(`Error in implementation: ${err}`);
              const errorMsg = err instanceof Error ? err.message : String(err);
              vscode.window.showErrorMessage(`Failed to send to Copilot chat: ${errorMsg}. Check if GitHub Copilot is properly installed and authenticated.`);
            }
          }
          break;
        }

        case 'markDone': {
          const tasks = await loadTasksFromFile(this.currentFile!);
          const task = tasks[message.index];
          if (task && !task.done) {
            await runSprintManager(['--done', task.task]);
            await refreshPanel();
            this.outputChannel.appendLine(`Marked task as done: ${task.task}`);
          }
          break;
        }
      }
    });
  }

  private getHtml(fileOptionsHtml: string, tasksHtml: string, done: number, total: number): string {
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <style>
          :root {
            --electric-blue: #00c3ff;
            --silver-white: #e3eafc;
            --dark-bg: #0f2027;
            --blue-glow: #00c3ff44;
          }

          body {
            font-family: 'Segoe UI', sans-serif;
            background: var(--dark-bg);
            color: var(--silver-white);
            margin: 0;
            padding: 1.5em;
          }

          h2 {
            color: var(--electric-blue);
            text-shadow: 0 2px 8px var(--blue-glow);
            margin-top: 0;
            margin-bottom: 1.5em;
          }

          select {
            width: 100%;
            padding: 8px;
            border: 2px solid var(--electric-blue);
            background: rgba(0,0,0,0.3);
            color: var(--silver-white);
            border-radius: 4px;
            margin-bottom: 1.5em;
            font-size: 1em;
            cursor: pointer;
            outline: none;
          }

          select:focus {
            box-shadow: 0 0 0 2px var(--blue-glow);
          }

          .progress {
            margin: 1.5em 0;
          }

          .progress-text {
            display: flex;
            justify-content: space-between;
            margin-bottom: 0.5em;
          }

          .bar-bg {
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
          }

          .bar-fill {
            height: 100%;
            width: ${percent}%;
            background: linear-gradient(90deg, var(--electric-blue) 0%, var(--silver-white) 100%);
            border-radius: 4px;
            transition: width 0.5s ease-in-out;
            box-shadow: 0 0 10px var(--blue-glow);
          }

          .task-list {
            margin: 0;
            padding: 0;
          }

          .task-item {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 1em;
            align-items: center;
            padding: 0.8em;
            margin: 0.5em 0;
            background: rgba(255,255,255,0.05);
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.1);
            transition: all 0.3s ease;
          }

          .task-item:hover {
            background: rgba(255,255,255,0.08);
            border-color: var(--electric-blue);
            transform: translateX(4px);
          }

          .task-item.done {
            opacity: 0.6;
          }

          /* Custom Checkbox */
          .checkbox-container {
            display: block;
            position: relative;
            padding-left: 25px;
            cursor: pointer;
            user-select: none;
          }

          .checkbox-container input {
            position: absolute;
            opacity: 0;
            cursor: pointer;
            height: 0;
            width: 0;
          }

          .checkmark {
            position: absolute;
            top: 0;
            left: 0;
            height: 18px;
            width: 18px;
            background: rgba(255,255,255,0.1);
            border: 2px solid var(--electric-blue);
            border-radius: 4px;
          }

          .checkbox-container:hover input ~ .checkmark {
            background: rgba(255,255,255,0.2);
          }

          .checkbox-container input:checked ~ .checkmark {
            background: var(--electric-blue);
          }

          .checkmark:after {
            content: "";
            position: absolute;
            display: none;
          }

          .checkbox-container input:checked ~ .checkmark:after {
            display: block;
          }

          .checkbox-container .checkmark:after {
            left: 6px;
            top: 2px;
            width: 3px;
            height: 8px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
          }

          .task-label {
            color: var(--silver-white);
            font-size: 1em;
            cursor: pointer;
          }

          .task-buttons {
            display: flex;
            gap: 8px;
          }

          .task-button {
            background: var(--electric-blue);
            color: var(--dark-bg);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.3s ease;
          }

          .task-button:hover {
            transform: scale(1.05);
            box-shadow: 0 0 15px var(--blue-glow);
          }

          .task-button[disabled] {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
          }

          .start-chatgpt {
            background: #10a37f; /* ChatGPT green */
            color: var(--silver-white);
          }

          .start-copilot {
            background: #0d1117; /* GitHub dark */
            color: var(--silver-white);
            border: 1px solid var(--electric-blue);
          }
        </style>
      </head>
      <body>
        <h2>🧠 Arcano Sprint Tasks</h2>
        
        <select id="fileSelect">
          ${fileOptionsHtml}
        </select>

        <div class="progress">
          <div class="progress-text">
            <span>Sprint Progress</span>
            <span>${done} of ${total} tasks (${percent}%)</span>
          </div>
          <div class="bar-bg">
            <div class="bar-fill"></div>
          </div>
        </div>

        <div class="task-list">
          ${tasksHtml}
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          document.getElementById('fileSelect').addEventListener('change', (e) => {
            vscode.postMessage({ 
              command: 'selectFile', 
              file: e.target.value 
            });
          });

          document.querySelectorAll('.task-item').forEach(item => {
            const index = item.dataset.index;
              const checkbox = item.querySelector('.task-checkbox');
            checkbox.addEventListener('change', () => {
              vscode.postMessage({ 
                command: 'markDone', 
                index: parseInt(index) 
              });
            });

            // Task label click now disabled since we have explicit buttons
            const taskLabel = item.querySelector('.task-label');
            taskLabel.style.cursor = 'default';

            // Plan button opens ChatGPT
            const planButton = item.querySelector('.start-chatgpt');
            planButton.addEventListener('click', () => {
              vscode.postMessage({ 
                command: 'startChatGPT', 
                index: parseInt(index) 
              });
            });

            // Code button opens Copilot
            const codeButton = item.querySelector('.start-copilot');
            codeButton.addEventListener('click', () => {
              vscode.postMessage({ 
                command: 'startCopilot', 
                index: parseInt(index) 
              });
            });
          });
        </script>
      </body>
      </html>
    `;
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, m => 
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m] || '')
    );
  }
}
