arcano-vscode-extension/
├── src/
│   ├── debugSystem/
│   │   ├── index.ts               (debug system implementation)
│   │   └── problemScanner.ts      (problem scanner implementation)
│   ├── test/
│   │   ├── runTest.ts            (test runner)
│   │   └── suite/
│   │       ├── index.ts          (test suite setup)
│   │       └── debugSystem.test.ts (test file)
│   └── extension.ts              (main extension file)

* import * as vscode from 'vscode';
* import { AutomatedDebugSystem } from './debugSystem';
// ...existing code...

* export { AutomatedDebugSystem } from './AutomatedDebugSystem';
* export { ProblemScanner } from './problemScanner';
* export interface IssueDetail {
    // ...interface definition...
}
### Test Runner Setup

import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index');
        await runTests({ extensionDevelopmentPath, extensionTestsPath });
    } catch (err) {
        console.error('Failed to run tests:', err);
        process.exit(1);
    }
}

main();

## Test Suite:
:\Users\pmbmt\Desktop\ArcanoSprint\arcano-vscode-extension\src\test\suite\index.ts
import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });
    const testsRoot = path.resolve(__dirname, '.');
    
    return new Promise((c, e) => {
        glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
            if (err) return e(err);
            files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
            try {
                mocha.run(failures => failures > 0 ? e(new Error(`${failures} tests failed.`)) : c());
            } catch (err) { e(err); }
        });
    });
}