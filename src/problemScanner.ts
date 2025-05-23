import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Main class for automated problem scanning using VS Code's built-in diagnostic tools
 */
export class ProblemScanner {
    private outputChannel: vscode.OutputChannel;
    private diagnosticCollection: vscode.DiagnosticCollection;
    private fileProblems: Map<string, { problems: vscode.Diagnostic[], lastScan: number }>;
    private scanDebounceTimeout: NodeJS.Timeout | undefined;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.diagnosticCollection = vscode.languages.createDiagnosticCollection('arcanoProblemScanner');
        this.fileProblems = new Map();
    }

    /**
     * Register file watchers and other event listeners
     */
    public registerListeners(): vscode.Disposable[] {
        const disposables: vscode.Disposable[] = [];

        // Watch for file changes
        const fileWatcher = vscode.workspace.createFileSystemWatcher('**/*.{js,ts,py,json,md}');
        
        disposables.push(
            fileWatcher.onDidChange(uri => this.queueFileScan(uri)),
            fileWatcher.onDidCreate(uri => this.queueFileScan(uri))
        );
        
        disposables.push(fileWatcher);

        // Watch for active editor changes
        disposables.push(
            vscode.window.onDidChangeActiveTextEditor(editor => {
                if (editor) {
                    this.queueFileScan(editor.document.uri);
                }
            })
        );

        // Watch for document saves
        disposables.push(
            vscode.workspace.onDidSaveTextDocument(document => {
                this.queueFileScan(document.uri);
            })
        );

        return disposables;
    }

    /**
     * Queue a file for scanning with debounce
     */
    private queueFileScan(uri: vscode.Uri): void {
        // Clear any existing timeout
        if (this.scanDebounceTimeout) {
            clearTimeout(this.scanDebounceTimeout);
        }

        // Set new timeout for scanning
        this.scanDebounceTimeout = setTimeout(() => {
            this.scanFile(uri);
        }, 500); // Debounce for 500ms
    }

    /**
     * Scan a file for problems using appropriate linters/validators
     */
    public async scanFile(uri: vscode.Uri): Promise<void> {
        const filePath = uri.fsPath;
        const fileExt = path.extname(filePath).toLowerCase();
        
        // Skip non-project files
        if (filePath.includes('node_modules') || filePath.includes('.git')) {
            return;
        }

        try {
            this.outputChannel.appendLine(`🔍 Scanning file for problems: ${filePath}`);
            
            let problems: vscode.Diagnostic[] = [];

            // Use different scanning strategies based on file type
            switch (fileExt) {
                case '.ts':
                case '.js':
                    problems = await this.scanJavaScriptFile(uri);
                    break;
                case '.py':
                    problems = await this.scanPythonFile(uri);
                    break;
                case '.json':
                    problems = await this.scanJsonFile(uri);
                    break;
                case '.md':
                    problems = await this.scanMarkdownFile(uri);
                    break;
                default:
                    // For other files, we can still do basic checks
                    problems = await this.scanGenericFile(uri);
            }

            // Update diagnostics
            this.diagnosticCollection.set(uri, problems);

            // Store scan results
            this.fileProblems.set(filePath, {
                problems,
                lastScan: Date.now()
            });

            this.outputChannel.appendLine(`✅ Found ${problems.length} problems in ${filePath}`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error scanning ${filePath}: ${error}`);
        }
    }

    /**
     * Scan a JavaScript/TypeScript file
     */
    private async scanJavaScriptFile(uri: vscode.Uri): Promise<vscode.Diagnostic[]> {
        const diagnostics: vscode.Diagnostic[] = [];
        
        try {
            // Get the document
            const document = await vscode.workspace.openTextDocument(uri);
            const text = document.getText();
            
            // Basic syntax checks
            this.checkForBasicSyntaxErrors(text, diagnostics, document);
            
            // Check for console.log statements in non-test files
            if (!uri.fsPath.includes('test')) {
                this.checkForConsoleStatements(text, diagnostics, document);
            }
            
            // Check for TODO comments
            this.checkForTodoComments(text, diagnostics, document);
            
            // Use VS Code's built-in TypeScript service
            const vsDiags = await vscode.languages.getDiagnostics(uri);
            
            if (vsDiags && vsDiags.length > 0) {
                vsDiags.forEach(diag => {
                    // Only add if not already present (avoid duplicates)
                    const exists = diagnostics.some(existing => 
                        existing.range.isEqual(diag.range) && 
                        existing.message === diag.message
                    );
                    
                    if (!exists) {
                        diagnostics.push(diag);
                    }
                });
            }
        } catch (error) {
            this.outputChannel.appendLine(`Error in JS/TS scan: ${error}`);
        }
        
        return diagnostics;
    }

    /**
     * Scan a Python file
     */
    private async scanPythonFile(uri: vscode.Uri): Promise<vscode.Diagnostic[]> {
        const diagnostics: vscode.Diagnostic[] = [];
        
        try {
            // Get the document
            const document = await vscode.workspace.openTextDocument(uri);
            const text = document.getText();
            
            // Check for syntax problems
            this.checkForBasicSyntaxErrors(text, diagnostics, document);
            
            // Check for print statements
            this.checkForPrintStatements(text, diagnostics, document);
            
            // Check for TODO comments
            this.checkForTodoComments(text, diagnostics, document);
            
            // Check for missing functions in sprint_manager.py
            if (uri.fsPath.includes('sprint_manager.py')) {
                this.checkForMissingSprintManagerFunctions(text, diagnostics, document);
            }
        } catch (error) {
            this.outputChannel.appendLine(`Error in Python scan: ${error}`);
        }
        
        return diagnostics;
    }

    /**
     * Scan a JSON file
     */
    private async scanJsonFile(uri: vscode.Uri): Promise<vscode.Diagnostic[]> {
        const diagnostics: vscode.Diagnostic[] = [];
        
        try {
            // Get the document
            const document = await vscode.workspace.openTextDocument(uri);
            const text = document.getText();
            
            // Check if it's valid JSON
            try {
                JSON.parse(text);
            } catch (jsonError: any) {
                const errorMessage = jsonError.message || 'Invalid JSON';
                const match = errorMessage.match(/at position (\d+)/);
                let position = 0;
                
                if (match && match[1]) {
                    position = parseInt(match[1], 10);
                }
                
                const positionObj = document.positionAt(position);
                const range = new vscode.Range(positionObj, positionObj.translate(0, 1));
                
                diagnostics.push(new vscode.Diagnostic(
                    range,
                    `JSON syntax error: ${errorMessage}`,
                    vscode.DiagnosticSeverity.Error
                ));
            }
            
            // Check for specific JSON files
            if (uri.fsPath.includes('package.json')) {
                this.checkPackageJson(text, diagnostics, document);
            } else if (uri.fsPath.includes('sprint.json')) {
                this.checkSprintJson(text, diagnostics, document);
            }
        } catch (error) {
            this.outputChannel.appendLine(`Error in JSON scan: ${error}`);
        }
        
        return diagnostics;
    }

    /**
     * Scan a Markdown file
     */
    private async scanMarkdownFile(uri: vscode.Uri): Promise<vscode.Diagnostic[]> {
        const diagnostics: vscode.Diagnostic[] = [];
        
        try {
            // Get the document
            const document = await vscode.workspace.openTextDocument(uri);
            const text = document.getText();
            
            // Check for broken links
            this.checkForBrokenLinks(text, diagnostics, document);
            
            // Check for TODO items
            this.checkForTodoItems(text, diagnostics, document);
            
            // If it's a sprint.md file, check for task format
            if (uri.fsPath.includes('sprint.md')) {
                this.checkSprintMarkdown(text, diagnostics, document);
            }
        } catch (error) {
            this.outputChannel.appendLine(`Error in Markdown scan: ${error}`);
        }
        
        return diagnostics;
    }

    /**
     * Generic file scanning for any file type
     */
    private async scanGenericFile(uri: vscode.Uri): Promise<vscode.Diagnostic[]> {
        const diagnostics: vscode.Diagnostic[] = [];
        
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const text = document.getText();
            
            // Check for excessively long lines
            const lines = text.split('\n');
            lines.forEach((line, index) => {
                if (line.length > 120) {
                    const range = new vscode.Range(index, 0, index, line.length);
                    diagnostics.push(new vscode.Diagnostic(
                        range,
                        'Line exceeds 120 characters',
                        vscode.DiagnosticSeverity.Information
                    ));
                }
            });
        } catch (error) {
            this.outputChannel.appendLine(`Error in generic file scan: ${error}`);
        }
        
        return diagnostics;
    }

    // Helper methods for different types of checks

    /**
     * Check for basic syntax errors in code files
     */
    private checkForBasicSyntaxErrors(text: string, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        // Unmatched brackets, parentheses, etc.
        const brackets: {[key: string]: string} = { '{': '}', '[': ']', '(': ')', '<': '>' };
        const stack: { char: string, pos: number }[] = [];
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            if (Object.keys(brackets).includes(char)) {
                stack.push({ char, pos: i });
            } else if (Object.values(brackets).includes(char)) {
                if (stack.length === 0) {
                    const pos = document.positionAt(i);
                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(pos, pos.translate(0, 1)),
                        `Unmatched closing bracket: ${char}`,
                        vscode.DiagnosticSeverity.Error
                    ));
                } else {
                    const lastBracket = stack.pop();
                    if (lastBracket && brackets[lastBracket.char] !== char) {
                        const pos = document.positionAt(i);
                        diagnostics.push(new vscode.Diagnostic(
                            new vscode.Range(pos, pos.translate(0, 1)),
                            `Mismatched bracket: expected ${brackets[lastBracket.char]}, found ${char}`,
                            vscode.DiagnosticSeverity.Error
                        ));
                    }
                }
            }
        }
        
        // Report any unclosed brackets
        stack.forEach(item => {
            const pos = document.positionAt(item.pos);
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(pos, pos.translate(0, 1)),
                `Unclosed bracket: ${item.char}`,
                vscode.DiagnosticSeverity.Error
            ));
        });
    }

    /**
     * Check for console.log statements in production code
     */
    private checkForConsoleStatements(text: string, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        const consoleRegex = /console\.(log|debug|info|warn|error)\(/g;
        let match;
        
        while ((match = consoleRegex.exec(text)) !== null) {
            const pos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(pos, endPos),
                `Consider removing console.${match[1]} in production code`,
                vscode.DiagnosticSeverity.Information
            ));
        }
    }

    /**
     * Check for print statements in Python code
     */
    private checkForPrintStatements(text: string, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        const printRegex = /\bprint\(/g;
        let match;
        
        while ((match = printRegex.exec(text)) !== null) {
            const pos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(pos, endPos),
                'Consider using logging instead of print statements',
                vscode.DiagnosticSeverity.Information
            ));
        }
    }

    /**
     * Check for TODO comments in code
     */
    private checkForTodoComments(text: string, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        const todoRegex = /\/\/\s*TODO|\/\*\s*TODO|#\s*TODO/g;
        let match;
        
        while ((match = todoRegex.exec(text)) !== null) {
            const pos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(pos, endPos),
                'TODO comment found',
                vscode.DiagnosticSeverity.Information
            ));
        }
    }

    /**
     * Check sprint_manager.py for missing functions
     */
    private checkForMissingSprintManagerFunctions(text: string, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        const requiredFunctions = [
            'load_tasks_from_any_json_or_md',
            'save_tasks_to_json',
            'list_sprint_files',
            'start_task',
            'run_sprint',
            'mark_task_done',
            'show_status',
            'toggle_task_status'
        ];
        
        for (const funcName of requiredFunctions) {
            const funcRegex = new RegExp(`def\\s+${funcName}\\s*\\(`, 'g');
            if (!funcRegex.test(text)) {
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(0, 0, 0, 10),
                    `Missing required function: ${funcName}`,
                    vscode.DiagnosticSeverity.Warning
                ));
            }
        }
        
        // Check for incomplete functions
        const incompleteRegex = /(def\s+\w+\s*\([^)]*\):)(?:\s*(?:#[^\n]*\n|\n))*\s*(?:pass|\.\.\.)/g;
        let match;
        
        while ((match = incompleteRegex.exec(text)) !== null) {
            const pos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(pos, endPos),
                'Incomplete function implementation',
                vscode.DiagnosticSeverity.Warning
            ));
        }
    }

    /**
     * Check package.json for common issues
     */
    private checkPackageJson(text: string, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        try {
            const packageJson = JSON.parse(text);
            
            // Check for missing fields
            const requiredFields = ['name', 'version', 'engines', 'activationEvents', 'main', 'contributes'];
            for (const field of requiredFields) {
                if (!packageJson[field]) {
                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(0, 0, 0, 1),
                        `Missing required field in package.json: ${field}`,
                        vscode.DiagnosticSeverity.Warning
                    ));
                }
            }
            
            // Check for invalid commands
            if (packageJson.contributes && packageJson.contributes.commands) {
                for (const cmd of packageJson.contributes.commands) {
                    if (!cmd.command || !cmd.command.startsWith('arcano.')) {
                        const cmdIndex = text.indexOf(`"command": "${cmd.command || ''}"`);
                        if (cmdIndex !== -1) {
                            const pos = document.positionAt(cmdIndex);
                            const endPos = document.positionAt(cmdIndex + (cmd.command?.length || 0) + 12); // +12 for "command": ""
                            
                            diagnostics.push(new vscode.Diagnostic(
                                new vscode.Range(pos, endPos),
                                'Command should start with "arcano." prefix',
                                vscode.DiagnosticSeverity.Warning
                            ));
                        }
                    }
                }
            }
        } catch (error) {
            // JSON parse error already handled in scanJsonFile
        }
    }

    /**
     * Check sprint.json for task format issues
     */
    private checkSprintJson(text: string, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        try {
            const sprintJson = JSON.parse(text);
            
            if (!Array.isArray(sprintJson)) {
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(0, 0, 0, 10),
                    'sprint.json should contain an array of tasks',
                    vscode.DiagnosticSeverity.Error
                ));
                return;
            }
            
            sprintJson.forEach((task, index) => {
                if (!task.task) {
                    const taskStartIndex = text.indexOf(`{`, text.indexOf(`[`) + index);
                    const pos = document.positionAt(taskStartIndex);
                    
                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(pos, pos.translate(0, 1)),
                        'Task missing "task" property',
                        vscode.DiagnosticSeverity.Error
                    ));
                }
                
                if (task.done === undefined) {
                    const taskStartIndex = text.indexOf(`{`, text.indexOf(`[`) + index);
                    const pos = document.positionAt(taskStartIndex);
                    
                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(pos, pos.translate(0, 1)),
                        'Task missing "done" property',
                        vscode.DiagnosticSeverity.Error
                    ));
                }
            });
        } catch (error) {
            // JSON parse error already handled in scanJsonFile
        }
    }

    /**
     * Check for broken links in markdown files
     */
    private async checkForBrokenLinks(text: string, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): Promise<void> {
        // Match markdown links [text](url)
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        
        while ((match = linkRegex.exec(text)) !== null) {
            const [, , url] = match;
            
            // Check for local file references
            if (!url.startsWith('http') && !url.startsWith('#')) {
                // Get the directory of the current file
                const dirPath = path.dirname(document.uri.fsPath);
                const targetPath = path.resolve(dirPath, url);
                
                // Check if file exists
                try {
                    await vscode.workspace.fs.stat(vscode.Uri.file(targetPath));
                    // File exists, no problem
                } catch (error) {
                    // File doesn't exist
                    const linkStart = match.index + match[1].length + 3; // +3 for "]("
                    const pos = document.positionAt(linkStart);
                    const endPos = document.positionAt(linkStart + url.length);
                    
                    diagnostics.push(new vscode.Diagnostic(
                        new vscode.Range(pos, endPos),
                        `Broken link: ${url}`,
                        vscode.DiagnosticSeverity.Warning
                    ));
                }
            }
        }
    }

    /**
     * Check for TODO items in markdown
     */
    private checkForTodoItems(text: string, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        // Match TODO items: - [ ] Task description
        const todoRegex = /- \[ \] (.*?)$/gm;
        let match;
        
        while ((match = todoRegex.exec(text)) !== null) {
            const pos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            
            diagnostics.push(new vscode.Diagnostic(
                new vscode.Range(pos, endPos),
                `Uncompleted task: ${match[1]}`,
                vscode.DiagnosticSeverity.Information
            ));
        }
    }

    /**
     * Check sprint.md for proper task format
     */
    private checkSprintMarkdown(text: string, diagnostics: vscode.Diagnostic[], document: vscode.TextDocument): void {
        const lines = text.split('\n');
        let lineIndex = 0;
        
        for (const line of lines) {
            // Check for task items with wrong format
            if (line.trim().startsWith('-') && !line.match(/- \[[x ]\] /)) {
                const pos = new vscode.Position(lineIndex, line.indexOf('-'));
                const endPos = new vscode.Position(lineIndex, line.length);
                
                diagnostics.push(new vscode.Diagnostic(
                    new vscode.Range(pos, endPos),
                    'Task item should have format: - [ ] Task description or - [x] Task description',
                    vscode.DiagnosticSeverity.Warning
                ));
            }
            
            lineIndex++;
        }
    }

    /**
     * Scan all files in the workspace
     */
    public async scanWorkspace(): Promise<void> {
        this.outputChannel.appendLine('🔍 Starting full workspace scan...');
        
        try {
            // Find all relevant files
            const files = await vscode.workspace.findFiles(
                '**/*.{js,ts,py,json,md}',
                '**/node_modules/**'
            );
            
            this.outputChannel.appendLine(`Found ${files.length} files to scan`);
            
            // Scan each file
            for (const file of files) {
                await this.scanFile(file);
            }
            
            this.outputChannel.appendLine('✅ Workspace scan complete');
        } catch (error) {
            this.outputChannel.appendLine(`❌ Error during workspace scan: ${error}`);
        }
    }

    /**
     * Get summary of problems
     */
    public getProblemSummary(): {
        totalProblems: number,
        errorCount: number,
        warningCount: number,
        infoCount: number,
        fileCount: number
    } {
        let totalProblems = 0;
        let errorCount = 0;
        let warningCount = 0;
        let infoCount = 0;
        
        // Count problems by severity
        this.fileProblems.forEach(data => {
            totalProblems += data.problems.length;
            
            data.problems.forEach(problem => {
                switch (problem.severity) {
                    case vscode.DiagnosticSeverity.Error:
                        errorCount++;
                        break;
                    case vscode.DiagnosticSeverity.Warning:
                        warningCount++;
                        break;
                    case vscode.DiagnosticSeverity.Information:
                    case vscode.DiagnosticSeverity.Hint:
                        infoCount++;
                        break;
                }
            });
        });
        
        return {
            totalProblems,
            errorCount,
            warningCount,
            infoCount,
            fileCount: this.fileProblems.size
        };
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        if (this.scanDebounceTimeout) {
            clearTimeout(this.scanDebounceTimeout);
        }
        this.diagnosticCollection.dispose();
    }
}
