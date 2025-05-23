// filepath: c:\Users\ubeyo\OneDrive\Desktop\arcano-vscode-extension\tests\debugSystem.test.ts
import * as assert from 'assert';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import { AutomatedDebugSystem, IssueDetail } from '../src/debugSystem/index';
import { ProblemScanner } from '../src/debugSystem/problemScanner';

suite('AutomatedDebugSystem Test Suite', () => {
    let outputChannel: vscode.OutputChannel;
    let problemScanner: ProblemScanner;
    let debugSystem: AutomatedDebugSystem;
    let sandbox: sinon.SinonSandbox;

    setup(() => {
        sandbox = sinon.createSandbox();
        outputChannel = {
            name: 'Test Output',
            append: sandbox.stub(),
            appendLine: sandbox.stub(),
            clear: sandbox.stub(),
            show: sandbox.stub(),
            hide: sandbox.stub(),
            dispose: sandbox.stub(),
        } as any;

        // Create stubs for problem scanner
        problemScanner = {
            registerListeners: sandbox.stub().returns([]),
            scanFile: sandbox.stub().resolves(),
            scanWorkspace: sandbox.stub().resolves(),
            getProblemSummary: sandbox.stub().returns({
                totalProblems: 0,
                errorCount: 0,
                warningCount: 0,
                infoCount: 0,
                fileCount: 0
            }),
            dispose: sandbox.stub()
        } as any;

        // Create debug system instance
        debugSystem = new AutomatedDebugSystem(outputChannel, problemScanner);
    });

    teardown(() => {
        sandbox.restore();
        debugSystem.dispose();
    });

    test('Should create status bar item on initialization', () => {
        // Use TypeScript's private field access via any to check private properties
        const statusBarItem = (debugSystem as any).statusBarItem;
        
        assert.ok(statusBarItem, 'Status bar item should be created');
    });

    test('Should scan for issues using diagnostics API', async () => {
        // Mock getDiagnostics response
        const mockDiagnostics = new Map<vscode.Uri, vscode.Diagnostic[]>();
        
        const fileUri = vscode.Uri.file('/test/file.ts');
        const diagnostic = new vscode.Diagnostic(
            new vscode.Range(0, 0, 0, 10),
            'Test error message',
            vscode.DiagnosticSeverity.Error
        );
        
        mockDiagnostics.set(fileUri, [diagnostic]);
          // Stub languages.getDiagnostics
        // Convert the map to an array of entries for compatibility with the function return type
        const diagnosticsArray = Array.from(mockDiagnostics.entries());
        sandbox.stub(vscode.languages, 'getDiagnostics').returns(diagnosticsArray);
        // Call scanForIssues
        const issues = await debugSystem.scanForIssues();
        
        assert.strictEqual(issues.length, 1, 'Should detect one issue');
        assert.strictEqual(issues[0].message, 'Test error message', 'Should capture correct message');
        assert.strictEqual(issues[0].severity, vscode.DiagnosticSeverity.Error, 'Should capture correct severity');
    });

    test('Should generate sprint tasks from issues', async () => {
        // Set up mock issues
        const mockIssues: IssueDetail[] = [
            {
                file: '/test/file1.ts',
                message: 'Error 1',
                severity: vscode.DiagnosticSeverity.Error,
                line: 10
            },
            {
                file: '/test/file2.ts',
                message: 'Warning 1',
                severity: vscode.DiagnosticSeverity.Warning,
                line: 20
            }
        ];
        
        // Stub scanForIssues to return mock issues
        sandbox.stub(debugSystem, 'scanForIssues').resolves(mockIssues);
        
        // Mock workspace folders
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([
            {
                uri: vscode.Uri.file('/workspace'),
                name: 'workspace',
                index: 0
            }
        ]);
        
        // Mock file system calls
        const fsMock = {
            promises: {
                readFile: sandbox.stub().rejects(new Error('File not found')),
                writeFile: sandbox.stub().resolves()
            }
        };
        sandbox.stub(require('fs'), 'promises').value(fsMock.promises);
        
        // Call generateSprintTasks
        const result = await debugSystem.generateSprintTasks();
        
        // Verify file was written with tasks
        assert.strictEqual(result, true, 'Should successfully generate tasks');
        assert.strictEqual(fsMock.promises.writeFile.callCount, 1, 'Should write to sprint.md');
        
        // Check the content contains task entries
        const fileContent = fsMock.promises.writeFile.firstCall.args[1];
        assert.ok(fileContent.includes('- [ ] [ERROR] Fix Error 1'), 'Should include error task');
        assert.ok(fileContent.includes('- [ ] [WARNING] Fix Warning 1'), 'Should include warning task');
    });

    test('Should update status bar based on issue count', async () => {
        // Access private method using any type
        const updateStatusBar = (debugSystem as any).updateStatusBar.bind(debugSystem);
        const statusBarItem = (debugSystem as any).statusBarItem;
        
        // Test with zero issues
        updateStatusBar(0);
        assert.strictEqual(statusBarItem.text, '$(bug) Issues: 0', 'Should show 0 issues');
        
        // Test with few issues
        updateStatusBar(3);
        assert.strictEqual(statusBarItem.text, '$(bug) Issues: 3', 'Should show 3 issues');
        
        // Test with many issues
        updateStatusBar(10);
        assert.strictEqual(statusBarItem.text, '$(bug) Issues: 10', 'Should show 10 issues');
    });
});