/// <reference types="mocha" />

import * as assert from 'assert';
import * as vscode from 'vscode';
import { AutomatedDebugSystem } from '../../debugSystem';
import { ProblemScanner } from '../../debugSystem/problemScanner';

suite('Debug System Test Suite', () => {
    let outputChannel: vscode.OutputChannel;
    let problemScanner: ProblemScanner;
    let debugSystem: AutomatedDebugSystem;

    setup(() => {
        outputChannel = vscode.window.createOutputChannel('Test Debug');
        problemScanner = new ProblemScanner(outputChannel);
        debugSystem = new AutomatedDebugSystem(outputChannel, problemScanner);
    });

    teardown(() => {
        outputChannel.dispose();
        debugSystem.dispose();
    });

    test('Problem Scanner Initialization', () => {
        assert.ok(problemScanner instanceof ProblemScanner);
    });

    test('Register Listeners Returns Disposables', () => {
        const disposables = problemScanner.registerListeners();
        assert.ok(Array.isArray(disposables));
        assert.ok(disposables.length > 0);
    });
});
