import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    test('Basic test', () => {
        assert.strictEqual(1 + 1, 2);
    });

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('publisher.arcano-sprint-manager'));
    });
});