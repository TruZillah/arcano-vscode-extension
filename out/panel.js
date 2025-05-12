"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArcanoPanelProvider = void 0;
const vscode = __importStar(require("vscode"));
const pythonBridge_1 = require("./pythonBridge");
class ArcanoPanelProvider {
    context;
    outputChannel;
    static viewType = 'arcanoTaskList';
    currentFile = null;
    webviewView;
    sectionTaskMap = new Map();
    constructor(context, outputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
    }
    /**
     * Gets the currently selected sprint file
     * @returns The filename of the current sprint file, or null if none selected
     */
    getCurrentFile() {
        return this.currentFile;
    }
    async fallbackToLanguageModel(task) {
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
        }
        catch (err) {
            this.outputChannel.appendLine(`Language model error: ${err}`);
            return false;
        }
    }
    async openTaskInCopilotChat(task) {
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
        }
        catch (err) {
            this.outputChannel.appendLine(`Error in openTaskInCopilotChat: ${err}`);
            vscode.window.showErrorMessage('Failed to send to Copilot Chat: ' + (err instanceof Error ? err.message : String(err)));
            throw err;
        }
    }
    async resolveWebviewView(webviewView, _context, _token) {
        this.outputChannel.appendLine('Panel view is being resolved...');
        this.webviewView = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
        };
        const refreshPanel = async () => {
            this.outputChannel.appendLine('Refreshing panel...');
            const files = await (0, pythonBridge_1.listSprintFiles)();
            this.outputChannel.appendLine(`Found ${files.length} sprint files`);
            let fileOptionsHtml = files.map(f => `<option value="${f}"${this.currentFile === f ? ' selected' : ''}>${f}</option>`).join('');
            if (!this.currentFile && files.length > 0) {
                this.currentFile = files[0];
                this.outputChannel.appendLine(`Selected default file: ${this.currentFile}`);
            }
            let tasks = [];
            if (this.currentFile) {
                tasks = await (0, pythonBridge_1.loadTasksFromFile)(this.currentFile);
                this.outputChannel.appendLine(`Loaded ${tasks.length} tasks/sections from ${this.currentFile}`);
            }
            // Count tasks that aren't section headers
            const taskList = tasks.filter(t => t.type === 'task');
            const doneCount = taskList.filter(t => t.done).length;
            const totalCount = taskList.length;
            const html = this.getHtml(fileOptionsHtml, tasks, doneCount, totalCount);
            webviewView.webview.html = html;
        };
        await refreshPanel();
        // Set up auto-refresh
        const interval = setInterval(refreshPanel, 10000);
        webviewView.onDidDispose(() => {
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
                case 'startTask': {
                    const tasks = await (0, pythonBridge_1.loadTasksFromFile)(this.currentFile);
                    // Filter to just tasks (not sections) and find the requested index
                    const taskList = tasks.filter(t => t.type === 'task');
                    const task = taskList[message.index];
                    if (task && !task.done) {
                        try {
                            this.outputChannel.appendLine(`Starting task: ${task.task}`);
                            const success = await this.openTaskInCopilotChat(task.task);
                            if (success) {
                                this.outputChannel.appendLine(`Successfully started task: ${task.task}`);
                            }
                            else {
                                this.outputChannel.appendLine(`Failed to start task: ${task.task}`);
                                vscode.window.showInformationMessage('Unable to start task. Please try again.');
                            }
                        }
                        catch (err) {
                            this.outputChannel.appendLine(`Error starting task: ${err}`);
                            const errorMsg = err instanceof Error ? err.message : String(err);
                            vscode.window.showErrorMessage(`Failed to start task: ${errorMsg}`);
                        }
                    }
                    break;
                }
                case 'toggleTask': {
                    const tasks = await (0, pythonBridge_1.loadTasksFromFile)(this.currentFile);
                    // Filter to just tasks and find the requested index
                    const taskList = tasks.filter(t => t.type === 'task');
                    const task = taskList[message.index];
                    if (task) {
                        try {
                            const newStatus = !task.done;
                            const success = await this.updateTaskInFile(task.task, newStatus);
                            if (success) {
                                task.done = newStatus;
                                await refreshPanel();
                                const status = newStatus ? 'done' : 'undone';
                                this.outputChannel.appendLine(`Toggled task as ${status}: ${task.task}`);
                            }
                            else {
                                vscode.window.showErrorMessage(`Failed to update task in ${this.currentFile}`);
                            }
                        }
                        catch (err) {
                            this.outputChannel.appendLine(`Error toggling task: ${err}`);
                            const errorMsg = err instanceof Error ? err.message : String(err);
                            vscode.window.showErrorMessage(`Failed to toggle task: ${errorMsg}`);
                        }
                    }
                    break;
                }
            }
        });
    }
    getHtml(fileOptionsHtml, tasks, done, total) {
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

          .section-header {
            margin: 2em 0 1em;
            position: relative;
          }

          .section-header h3 {
            color: var(--electric-blue);
            margin: 0;
            font-size: 1.2em;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
            background: var(--dark-bg);
            display: inline-block;
            padding-right: 1em;
            position: relative;
            z-index: 1;
          }

          .section-line {
            position: absolute;
            top: 50%;
            left: 0;
            right: 0;
            height: 1px;
            background: var(--electric-blue);
            opacity: 0.3;
            margin-top: -1px;
            z-index: 0;
          }

          /* Add extra spacing after section headers */
          .section-header + .task-item {
            margin-top: 1em;
          }

          /* Indent tasks under sections */
          .task-item {
            margin-left: 1em;
          }

          .task-section {
            margin: 2em 0;
            border-radius: 8px;
            background: rgba(0, 0, 0, 0.2);
            overflow: hidden;
          }

          .section-header {
            background: rgba(0, 0, 0, 0.3);
            padding: 1em;
            cursor: pointer;
            user-select: none;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: background 0.3s ease;
          }

          .section-header:hover {
            background: rgba(0, 0, 0, 0.4);
          }

          .section-header h3 {
            color: var(--electric-blue);
            margin: 0;
            font-size: 1.1em;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            align-items: center;
            gap: 0.5em;
          }

          .section-header .section-count {
            font-size: 0.8em;
            color: var(--silver-white);
            opacity: 0.7;
            font-weight: normal;
          }

          .section-content {
            padding: 0.5em 1em;
          }

          .section-content .task-item {
            margin-left: 0;
            background: rgba(255, 255, 255, 0.03);
          }

          .section-content .task-item:hover {
            background: rgba(255, 255, 255, 0.05);
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
          ${this.generateSectionedTasksHtml(tasks)}
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
                command: 'toggleTask', 
                index: parseInt(index) 
              });
            });            // Task label click now disabled since we have explicit buttons
            const taskLabel = item.querySelector('.task-label');            taskLabel.style.cursor = 'default';

            // Start Task button initiates the task
            const startTaskButton = item.querySelector('.start-task');
            startTaskButton.addEventListener('click', () => {
              // Disable the button while processing to prevent duplicate clicks
              startTaskButton.disabled = true;
              startTaskButton.innerText = 'Starting...';
              
              vscode.postMessage({ 
                command: 'startTask', 
                index: parseInt(index) 
              });
              
              // Re-enable after a timeout
              setTimeout(() => {
                startTaskButton.disabled = false;
                startTaskButton.innerHTML = '<span class="button-icon">🚀</span> Start Task';
              }, 5000);
            });
          });

          // Function to toggle task completion status
          function toggleTask(index) {
            vscode.postMessage({
              command: 'toggleTask',
              index: index
            });
          }

          // Add section toggle functionality
          document.querySelectorAll('.section-header').forEach(header => {
            header.addEventListener('click', () => {
              const section = header.parentElement;
              const content = section.querySelector('.section-content');
              if (content.style.display === 'none') {
                content.style.display = 'block';
                header.querySelector('.section-icon').textContent = '📂';
              } else {
                content.style.display = 'none';
                header.querySelector('.section-icon').textContent = '📁';
              }
            });
          });
        </script>
      </body>
      </html>
    `;
    }
    generateSectionedTasksHtml(tasks) {
        let currentSection = '';
        let html = '';
        let taskIndex = 0;
        const self = this;
        // Helper function to render an individual task
        function renderTask(task, index) {
            return `
        <div class="task-item ${task.done ? 'done' : ''}" data-index="${index}">
          <label class="checkbox-container">
            <input type="checkbox" class="task-checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${index})">
            <span class="checkmark"></span>
          </label>
          <span class="task-label">${self.escapeHtml(task.task)}</span>
          <div class="task-buttons">
            <button class="task-button start-task" ${task.done ? 'disabled' : ''}>
              <span class="button-icon">🚀</span> Start Task
            </button>
          </div>
        </div>
      `;
        }
        for (const item of tasks) {
            if (item.type === 'section') {
                // If we had tasks in the previous section, close it
                if (currentSection) {
                    html += '</div></div>';
                }
                // Start new section
                const sectionTasks = tasks.filter(t => t.type === 'task' && t.section === item.name);
                const doneCount = sectionTasks.filter(t => t.done).length;
                html += `
          <div class="task-section">
            <div class="section-header">
              <h3>
                <span class="section-icon">📂</span>
                ${self.escapeHtml(item.name)}
              </h3>
              <span class="section-count">${doneCount}/${sectionTasks.length}</span>
            </div>
            <div class="section-content">
        `;
                currentSection = item.name;
            }
            else if (item.type === 'task') {
                // Render task with current index
                html += renderTask(item, taskIndex++);
            }
        }
        // Close last section if needed
        if (currentSection) {
            html += '</div></div>';
        }
        return html;
    }
    escapeHtml(str) {
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m] || ''));
    }
    // Internal function to send keyboard input to the active editor or input box  // Using the imported functions from inputHelper.ts for text insertion and submission
    /**
     * This method exists for backwards compatibility.
     * It now delegates to the extension commands for better reliability.
     */
    async openCopilotChatAndInsertText(task, shouldSubmit = false) {
        try {
            this.outputChannel.appendLine(`Delegating to extension command for task: ${task}`);
            // Call the appropriate command based on whether we're planning or implementing
            if (shouldSubmit) {
                return await vscode.commands.executeCommand('arcano.sendTaskToImplement', task);
            }
            else {
                return await vscode.commands.executeCommand('arcano.sendTaskToPlan', task);
            }
        }
        catch (err) {
            this.outputChannel.appendLine(`Error in openCopilotChatAndInsertText: ${err}`);
            // Show simple error message and return false to indicate failure
            const title = shouldSubmit ? 'Code Implementation' : 'Planning';
            vscode.window.showErrorMessage(`Failed to send task for ${title}. Please try again or check the Copilot Chat extension.`);
            return false;
        }
    }
    /**
     * Updates a task's status in the current markdown file
     */
    async updateTaskInFile(taskText, newStatus) {
        if (!this.currentFile)
            return false;
        // Get workspace folder
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders)
            return false;
        const filePath = vscode.Uri.joinPath(workspaceFolders[0].uri, 'docs', this.currentFile);
        try {
            // Read and parse the file
            const document = await vscode.workspace.openTextDocument(filePath);
            const edit = new vscode.WorkspaceEdit();
            // Search for the task line
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                const lineText = line.text;
                // Look for the exact task with any indentation
                if (lineText.includes(`] ${taskText}`) &&
                    (lineText.includes('[ ]') || lineText.includes('[x]'))) {
                    // Extract indentation
                    const indentation = lineText.match(/^\s*/)?.[0] || '';
                    // Create new line with updated checkbox
                    const newText = `${indentation}- [${newStatus ? 'x' : ' '}] ${taskText}`;
                    // Replace the entire line
                    edit.replace(document.uri, line.range, newText);
                    // Apply the edit
                    const success = await vscode.workspace.applyEdit(edit);
                    if (success) {
                        await document.save();
                        this.outputChannel.appendLine(`Updated task in ${this.currentFile}`);
                        return true;
                    }
                    break;
                }
            }
            return false;
        }
        catch (err) {
            this.outputChannel.appendLine(`Error updating task: ${err}`);
            return false;
        }
    }
    /**
     * Escape special regex characters in a string
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
exports.ArcanoPanelProvider = ArcanoPanelProvider;
