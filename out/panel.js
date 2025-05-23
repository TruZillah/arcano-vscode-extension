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
    constructor(context, outputChannel) {
        this.context = context;
        this.outputChannel = outputChannel;
        this.currentFile = null;
        // --- preserved UI state ---
        this.collapsedSections = new Map();
        this.lastToggledTaskIndex = null;
        const saved = this.context.globalState.get('arcano.collapsedSections');
        if (saved) {
            Object.entries(saved).forEach(([sec, val]) => this.collapsedSections.set(sec, val));
        }
    }
    resolveWebviewView(webviewView, _context, _token) {
        this.webviewView = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'selectFile':
                    this.currentFile = message.file;
                    await this.refreshPanel();
                    return;
                case 'toggleSection':
                    this.toggleSectionState(message.section);
                    await this.refreshPanel();
                    return;
                case 'toggleTask':
                    this.lastToggledTaskIndex = message.index;
                    await this.handleTaskToggle(message.index);
                    return;
                case 'startTask':
                    await this.handleStartTask(message.index);
                    return;
            }
        });
        this.refreshPanel();
    }
    async refreshPanel() {
        if (!this.webviewView) {
            return;
        }
        const files = await (0, pythonBridge_1.listSprintFiles)();
        if (!this.currentFile && files.length) {
            this.currentFile = files[0];
        }
        const items = this.currentFile
            ? await (0, pythonBridge_1.loadTasksFromFile)(this.currentFile)
            : [];
        const allTasks = items.filter((i) => i.type === 'task');
        const doneCount = allTasks.filter((t) => t.done).length;
        const totalCount = allTasks.length;
        const html = this.getHtml(this.generateFileOptionsHtml(files), items, doneCount, totalCount);
        this.webviewView.webview.html = html;
        if (this.lastToggledTaskIndex !== null) {
            this.webviewView.webview.postMessage({
                command: 'scrollToTask',
                index: this.lastToggledTaskIndex,
            });
            this.lastToggledTaskIndex = null;
        }
    }
    toggleSectionState(section) {
        const prev = this.collapsedSections.get(section) || false;
        this.collapsedSections.set(section, !prev);
        this.context.globalState.update('arcano.collapsedSections', Object.fromEntries(this.collapsedSections.entries()));
    }
    async handleTaskToggle(index) {
        if (!this.currentFile) {
            return;
        }
        const items = await (0, pythonBridge_1.loadTasksFromFile)(this.currentFile);
        const tasks = items.filter((i) => i.type === 'task');
        const task = tasks[index];
        if (!task) {
            return;
        }
        const newStatus = !task.done;
        const success = await this.updateTaskInFile(task.task, newStatus);
        if (success) {
            this.outputChannel.appendLine(`Toggled "${task.task}" → ${newStatus ? '✅ done' : '↩️ undone'}`);
            await this.refreshPanel();
        }
        else {
            vscode.window.showErrorMessage(`Failed to update "${task.task}"`);
        }
    }
    async handleStartTask(index) {
        if (!this.currentFile) {
            return;
        }
        const items = await (0, pythonBridge_1.loadTasksFromFile)(this.currentFile);
        const tasks = items.filter((i) => i.type === 'task');
        const task = tasks[index];
        if (!task) {
            return;
        }
        await this.openTaskInCopilotChat(task.task);
        this.webviewView?.webview.postMessage({ command: 'animateStart', index });
    }
    getHtml(fileOptionsHtml, items, done, total) {
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />  <style>
    /* Arcano CSS variables */
    :root {
      --electric-blue: #00c3ff;
      --silver-white: #e3eafc;
      --dark-bg: #0f2027;
      --blue-glow: #00c3ff44;
      --card-bg: rgba(255, 255, 255, 0.06);
      --hover-bg: rgba(255, 255, 255, 0.1);
    }

    body {
      background: var(--dark-bg);
      background-image: linear-gradient(145deg, #0f2027 0%, #162236 100%);
      color: var(--silver-white);
      font-family: var(--vscode-font-family);
      padding: 16px;
      min-height: 100vh;
      margin: 0;
    }
    
    h2 {
      margin-top: 0;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 0.5em;
      color: var(--electric-blue);
      text-shadow: 0 0 15px var(--blue-glow);
      font-size: 1.4rem;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    
    label[for="fileSelect"] {
      display: block;
      margin-bottom: 6px;
      font-size: 0.9rem;
      opacity: 0.8;
    }
    
    select {
      width: 100%;
      padding: 8px 10px;
      border-radius: 4px;
      background-color: rgba(0,0,0,0.2);
      color: var(--silver-white);
      border: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 16px;
      outline: none;
      transition: all 0.2s ease;
    }
    
    select:focus, select:hover {
      border-color: var(--electric-blue);
      box-shadow: 0 0 0 2px var(--blue-glow);
    }
    
    .tasks {
      margin-top: 16px;
    }

    .task-section {
      margin: 1.2em 0;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      border: 1px solid rgba(0,195,255,0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    
    .task-section:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,195,255,0.2);
    }
    
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      padding: 10px 16px;
      background: rgba(0, 195, 255, 0.1);
      backdrop-filter: blur(5px);
      border-bottom: 1px solid rgba(0,195,255,0.15);
      transition: background 0.2s ease;
    }
    
    .section-header:hover {
      background: rgba(0, 195, 255, 0.15);
    }
      .section-header span {
      color: var(--electric-blue);
      font-size: 12px;
      margin-right: 8px;
      transition: transform 0.3s ease;
    }
    
    .section-header strong {
      font-weight: 500;
      font-size: 0.95rem;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: var(--electric-blue);
    }
    
    .section-header .section-count {
      font-size: 0.85rem;
      color: var(--silver-white);
      opacity: 0.7;
      margin-left: auto;
      padding-left: 8px;
    }
    
    .section-body {
      transition: all .3s ease;
      overflow: hidden;
      background: var(--card-bg);
      padding: 8px;
    }
    
    .task-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      margin-bottom: 4px;
      border-radius: 4px;
      background: rgba(0,0,0,0.2);
      transition: background 0.2s ease, transform 0.2s ease;
      border: 1px solid transparent;
    }
    
    .task-item:hover {
      background: var(--hover-bg);
      border-color: rgba(0,195,255,0.1);
      transform: translateX(2px);
    }
    
    .task-item label {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      margin-right: 8px;
    }
    
    .task-item input[type="checkbox"] {
      margin-right: 8px;
      accent-color: var(--electric-blue);
    }
    
    .task-item.done label {
      opacity: 0.6;
      text-decoration: line-through;
      color: rgba(227, 234, 252, 0.6);
    }

    .start-btn {
      background: var(--electric-blue);
      color: var(--dark-bg);
      border: none;
      padding: 6px 10px;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .start-btn:hover:not([disabled]) {
      transform: scale(1.05);
      box-shadow: 0 0 10px var(--blue-glow);
    }
    
    .start-btn:active:not([disabled]) {
      transform: scale(0.98);
    }
    
    .start-btn:disabled {
      background: #666;
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
    }
      .start-btn.starting {
      animation: glow 0.6s ease-in-out;
    }
    
    @keyframes glow {
      from { box-shadow: 0 0 0px var(--blue-glow); }
      50% { box-shadow: 0 0 15px var(--blue-glow); }
      to { box-shadow: 0 0 5px var(--blue-glow); }
    }
    
    .progress {
      margin-top: 20px;
      margin-bottom: 24px;
    }
    
    .progress-text {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 0.9rem;
      color: var(--silver-white);
      opacity: 0.9;
    }
    
    .progress-bar-container {
      height: 6px;
      background: rgba(255,255,255,0.1);
      border-radius: 4px;
      overflow: hidden;
    }
    
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--electric-blue) 0%, rgba(0,195,255,0.7) 100%);
      border-radius: 4px;
      transition: width 0.5s ease;
      box-shadow: 0 0 8px var(--blue-glow);
    }
  </style>
</head>
<body>
  <h2>🧠 Arcano Sprint</h2>
  <div>
    <label for="fileSelect">Sprint File:</label>
    <select id="fileSelect" onchange="selectFile(this.value)">
      ${fileOptionsHtml}
    </select>
  </div>  <div class="progress">
    <div class="progress-text">
      <span>Sprint Progress</span>
      <span>${done}/${total} (${percent}%)</span>
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: ${percent}%"></div>
    </div>
  </div>
  <div class="tasks">
    ${this.generateSectionedTasksHtml(items)}
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function selectFile(file) {
      vscode.postMessage({ command: 'selectFile', file });
    }
    function toggleSection(section) {
      vscode.postMessage({ command: 'toggleSection', section });
    }
    function toggleTask(index) {
      vscode.postMessage({ command: 'toggleTask', index });
    }
    function startTask(index) {
      vscode.postMessage({ command: 'startTask', index });
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.command === 'scrollToTask') {
        const el = document.querySelector(\`.task-item[data-index="\${msg.index}"]\`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (msg.command === 'animateStart') {
        const btn = document.querySelector(\`.task-item[data-index="\${msg.index}"] .start-btn\`);
        if (btn) {
          btn.classList.add('starting');
          setTimeout(() => btn.classList.remove('starting'), 600);
        }
      }
    });
  </script>
</body>
</html>`;
    }
    generateSectionedTasksHtml(items) {
        let html = '';
        const sections = items
            .filter((i) => i.type === 'section')
            .map((s) => s.name);
        sections.forEach((section) => {
            const collapsed = this.collapsedSections.get(section) || false;
            const sectionTasks = items
                .filter((i) => i.type === 'task' && i.section === section)
                .map((t) => t);
            const doneCount = sectionTasks.filter(t => t.done).length;
            html += `
        <div class="task-section">
          <div class="section-header" onclick="toggleSection('${this.escapeHtml(section)}')">
            <span>${collapsed ? '▶' : '▼'}</span>
            <strong>${this.escapeHtml(section)}</strong>
            <span class="section-count">${doneCount}/${sectionTasks.length}</span>
          </div>
          <div class="section-body" style="display:${collapsed ? 'none' : 'block'}">
            ${sectionTasks
                .map((task, i) => {
                const idx = this.getGlobalTaskIndex(items, section, i);
                return `
                  <div class="task-item ${task.done ? 'done' : ''}" data-index="${idx}">
                    <label>
                      <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${idx})">
                      ${this.escapeHtml(task.task)}
                    </label>
                    <button
                      class="start-btn"
                      onclick="startTask(${idx})"
                      ${task.done ? 'disabled' : ''}
                    >🚀</button>
                  </div>`;
            })
                .join('')}
          </div>
        </div>`;
        });
        return html;
    }
    getGlobalTaskIndex(items, section, localIdx) {
        const allTasks = items.filter((i) => i.type === 'task');
        let count = -1;
        for (let idx = 0; idx < allTasks.length; idx++) {
            if (allTasks[idx].section === section) {
                count++;
                if (count === localIdx) {
                    return idx;
                }
            }
        }
        return localIdx;
    }
    async updateTaskInFile(taskText, newStatus) {
        if (!this.currentFile) {
            return false;
        }
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) {
            return false;
        }
        const filePath = vscode.Uri.joinPath(folders[0].uri, 'docs', this.currentFile);
        try {
            const doc = await vscode.workspace.openTextDocument(filePath);
            const edit = new vscode.WorkspaceEdit();
            for (let i = 0; i < doc.lineCount; i++) {
                const line = doc.lineAt(i).text;
                if (line.includes(`] ${taskText}`) &&
                    (line.includes('[ ]') || line.includes('[x]'))) {
                    const indent = (line.match(/^\s*/) || [''])[0];
                    const newLine = `${indent}- [${newStatus ? 'x' : ' '}] ${taskText}`;
                    edit.replace(doc.uri, doc.lineAt(i).range, newLine);
                    const applied = await vscode.workspace.applyEdit(edit);
                    if (applied) {
                        await doc.save();
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
    escapeHtml(str) {
        return str.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] ?? m));
    }
    generateFileOptionsHtml(files) {
        return files
            .map((f) => `<option value="${this.escapeHtml(f)}"${f === this.currentFile ? ' selected' : ''}>${this.escapeHtml(f)}</option>`)
            .join('');
    }
    getTaskStartPrompt(task) {
        return `I'm working on this task from my sprint backlog: "${task}". Please help me implement it with detailed code examples and best practices.`;
    }
    async openTaskInCopilotChat(taskText) {
        const prompt = this.getTaskStartPrompt(taskText);
        const output = this.outputChannel;
        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: prompt,
                provider: 'copilot',
            });
            return;
        }
        catch { }
        try {
            await vscode.commands.executeCommand('chat.open');
            await vscode.commands.executeCommand('chat.insertInput', prompt);
            await vscode.commands.executeCommand('chat.acceptInput');
            return;
        }
        catch { }
        try {
            const doc = await vscode.workspace.openTextDocument({
                content: `# ${taskText}\n\n${prompt}`,
                language: 'markdown',
            });
            await vscode.window.showTextDocument(doc);
            await vscode.commands.executeCommand('inlineChat.start');
            return;
        }
        catch { }
        vscode.window.showWarningMessage('⚠️ Couldn’t invoke Copilot Chat automatically. The prompt has been copied to the Output panel.');
        output.show(true);
        output.appendLine('');
        output.appendLine('--- Copilot Task Prompt ---');
        output.appendLine(prompt);
        output.appendLine('------');
    }
}
exports.ArcanoPanelProvider = ArcanoPanelProvider;
ArcanoPanelProvider.viewType = 'arcanoTaskList';
