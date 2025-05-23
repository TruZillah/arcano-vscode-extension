// New panel implementation with clear separation between section types
import * as vscode from 'vscode';
import { Task, Section, SprintItem } from './types';
import { listSprintFiles, loadTasksFromFile } from './pythonBridge';

/**
 * A completely new panel implementation that properly handles different section types
 */
export class NewArcanoPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'arcanoTaskList';

  private currentFile: string | null = null;
  private webviewView?: vscode.WebviewView;
  private collapsedSections = new Map<string, boolean>();

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly outputChannel: vscode.OutputChannel
  ) {
    // Load saved state
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
          await this.handleTaskToggle(message.index);
          break;
        case 'startTask':
          await this.handleStartTask(message.index);
          break;
      }
    });

    this.refreshPanel();
  }

  private toggleSectionState(section: string) {
    const prev = this.collapsedSections.get(section) || false;
    this.collapsedSections.set(section, !prev);
    this.context.globalState.update(
      'arcano.collapsedSections',
      Object.fromEntries(this.collapsedSections.entries())
    );
  }

  private async refreshPanel() {
    if (!this.webviewView) {
      return;
    }

    const files = await listSprintFiles();
    console.log('Available sprint files:', files);
    
    if (!this.currentFile && files.length) {
      this.currentFile = files[0];
    }
    
    const items: SprintItem[] = this.currentFile ? await loadTasksFromFile(this.currentFile) : [];
    console.log('Loaded items:', items);
    
    // Debug log for sections to verify isHeader property
    const sections = items.filter(item => item.type === 'section');
    console.log('All sections:', sections);
    
    const headerSections = sections.filter(section => (section as Section).isHeader === true);
    console.log('Header sections (##):', headerSections);
    
    const taskGroups = sections.filter(section => (section as Section).isHeader !== true);
    console.log('Task groups (###):', taskGroups);

    const allTasks = items.filter((i) => i.type === 'task') as Task[];
    const doneCount = allTasks.filter(t => t.done).length;
    const totalCount = allTasks.length;

    const html = this.generateHtml(files, items, doneCount, totalCount);
    this.webviewView.webview.html = html;
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

    const prompt = this.getTaskStartPrompt(task.task);
    
    try {
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: prompt,
        provider: 'copilot'
      });
      return;
    } catch (e) {
      this.outputChannel.appendLine(`Error starting task: ${e}`);
    }

    try {
      await vscode.commands.executeCommand('chat.open');
      await vscode.commands.executeCommand('chat.insertInput', prompt);
      await vscode.commands.executeCommand('chat.acceptInput');
      return;
    } catch (e) {
      this.outputChannel.appendLine(`Error with chat alternative: ${e}`);
    }

    vscode.window.showInformationMessage('Task prompt copied to clipboard');
  }

  private getTaskStartPrompt(taskText: string): string {
    return `I'm working on this task from my sprint backlog: "${taskText}". Please help me implement it with detailed code examples and best practices.`;
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

  private generateHtml(files: string[], items: SprintItem[], doneCount: number, totalCount: number): string {
    const fileOptionsHtml = this.generateFileOptionsHtml(files);
    const tasksHtml = this.generateTasksHtml(items);
    const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    /* Basic styling */
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
      color: rgb(227, 249, 255);
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
    }

    /* Level 2 (##) blog-style section headers */
    .header-section {
      margin: 2.5rem 0 1.5rem 0;
      padding: 0;
      border: none;
      background: transparent;
    }
    .header-section h3 {
      font-size: 1.7rem;
      font-weight: 700;
      color: #00c3ff;
      margin: 0;
      padding-bottom: 0.5rem;
      border-bottom: 3px solid rgba(0, 195, 255, 0.3);
      position: relative;
    }
    .header-section h3::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 0;
      width: 60px;
      height: 3px;
      background: #00c3ff;
      border-radius: 2px;
    }
    .header-tasks {
      margin: 1rem 0 2rem 1rem;
    }

    /* Level 3 (###) task groups */
    .task-group {
      margin: 1.2em 0;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid rgba(0,195,255,0.1);
    }
    .task-group-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      padding: 10px 16px;
      background: rgba(0, 195, 255, 0.1);
    }
    .task-group-header:hover {
      background: rgba(0, 195, 255, 0.15);
    }
    .task-group-header span {
      font-size: 12px;
      margin-right: 8px;
    }
    .task-group-header strong {
      font-size: 0.95rem;
      text-transform: uppercase;
      color: #00c3ff;
    }
    .task-group-header .task-count {
      font-size: 0.85rem;
      opacity: 0.7;
    }
    .task-group-body {
      background: rgba(255,255,255,0.06);
      padding: 8px;
    }
    
    /* Empty styling */
    .empty-group .task-group-header {
      background: rgba(0, 195, 255, 0.05);
      cursor: default;
    }
    .empty-group .task-group-header:hover {
      background: rgba(0, 195, 255, 0.05);
    }
    .empty-message {
      padding: 8px 12px;
      font-style: italic;
      color: rgba(227, 234, 252, 0.5);
      text-align: center;
      font-size: 0.85rem;
    }
    
    /* Task items */
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
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      color: #0f2027;
      font-weight: bold;
    }
    .start-btn:hover {
      background: #33cfff;
    }
    .start-btn:disabled {
      background: #555;
      cursor: not-allowed;
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
    ${tasksHtml}
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
  </script>
</body>
</html>`;
  }

  private generateFileOptionsHtml(files: string[]): string {
    return files
      .map(f => `<option value="${this.escapeHtml(f)}"${f === this.currentFile ? ' selected' : ''}>${this.escapeHtml(f)}</option>`)
      .join('');
  }

  private generateTasksHtml(items: SprintItem[]): string {
    // Organize items by section
    const sections: { [key: string]: { tasks: Task[], isHeader: boolean } } = {};
    const sectionOrder: string[] = [];
    
    // First pass: identify all sections and their types
    for (const item of items) {
      if (item.type === 'section') {
        const section = item as Section;
        if (!(section.name in sections)) {
          sections[section.name] = {
            tasks: [],
            isHeader: section.isHeader === true
          };
          sectionOrder.push(section.name);
        }
      }
    }
    
    // Second pass: assign tasks to their sections
    for (const item of items) {
      if (item.type === 'task') {
        const task = item as Task;
        const sectionName = task.section || 'Ungrouped Tasks';
        
        if (!(sectionName in sections)) {
          // Create a default task group for tasks without a defined section
          sections[sectionName] = {
            tasks: [],
            isHeader: false
          };
          sectionOrder.push(sectionName);
        }
        
        sections[sectionName].tasks.push(task);
      }
    }
    
    // Generate HTML for each section
    let html = '';
    for (const sectionName of sectionOrder) {
      const section = sections[sectionName];
      
      if (section.isHeader) {
        // Level 2 header (##) - Blog style header
        html += this.renderHeaderSection(sectionName, section.tasks, items);
      } else {
        // Level 3 header (###) - Task group with collapsible UI
        html += this.renderTaskGroup(sectionName, section.tasks, items);
      }
    }
    
    return html;
  }
  
  private renderHeaderSection(name: string, tasks: Task[], allItems: SprintItem[]): string {
    let html = `<div class="header-section">
      <h3>${this.escapeHtml(name)}</h3>
    </div>`;
    
    if (tasks.length > 0) {
      html += `<div class="header-tasks">`;
      
      tasks.forEach((task, localIndex) => {
        const globalIndex = this.findTaskGlobalIndex(task, allItems);
        html += `<div class="task-item ${task.done ? 'done' : ''}" data-index="${globalIndex}">
          <label>
            <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${globalIndex})">
            ${this.escapeHtml(task.task)}
          </label>
          <button class="start-btn" onclick="startTask(${globalIndex})" ${task.done ? 'disabled' : ''}>🚀</button>
        </div>`;
      });
      
      html += `</div>`;
    }
    
    return html;
  }
  
  private renderTaskGroup(name: string, tasks: Task[], allItems: SprintItem[]): string {
    const isEmpty = tasks.length === 0;
    const collapsed = this.collapsedSections.get(name) || false;
    const doneCount = tasks.filter(t => t.done).length;
    
    let html = `<div class="task-group ${isEmpty ? 'empty-group' : ''}">
      <div class="task-group-header" ${!isEmpty ? `onclick="toggleSection('${this.escapeHtml(name)}')"` : ''}>
        ${!isEmpty ? `<span>${collapsed ? '▶' : '▼'}</span>` : ''}
        <strong>${this.escapeHtml(name)}</strong>
        ${!isEmpty ? `<span class="task-count">${doneCount}/${tasks.length}</span>` : ''}
      </div>
      <div class="task-group-body" style="display: ${collapsed ? 'none' : 'block'};">`;
      
    if (isEmpty) {
      html += `<div class="empty-message">No tasks in this group</div>`;
    } else {
      tasks.forEach((task, localIndex) => {
        const globalIndex = this.findTaskGlobalIndex(task, allItems);
        html += `<div class="task-item ${task.done ? 'done' : ''}" data-index="${globalIndex}">
          <label>
            <input type="checkbox" ${task.done ? 'checked' : ''} onchange="toggleTask(${globalIndex})">
            ${this.escapeHtml(task.task)}
          </label>
          <button class="start-btn" onclick="startTask(${globalIndex})" ${task.done ? 'disabled' : ''}>🚀</button>
        </div>`;
      });
    }
    
    html += `</div></div>`;
    return html;
  }
  
  private findTaskGlobalIndex(task: Task, allItems: SprintItem[]): number {
    const allTasks = allItems.filter(i => i.type === 'task') as Task[];
    return allTasks.findIndex(t => t.task === task.task && t.section === task.section);
  }
  
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
