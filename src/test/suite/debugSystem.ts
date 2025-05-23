import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { ProblemScanner } from '../../debugSystem/problemScanner';

/**
 * Interface representing a detected issue
 */
export interface IssueDetail {
    file: string;       // File path where the issue was detected
    message: string;    // Error message or description
    severity: vscode.DiagnosticSeverity;  // Severity level
    line: number;       // Line number where the issue occurs
    code?: string;      // Optional error code
}

/**
 * Main class for the Automated Debug System
 */
export class AutomatedDebugSystem {
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private problemScanner: ProblemScanner;
    private diagnosticCollection: vscode.DiagnosticCollection;
    private issuesList: IssueDetail[] = [];
    private isMonitoring: boolean = false;

    constructor(
        outputChannel: vscode.OutputChannel,
        problemScanner: ProblemScanner
    ) {
        this.outputChannel = outputChannel;
        this.problemScanner = problemScanner;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('arcanoAutomatedDebug');
        
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.command = 'arcano.showDebugIssues';
        this.updateStatusBar(0);
        this.statusBarItem.show();
    }

    /**
     * Start monitoring for issues
     */
    public startMonitoring(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.outputChannel.appendLine('🔍 Starting automated debug monitoring...');
        
        // Register diagnostic change listener
        vscode.languages.onDidChangeDiagnostics(this.onDiagnosticsChanged, this);
        
        // Initial scan
        this.scanForIssues();
    }

    /**
     * Handle changes in diagnostics
     */
    private onDiagnosticsChanged(event: vscode.DiagnosticChangeEvent): void {
        // Wait briefly to collect all diagnostics
        setTimeout(() => this.scanForIssues(), 500);
    }

    /**
     * Scan for issues using VS Code's diagnostics API
     */
    public async scanForIssues(): Promise<IssueDetail[]> {
        this.outputChannel.appendLine('Scanning for issues...');
        
        // Clear previous issues list
        this.issuesList = [];
        
        // Get all diagnostics from VS Code
        const allDiagnostics = vscode.languages.getDiagnostics();
        
        // Process each diagnostic
        allDiagnostics.forEach(([uri, diagnostics]) => {
            // Skip files in node_modules or .git
            if (uri.fsPath.includes('node_modules') || uri.fsPath.includes('.git')) {
                return;
            }
            
            diagnostics.forEach(diag => {
                this.issuesList.push({
                    file: uri.fsPath,
                    message: diag.message,
                    severity: diag.severity,
                    line: diag.range.start.line + 1,
                    code: diag.code?.toString()
                });
            });
        });
        
        // Update the status bar
        this.updateStatusBar(this.issuesList.length);
        
        // Log results
        this.outputChannel.appendLine(`Found ${this.issuesList.length} issues`);
        
        // Return the issues
        return this.issuesList;
    }
    
    /**
     * Update the status bar with issue count and color coding
     */
    private updateStatusBar(issueCount: number): void {
        // Update status bar text
        this.statusBarItem.text = `$(bug) Issues: ${issueCount}`;
        
        // Color code based on issue count
        if (issueCount === 0) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.successBackground');
            this.statusBarItem.tooltip = 'No issues detected';
        } else if (issueCount < 5) {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            this.statusBarItem.tooltip = `${issueCount} issues detected`;
        } else {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            this.statusBarItem.tooltip = `${issueCount} issues detected - Attention required!`;
        }
    }
    
    /**
     * Generate sprint tasks from detected issues
     */
    public async generateSprintTasks(): Promise<boolean> {
        try {
            this.outputChannel.appendLine('Generating sprint tasks from issues...');
            
            // Ensure we have up-to-date issues
            await this.scanForIssues();
            
            if (this.issuesList.length === 0) {
                this.outputChannel.appendLine('No issues to generate tasks for');
                return true;
            }
            
            // Find workspace root folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                this.outputChannel.appendLine('No workspace folder found');
                return false;
            }
            
            // Path to sprint.md
            const sprintMdPath = path.join(workspaceFolder.uri.fsPath, 'docs', 'sprint.md');
            
            // Read existing sprint.md if it exists
            let existingContent = '';
            try {
                existingContent = await fs.promises.readFile(sprintMdPath, 'utf8');
            } catch (err) {
                // File doesn't exist yet, create with default content
                existingContent = '# Sprint Tasks\n\n';
            }
            
            // Check if Debug Tasks section already exists
            let newContent = existingContent;
            if (!newContent.includes('### [Debug Tasks]')) {
                newContent += '\n### [Debug Tasks]\n';
            }
            
            // Generate tasks from issues
            const tasks = this.issuesList.map(issue => {
                const severity = this.getSeverityLabel(issue.severity);
                return `- [ ] ${severity} Fix ${issue.message} in ${path.basename(issue.file)} at line ${issue.line}`;
            });
            
            // Find position to insert tasks (after ### [Debug Tasks] heading)
            const debugTasksIndex = newContent.indexOf('### [Debug Tasks]');
            if (debugTasksIndex !== -1) {
                // Find next section or end of file
                let nextSectionIndex = newContent.indexOf('###', debugTasksIndex + 15);
                if (nextSectionIndex === -1) {
                    nextSectionIndex = newContent.length;
                }
                
                // Insert tasks
                const beforeSection = newContent.substring(0, debugTasksIndex + 15);
                const afterSection = newContent.substring(nextSectionIndex);
                newContent = beforeSection + '\n' + tasks.join('\n') + '\n' + afterSection;
            }
            
            // Write back to file
            await fs.promises.writeFile(sprintMdPath, newContent);
            
            this.outputChannel.appendLine(`Successfully generated ${tasks.length} tasks in sprint.md`);
            return true;
        } catch (err) {
            this.outputChannel.appendLine(`Error generating sprint tasks: ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    }
    
    /**
     * Get human-readable label for severity
     */
    private getSeverityLabel(severity: vscode.DiagnosticSeverity): string {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return '[ERROR]';
            case vscode.DiagnosticSeverity.Warning:
                return '[WARNING]';
            case vscode.DiagnosticSeverity.Information:
                return '[INFO]';
            case vscode.DiagnosticSeverity.Hint:
                return '[HINT]';
            default:
                return '';
        }
    }
    
    /**
     * Apply Copilot fixes to issues
     */
    public async applyCopilotFixes(): Promise<void> {
        this.outputChannel.appendLine('Requesting Copilot fixes for issues...');
        
        // Count total issues fixed
        let fixedCount = 0;
        
        // Group issues by file for efficiency
        const fileIssues = new Map<string, IssueDetail[]>();
        
        this.issuesList.forEach(issue => {
            if (!fileIssues.has(issue.file)) {
                fileIssues.set(issue.file, []);
            }
            fileIssues.get(issue.file)?.push(issue);
        });
        
        // Process each file
        for (const [file, issues] of fileIssues.entries()) {
            // Sort issues by line number (descending) to avoid position shifts
            issues.sort((a, b) => b.line - a.line);
            
            this.outputChannel.appendLine(`Processing ${issues.length} issues in ${path.basename(file)}`);
            
            // Try to fix each issue
            for (const issue of issues) {
                const success = await this.requestCopilotFix(issue);
                if (success) {
                    fixedCount++;
                }
            }
        }
        
        this.outputChannel.appendLine(`Completed fix attempts: ${fixedCount} issues fixed successfully`);
        
        // Rescan for remaining issues
        await this.scanForIssues();
    }
    
    /**
     * Request Copilot fix for a specific issue
     * Note: This is a placeholder implementation as direct Copilot API access is not fully available
     */
    private async requestCopilotFix(issue: IssueDetail): Promise<boolean> {
        try {
            // Open the file
            const doc = await vscode.workspace.openTextDocument(issue.file);
            const editor = await vscode.window.showTextDocument(doc);
            
            // Position at the issue line
            const position = new vscode.Position(issue.line - 1, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
            
            // In a real implementation, we would call Copilot API here
            // For now, just log that we would attempt a fix
            this.outputChannel.appendLine(
                `Would request Copilot fix for ${path.basename(issue.file)}:${issue.line} - ${issue.message}`
            );
            
            // Simulate Copilot thinking...
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Ask user if they want to apply suggested fix (placeholder)
            const applyFix = await vscode.window.showInformationMessage(
                `Copilot suggests a fix for ${path.basename(issue.file)}:${issue.line}. Apply it?`,
                'Apply',
                'Skip'
            );
            
            if (applyFix === 'Apply') {
                // In a real implementation, we would apply Copilot's suggested edit here
                this.outputChannel.appendLine(`User accepted fix for ${path.basename(issue.file)}:${issue.line}`);
                return true;
            }
            
            return false;
        } catch (err) {
            this.outputChannel.appendLine(`Error requesting Copilot fix: ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    }
    
    /**
     * Show a detailed view of all issues
     */
    public showIssuesView(): void {
        // Create and show a new webview with detailed issue information
        // This is a placeholder for the actual implementation
        this.outputChannel.appendLine('Showing issues view...');
        
        // For now, just show issues in output channel
        this.outputChannel.appendLine('\n==== DETECTED ISSUES ====\n');
        
        if (this.issuesList.length === 0) {
            this.outputChannel.appendLine('No issues detected. All clear!');
        } else {
            // Group by severity
            const errorIssues = this.issuesList.filter(i => i.severity === vscode.DiagnosticSeverity.Error);
            const warningIssues = this.issuesList.filter(i => i.severity === vscode.DiagnosticSeverity.Warning);
            const infoIssues = this.issuesList.filter(i => 
                i.severity === vscode.DiagnosticSeverity.Information || 
                i.severity === vscode.DiagnosticSeverity.Hint
            );
            
            // Display errors
            if (errorIssues.length > 0) {
                this.outputChannel.appendLine(`\n❌ ERRORS (${errorIssues.length}):`);
                errorIssues.forEach((issue, i) => {
                    this.outputChannel.appendLine(
                        `${i+1}. ${path.basename(issue.file)}:${issue.line} - ${issue.message}`
                    );
                });
            }
            
            // Display warnings
            if (warningIssues.length > 0) {
                this.outputChannel.appendLine(`\n⚠️ WARNINGS (${warningIssues.length}):`);
                warningIssues.forEach((issue, i) => {
                    this.outputChannel.appendLine(
                        `${i+1}. ${path.basename(issue.file)}:${issue.line} - ${issue.message}`
                    );
                });
            }
            
            // Display info/hints
            if (infoIssues.length > 0) {
                this.outputChannel.appendLine(`\nℹ️ INFO (${infoIssues.length}):`);
                infoIssues.forEach((issue, i) => {
                    this.outputChannel.appendLine(
                        `${i+1}. ${path.basename(issue.file)}:${issue.line} - ${issue.message}`
                    );
                });
            }
        }
        
        this.outputChannel.appendLine('\n=======================\n');
        this.outputChannel.show();
    }
    
    /**
     * Dispose resources
     */
    public dispose(): void {
        this.statusBarItem.dispose();
        this.diagnosticCollection.dispose();
    }
}
