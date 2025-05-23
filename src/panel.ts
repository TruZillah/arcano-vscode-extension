import * as vscode from 'vscode';
import { runSprintManager, listSprintFiles, loadTasksFromFile } from './pythonBridge';
import { sendKeysToActive, submitActiveInput } from './inputHelper';
import { Task, Section, SprintItem } from './types';

export class ArcanoPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'arcanoTaskList';

  private currentFile: string | null = null;
  private webviewView?: vscode.WebviewView;

  // --- preserved UI state ---
  private collapsedSections = new Map<string, boolean>();
  private lastToggledTaskIndex: number | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly outputChannel: vscode.OutputChannel
  ) {
    const saved = this.context.globalState.get<{ [sec: string]: boolean }>('arcano.collapsedSections');
    if (saved) {
      Object.entries(saved).forEach(([sec, val]) => this.collapsedSections.set(sec, val));
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.webviewView = webviewView;
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'selectFile':
          this.currentFile = message.file;
          await this.refreshPanel();
          break;
        case 'toggleSection':
          this.toggleSectionState(message.section);
          await this.refreshPanel();
          break;
        case 'toggleTask':
          this.lastToggledTaskIndex = message.index;
          await this.handleTaskToggle(message.index);
          break;
        case 'startTask':
          await this.handleStartTask(message.index);
          break;
      }
    });

    this.refreshPanel();
  }

  private async refreshPanel() {
    if (!this.webviewView) {
      return;
    }

    const files = await listSprintFiles();
    console.log('Available sprint files:', files);
    if (!this.currentFile && files.length) {
      this.currentFile = files[0];
    }    const items: SprintItem[] = this.currentFile
      ? await loadTasksFromFile(this.currentFile)
      : [];

    console.log('Loaded items:', items);
    
    // Debug log sections with their isHeader property
    const sections = items.filter(item => item.type === 'section');
    console.log('Sections with isHeader property:', sections);

    const allTasks = items.filter((i) => i.type === 'task') as Task[];
    const doneCount = allTasks.filter((t) => t.done).length;
    const totalCount = allTasks.length;

    console.log('Task summary:', { doneCount, totalCount });

    const html = this.getHtml(
      this.generateFileOptionsHtml(files),
      items,
      doneCount,
      totalCount
    );
    this.webviewView.webview.html = html;

    if (this.lastToggledTaskIndex !== null) {
      this.webviewView.webview.postMessage({
        command: 'scrollToTask',
        index: this.lastToggledTaskIndex,
      });
      this.lastToggledTaskIndex = null;
    }
  }

  private toggleSectionState(section: string) {
    const prev = this.collapsedSections.get(section) || false;
    this.collapsedSections.set(section, !prev);
    this.context.globalState.update(
      'arcano.collapsedSections',
      Object.fromEntries(this.collapsedSections.entries())
    );
  }

  private async handleTaskToggle(index: number) {
    if (!this.currentFile) {
      return;
    }
    const items = await loadTasksFromFile(this.currentFile);
    const tasks = items.filter((i) => i.type === 'task') as Task[];
    const task = tasks[index];
    if (!task) {
      return;
    }

    const newStatus = !task.done;
    const success = await this.updateTaskInFile(task.task, newStatus);
    if (success) {
      this.outputChannel.appendLine(
        `Toggled "${task.task}" → ${newStatus ? '✅ done' : '↩️ undone'}`
      );
      await this.refreshPanel();
    } else {
      vscode.window.showErrorMessage(`Failed to update "${task.task}"`);
    }
  }

  private async handleStartTask(index: number) {
    if (!this.currentFile) {
      return;
    }
    const items = await loadTasksFromFile(this.currentFile);
    const tasks = items.filter((i) => i.type === 'task') as Task[];
    const task = tasks[index];
    if (!task) {
      return;
    }

    await this.openTaskInCopilotChat(task.task);
    this.webviewView?.webview.postMessage({ command: 'animateStart', index });
  }

  private getHtml(fileOptionsHtml: string, items: (Task | Section)[], doneCount: number, totalCount: number): string {
    // Use generated sectioned tasks HTML and show a summary header.
    const sectionTasksHtml = this.generateSectionedTasksHtml(items);
    const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    /* Basic styling for the panel */
    body {
      background: #0f2027;
      color: #e3eafc;
      font-family: var(--vscode-font-family);
      padding: 16px;
      margin: 0;
    }
    h2 {
      display: flex;
      align-items: center;
      color: #00c3ff;
      font-size: 1.4rem;
      font-weight: 600;
    }
    select {
      width: 100%;
      padding: 8px;
      margin-bottom: 16px;
      border-radius: 4px;
      background-color: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      color:rgb(227, 249, 255);
    }
    .progress {
      margin-top: 20px;
      margin-bottom: 24px;
    }
    .progress-text {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
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
      background: linear-gradient(90deg, #00c3ff 0%, rgba(0,195,255,0.7) 100%);
      border-radius: 4px;
      transition: width 0.5s ease;
      box-shadow: 0 0 8px #00c3ff44;
    }    /* Blog post style section headers */
    .blog-header-section {
      margin: 2rem 0 1.5rem 0;
      padding: 0;
      border: none;
      background: transparent;
    }
    .blog-header-section h3 {
      font-size: 1.8rem !important;
      font-weight: 700 !important;
      color: #00c3ff !important;
      margin: 0;
      padding-bottom: 0.5rem;
      border-bottom: 3px solid rgba(0, 195, 255, 0.3);
      position: relative;
    }
    .blog-header-section h3::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 0;
      width: 60px;
      height: 3px;
      background: #00c3ff;
      border-radius: 2px;
    }
      /* Tasks under header sections */
    .header-section-tasks {
      margin-bottom: 2rem;
      padding: 0 0 0 1rem;
    }
    
    /* Tasks under header sections */
    .header-section-tasks .task-item {
      margin-bottom: 8px;
      transition: transform 0.2s ease;
    }
    
    .header-section-tasks .task-item:hover {
      transform: translateX(5px);
    }    /* Task group sections with collapsible functionality */
    .task-group-section {
      margin: 1.2em 0;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid rgba(0,195,255,0.1);
    }
    /* Empty sections styling */
    .empty-section .section-header {
      background: rgba(0, 195, 255, 0.05);
      cursor: default;
    }    .empty-section .section-header:hover {
      background: rgba(0, 195, 255, 0.05);
    }
    .empty-task-message {
      padding: 8px 12px;
      font-style: italic;
      color: rgba(227, 234, 252, 0.5);
      text-align: center;
      font-size: 0.85rem;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      padding: 10px 16px;
      background: rgba(0, 195, 255, 0.1);
    }
    .section-header:hover {
      background: rgba(0, 195, 255, 0.15);
    }
    .section-header span {
      font-size: 12px;
      margin-right: 8px;
    }
    .section-header strong {
      font-size: 0.95rem;
      text-transform: uppercase;
      color: #00c3ff;
    }
    .section-header .section-count {
      font-size: 0.85rem;
      opacity: 0.7;
    }
    .section-body {
      background: rgba(255,255,255,0.06);
      padding: 8px;
      transition: all 0.3s ease;
    }
    .task-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      margin-bottom: 4px;
      border-radius: 4px;
      background: rgba(0,0,0,0.2);
      cursor: pointer;
    }
    .task-item.done label {
      opacity: 0.6;
      text-decoration: line-through;
    }
    .task-item label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .start-btn {
      background: #00c3ff;
      border: none;
      padding: 6px 10px;
      border-radius: 4px;
      cursor: pointer;
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
  </div>
  <div class="progress">
    <div class="progress-text">
      <span>Sprint Progress</span>
      <span>${doneCount}/${totalCount} (${percent}%)</span>
    </div>
    <div class="progress-bar-container">
      <div class="progress-bar" style="width: ${percent}%"></div>
    </div>
  </div>
  <div class="tasks">
    ${sectionTasksHtml}
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

  private generateSectionedTasksHtml(items: SprintItem[]): string {
    let html = '';
    // Get unique sections, including tasks without a section (using "Start Sprint" as default)
    const sections: { [key: string]: Task[] } = {};
    const sectionOrder: string[] = [];
    const sectionTypes: { [key: string]: string } = {}; // Store section type: 'header' or 'group'
    
    // Process section types first
    for (const item of items) {      if (item.type === 'section') {
        // Check if this is a header section (from ## headers) or task group (from ### headers)
        const section = item as Section;
        const isHeader = section.isHeader === true;
        if (!(item.name in sections)) {
          sections[item.name] = [];
          sectionOrder.push(item.name);
          sectionTypes[item.name] = isHeader ? 'header' : 'group';
        }
      }
    }
    
    // Then process tasks
    for (const item of items) {
      if (item.type === 'task') {
        const sectionName = item.section || 'Start Sprint';
        if (!(sectionName in sections)) {
          sections[sectionName] = [];
          sectionOrder.push(sectionName);
          // Default to task group if not previously defined
          if (!sectionTypes[sectionName]) {
            sectionTypes[sectionName] = 'group';
          }
        }
        sections[sectionName].push(item as Task);
      }
    }

    // Build HTML for each section
    for (const sectionName of sectionOrder) {
      const sectionTasks = sections[sectionName];
      const isHeaderSection = sectionTypes[sectionName] === 'header';
      
    // For header sections (##), use blog-style headers
      if (isHeaderSection) {
        // Use blog-header-section instead of blog-section-header
        html += `<div class="blog-header-section">
          <h3>${this.escapeHtml(sectionName)}</h3>
        </div>`;
        
        // If header section has tasks, still list them but without collapsible functionality
        if (sectionTasks.length > 0) {
          html += `<div class="header-section-tasks">`;
          html += sectionTasks
            .map((task, i) => {
              const idx = this.getGlobalTaskIndex(items, sectionName, i);
              return `<div class="task-item ${task.done ? 'done' : ''}" data-index="${idx}">
                    <label>
                      <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${idx})">
                      ${this.escapeHtml(task.task)}
                    </label>
                    <button class="start-btn" onclick="startTask(${idx})" ${task.done ? 'disabled' : ''}>🚀</button>
                  </div>`;
            })
            .join('');
          html += `</div>`;
        }
        continue;
      }
        // For task groups (###), use collapsible sections
      const collapsed = this.collapsedSections.get(sectionName) || false;
      const doneCount = sectionTasks.filter(task => task.done).length;      html += `<div class="task-group-section ${sectionTasks.length === 0 ? 'empty-section' : ''}">
          <div class="section-header" onclick="${sectionTasks.length > 0 ? `toggleSection('${this.escapeHtml(sectionName)}')` : ''}">
            ${sectionTasks.length > 0 ? `<span>${collapsed ? '▶' : '▼'}</span>` : ''}
            <strong>${this.escapeHtml(sectionName)}</strong>
            ${sectionTasks.length > 0 ? `<span class="section-count">${doneCount}/${sectionTasks.length}</span>` : ''}
          </div>
          <div class="section-body" style="display: ${collapsed ? 'none' : 'block'};">`;
      
      if (!collapsed && sectionTasks.length > 0) {
        html += sectionTasks
          .map((task, i) => {
            const idx = this.getGlobalTaskIndex(items, sectionName, i);
            return `<div class="task-item ${task.done ? 'done' : ''}" data-index="${idx}">
                    <label>
                      <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${idx})">
                      ${this.escapeHtml(task.task)}
                    </label>
                    <button class="start-btn" onclick="startTask(${idx})" ${task.done ? 'disabled' : ''}>🚀</button>
                  </div>`;
          })
          .join('');
      }      // For empty sections, we can show a message or just close the containers
      if (sectionTasks.length === 0) {
        html += `<div class="empty-task-message">No tasks in this group</div></div></div>`;
      } else {
        html += `</div></div>`;
      }
    }
    return html;
  }

  private getGlobalTaskIndex(items: SprintItem[], section: string, localIdx: number): number {
    const allTasks = items.filter((i) => i.type === 'task') as Task[];
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

  private async updateTaskInFile(taskText: string, newStatus: boolean): Promise<boolean> {
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
        if (
          line.includes(`] ${taskText}`) &&
          (line.includes('[ ]') || line.includes('[x]'))
        ) {
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
    } catch (err) {
      this.outputChannel.appendLine(`Error updating task: ${err}`);
      return false;
    }
  }

  private escapeHtml(str: string): string {
    return str.replace(/[&<>"']/g, (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m)
    );
  }

  private generateFileOptionsHtml(files: string[]): string {
    return files
      .map(
        (f) =>
          `<option value="${this.escapeHtml(f)}"${f === this.currentFile ? ' selected' : ''}>${this.escapeHtml(f)}</option>`
      )
      .join('');
  }

  private getTaskStartPrompt(task: string): string {
    return `I'm working on this task from my sprint backlog: "${task}". Please help me implement it with detailed code examples and best practices.`;
  }

  private async openTaskInCopilotChat(taskText: string) {
    const prompt = this.getTaskStartPrompt(taskText);
    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: prompt,
        provider: 'copilot',
      });
      return;
    } catch {}
    try {
      await vscode.commands.executeCommand('chat.open');
      await vscode.commands.executeCommand('chat.insertInput', prompt);
      await vscode.commands.executeCommand('chat.acceptInput');
      return;
    } catch {}
    try {
      const doc = await vscode.workspace.openTextDocument({
        content: `# ${taskText}\n\n${prompt}`,
        language: 'markdown',
      });
      await vscode.window.showTextDocument(doc);
      await vscode.commands.executeCommand('inlineChat.start');
      return;
    } catch {}
    vscode.window.showWarningMessage(
      '⚠️ Couldn’t invoke Copilot Chat automatically. The prompt has been copied to the Output panel.'
    );
    this.outputChannel.show(true);
    this.outputChannel.appendLine('');
    this.outputChannel.appendLine('--- Copilot Task Prompt ---');
    this.outputChannel.appendLine(prompt);
    this.outputChannel.appendLine('------');
  }
}