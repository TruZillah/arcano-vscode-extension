# Extension Implementation Guide: ArcanoFlow Runes Migration Helper

*Date: May 21, 2025*

This document provides a practical guide for implementing the ArcanoFlow Runes Migration Helper as a VS Code extension. It builds upon the existing codebase analysis and the migration scripts that have already been developed.

## 1. Understanding the Existing Codebase

The current migration tooling consists of:

1. **Migration Assessment Documents**
   - Component scans with compatibility analysis
   - Critical path component identification
   - Difficulty assessments and time estimates
   - Migration patterns for different complexity levels

2. **Runes Migration Script**
   - Component scanning and pattern detection
   - Transformation functions for different syntax patterns
   - Report generation

## 2. Extension Architecture

The VS Code extension will be structured as follows:

```
arcano-runes-helper/
├── src/
│   ├── extension.ts            # Extension entry point
│   ├── commands/               # Command implementations
│   │   ├── scanCommand.ts      # Scan workspace for components
│   │   ├── assessCommand.ts    # Assess component difficulty
│   │   ├── transformCommand.ts # Apply transformations
│   │   └── reportCommand.ts    # Generate reports
│   ├── providers/              # VS Code providers
│   │   ├── diagnosticProvider.ts  # Show migration issues
│   │   ├── codeActionProvider.ts  # Suggest fixes
│   │   └── hoverProvider.ts       # Show migration info
│   ├── views/                  # Custom views
│   │   ├── componentTreeView.ts   # Component hierarchy
│   │   ├── migrationDashboard.ts  # Progress tracking
│   │   └── patternExplorer.ts     # Pattern library
│   ├── analyzers/              # Analysis logic
│   │   ├── componentScanner.ts    # Find components
│   │   ├── patternDetector.ts     # Detect legacy patterns
│   │   └── difficultyEstimator.ts # Estimate complexity
│   ├── transformers/           # Code transformers
│   │   ├── propsTransformer.ts     # Convert props
│   │   ├── derivedTransformer.ts   # Convert reactive vars
│   │   ├── effectTransformer.ts    # Convert reactive blocks
│   │   └── stateTransformer.ts     # Convert local state
│   └── utilities/              # Helper functions
├── webviews/                   # Webview HTML/CSS/JS
│   ├── dashboard/              # Migration dashboard UI
│   ├── editor/                 # Code editor UI
│   └── patterns/               # Pattern library UI
└── media/                      # Icons and images
```

## 3. Leveraging Existing Code

The extension will integrate the existing migration script by:

1. **Importing Core Logic**
   - Convert pattern detection regex to TypeScript
   - Create classes for each transformer type
   - Enhance scanning with workspace API capabilities

2. **Enhancing Analysis**
   - Add TypeScript-based AST analysis
   - Create more accurate pattern detection
   - Add impact analysis for changes

3. **Improving Transformations**
   - Add support for TypeScript type annotations
   - Create more granular transformations
   - Add preview capability before applying changes

## 4. Key Extension Features

### Component Explorer

```typescript
// componentTreeProvider.ts (simplified)
import * as vscode from 'vscode';
import { ComponentNode } from '../models/componentNode';

export class ComponentTreeProvider implements vscode.TreeDataProvider<ComponentNode> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ComponentNode | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
  private components: ComponentNode[] = [];

  constructor(private workspaceRoot: string) {
    this.scanWorkspace();
  }

  refresh(): void {
    this.scanWorkspace();
    this._onDidChangeTreeData.fire(undefined);
  }

  async scanWorkspace(): Promise<void> {
    // Find all Svelte components
    const filePattern = new vscode.RelativePattern(this.workspaceRoot, '**/*.svelte');
    const files = await vscode.workspace.findFiles(filePattern, '**/node_modules/**');
    
    this.components = [];
    
    for (const file of files) {
      const content = await vscode.workspace.fs.readFile(file);
      const componentData = await this.analyzeComponent(file.fsPath, content.toString());
      this.components.push(new ComponentNode(file.fsPath, componentData));
    }
  }

  private async analyzeComponent(filePath: string, content: string): Promise<any> {
    // Analyze component using patterns
    // This would implement similar logic to the existing runes-migration.js
    // But enhanced with AST parsing for more accuracy
    return {
      // Component analysis data
      hasLegacySyntax: false,
      hasRunesSyntax: false,
      complexity: 'simple',
      patterns: []
    };
  }

  getTreeItem(element: ComponentNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: ComponentNode): ComponentNode[] {
    if (!element) {
      return this.components;
    }
    return element.children;
  }
}
```

### Migration Dashboard

```typescript
// migrationDashboardPanel.ts (simplified)
import * as vscode from 'vscode';
import * as path from 'path';

export class MigrationDashboardPanel {
  public static currentPanel: MigrationDashboardPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (MigrationDashboardPanel.currentPanel) {
      MigrationDashboardPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'migrationDashboard',
      'Runes Migration Dashboard',
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'webviews', 'dashboard')
        ]
      }
    );

    MigrationDashboardPanel.currentPanel = new MigrationDashboardPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    
    this._panel.webview.html = this._getWebviewContent(extensionUri);
    
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    
    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'startMigration':
            // Handle migration start
            vscode.window.showInformationMessage(`Starting migration for ${message.component}`);
            return;
        }
      },
      null,
      this._disposables
    );
  }

  private _getWebviewContent(extensionUri: vscode.Uri) {
    // Generate HTML for the dashboard
    // This would include charts, component lists, and progress indicators
    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Runes Migration Dashboard</title>
      </head>
      <body>
        <h1>Svelte Runes Migration Dashboard</h1>
        <div id="summary">
          <h2>Migration Summary</h2>
          <div class="stats">
            <div class="stat">Components to Migrate: <span id="total-count">61</span></div>
            <div class="stat">Simple Components: <span id="simple-count">28</span></div>
            <div class="stat">Medium Components: <span id="medium-count">26</span></div>
            <div class="stat">Complex Components: <span id="complex-count">7</span></div>
            <div class="stat">Progress: <span id="progress">0%</span></div>
          </div>
        </div>
        <div id="component-list">
          <!-- Component list would be populated here -->
        </div>
        <script src="${this._getUri(extensionUri, ['webviews', 'dashboard', 'main.js'])}"></script>
      </body>
      </html>`;
  }

  private _getUri(extensionUri: vscode.Uri, pathList: string[]) {
    return this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, ...pathList)
    );
  }

  public dispose() {
    MigrationDashboardPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
```

### Code Transformation Preview

```typescript
// transformPreviewProvider.ts (simplified)
import * as vscode from 'vscode';
import { transformProps, transformReactiveStatements, transformReactiveBlocks, transformReactiveIf } from '../transformers';

export class TransformPreviewProvider {
  constructor(private context: vscode.ExtensionContext) {}

  public async showTransformPreview(document: vscode.TextDocument) {
    const originalContent = document.getText();
    
    // Apply transformations (similar to runes-migration.js)
    let transformedContent = originalContent;
    transformedContent = transformProps(transformedContent);
    transformedContent = transformReactiveStatements(transformedContent);
    transformedContent = transformReactiveBlocks(transformedContent);
    transformedContent = transformReactiveIf(transformedContent);
    
    // Create side-by-side diff view
    const originalUri = document.uri;
    const previewUri = originalUri.with({ scheme: 'runes-preview', path: `${originalUri.path}.preview` });
    
    // Store transformed content for preview
    await this.context.workspaceState.update(previewUri.toString(), transformedContent);
    
    // Show diff
    vscode.commands.executeCommand('vscode.diff', 
      originalUri, 
      previewUri, 
      'Original ↔ Migrated to Runes'
    );
  }
}
```

## 5. Extension Commands Implementation

### Scan Workspace Command

```typescript
// scanCommand.ts (simplified)
import * as vscode from 'vscode';
import { scanForLegacyComponents } from '../analyzers/componentScanner';

export async function scanWorkspaceCommand() {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showErrorMessage('No workspace is open');
    return;
  }
  
  vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'Scanning for Svelte components...',
      cancellable: true
    },
    async (progress, token) => {
      try {
        progress.report({ message: 'Finding Svelte files...' });
        
        const results = await scanForLegacyComponents(workspaceFolders[0].uri.fsPath, token);
        
        // Store results in extension state
        const extensionContext = vscode.extensions.getExtension('arcanoflow.runes-migration-helper')?.exports.getContext();
        if (extensionContext) {
          await extensionContext.workspaceState.update('scanResults', results);
        }
        
        // Show results
        vscode.window.showInformationMessage(`Found ${results.components.length} components to migrate`);
        
        // Refresh views
        vscode.commands.executeCommand('arcanoflow.refreshComponentTree');
        
        return results;
      } catch (error) {
        vscode.window.showErrorMessage(`Error scanning workspace: ${error}`);
        return null;
      }
    }
  );
}
```

### Apply Migration Command

```typescript
// applyMigrationCommand.ts (simplified)
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { transformComponent } from '../transformers';

export async function applyMigrationCommand() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }
  
  const document = editor.document;
  if (path.extname(document.fileName) !== '.svelte') {
    vscode.window.showErrorMessage('Current file is not a Svelte component');
    return;
  }
  
  try {
    // Create backup
    const backupPath = `${document.fileName}.backup`;
    fs.writeFileSync(backupPath, document.getText());
    
    // Transform component
    const transformedContent = await transformComponent(document.getText());
    
    // Apply edit
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      transformedContent
    );
    
    await vscode.workspace.applyEdit(edit);
    
    vscode.window.showInformationMessage(
      `Successfully migrated component. Backup saved at ${backupPath}`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Error applying migration: ${error}`);
  }
}
```

## 6. Diagnostic Provider

```typescript
// diagnosticProvider.ts (simplified)
import * as vscode from 'vscode';
import { detectLegacyPatterns } from '../analyzers/patternDetector';

export class RunesMigrationDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;
  
  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('svelte-runes-migration');
  }
  
  public async updateDiagnostics(document: vscode.TextDocument) {
    if (path.extname(document.fileName) !== '.svelte') {
      return;
    }
    
    const content = document.getText();
    const patterns = detectLegacyPatterns(content);
    
    const diagnostics: vscode.Diagnostic[] = [];
    
    // Add diagnostics for each detected legacy pattern
    for (const pattern of patterns) {
      const range = new vscode.Range(
        document.positionAt(pattern.start),
        document.positionAt(pattern.end)
      );
      
      const diagnostic = new vscode.Diagnostic(
        range,
        `Legacy Svelte syntax: ${pattern.description}. Consider migrating to runes.`,
        vscode.DiagnosticSeverity.Information
      );
      
      diagnostic.code = pattern.type;
      diagnostic.source = 'Svelte Runes Migration';
      
      diagnostics.push(diagnostic);
    }
    
    this.diagnosticCollection.set(document.uri, diagnostics);
  }
  
  public dispose() {
    this.diagnosticCollection.dispose();
  }
}
```

## 7. Code Actions Provider

```typescript
// codeActionProvider.ts (simplified)
import * as vscode from 'vscode';
import { transformPattern } from '../transformers';

export class RunesMigrationCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
  ];
  
  public provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const codeActions: vscode.CodeAction[] = [];
    
    // Find diagnostics for runes migration
    const diagnostics = context.diagnostics.filter(
      diagnostic => diagnostic.source === 'Svelte Runes Migration'
    );
    
    for (const diagnostic of diagnostics) {
      // Create code action based on diagnostic type
      const type = diagnostic.code as string;
      const action = this.createCodeAction(document, diagnostic.range, type);
      if (action) {
        codeActions.push(action);
      }
    }
    
    return codeActions;
  }
  
  private createCodeAction(
    document: vscode.TextDocument,
    range: vscode.Range,
    type: string
  ): vscode.CodeAction | null {
    const text = document.getText(range);
    
    try {
      const transformed = transformPattern(text, type);
      
      if (!transformed) {
        return null;
      }
      
      const action = new vscode.CodeAction(
        `Migrate to runes: ${type}`,
        vscode.CodeActionKind.QuickFix
      );
      
      action.edit = new vscode.WorkspaceEdit();
      action.edit.replace(document.uri, range, transformed);
      
      return action;
    } catch (error) {
      console.error(`Error creating code action: ${error}`);
      return null;
    }
  }
}
```

## 8. Starting Implementation

To begin implementing this VS Code extension:

1. **Initialize Extension Project**
   ```bash
   # Create new extension project
   npm install -g yo generator-code
   yo code
   
   # Select 'New Extension (TypeScript)'
   # Name it 'arcano-runes-migration-helper'
   ```

2. **Port Existing Script Logic**
   - Copy pattern detection regex from runes-migration.js
   - Adapt transformation functions to TypeScript
   - Create providers for VS Code integration

3. **Build UI Components**
   - Implement component tree view
   - Create migration dashboard
   - Build pattern library

4. **Add Commands**
   - Scan workspace
   - Analyze components
   - Transform components
   - Generate reports

5. **Implement Core Features**
   - Diagnostics for legacy syntax
   - Code actions for migrations
   - Preview and diff functionality

## 9. Testing and Validation

1. **Unit Tests**
   - Test pattern detection
   - Test transformations
   - Test difficulty assessment

2. **Integration Tests**
   - Test with sample components
   - Validate migration accuracy
   - Test report generation

3. **User Validation**
   - Test with actual development team
   - Gather feedback on usability
   - Refine based on real-world usage

## 10. Next Steps

1. **Create Extension Package**
   - Package the extension
   - Create documentation
   - Publish to VS Code Marketplace

2. **Plan Web Application**
   - Design database schema
   - Create API endpoints
   - Build frontend UI

3. **Integrate with CI/CD**
   - Add GitHub Actions integration
   - Create automated validation

4. **Enhance with AI**
   - Add intelligent pattern recognition
   - Create code generation capabilities
   - Build automated testing

## Conclusion

This implementation guide provides a practical approach to building the ArcanoFlow Runes Migration Helper as a VS Code extension. By leveraging the existing codebase and migration scripts, and enhancing them with VS Code's extension capabilities, a powerful migration tool can be created to significantly improve the developer experience of migrating to Svelte runes.
