import * as assert from 'assert';
import * as vscode from 'vscode';
import { ProblemScanner } from '../../src/debugSystem/problemScanner';

suite('Debug System Test Suite', () => {
    let outputChannel: vscode.OutputChannel;
    
    setup(() => {
        outputChannel = vscode.window.createOutputChannel('Test Debug');
    });

    teardown(() => {
        outputChannel.dispose();
    });

    test('ProblemScanner initialization', () => {
        const scanner = new ProblemScanner(outputChannel);
        assert.ok(scanner, 'Scanner should initialize');
    });

    test('ProblemScanner registers listeners', () => {
        const scanner = new ProblemScanner(outputChannel);
        const disposables = scanner.registerListeners();
        assert.ok(disposables.length > 0, 'Should register at least one listener');
    });
});