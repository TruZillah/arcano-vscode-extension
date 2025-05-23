import * as vscode from 'vscode';

export class ProblemScanner {
    constructor(private outputChannel: vscode.OutputChannel) {}

    public registerListeners(): vscode.Disposable[] {
        const disposables: vscode.Disposable[] = [];
        
        // Add diagnostic change listener
        disposables.push(
            vscode.languages.onDidChangeDiagnostics(e => {
                this.handleDiagnosticChange(e);
            })
        );

        return disposables;
    }

    private handleDiagnosticChange(event: vscode.DiagnosticChangeEvent): void {
        for (const uri of event.uris) {
            const diagnostics = vscode.languages.getDiagnostics(uri);
            for (const diagnostic of diagnostics) {
                this.outputChannel.appendLine(
                    `[${diagnostic.severity}] ${uri.fsPath}:` +
                    `${diagnostic.range.start.line + 1} - ${diagnostic.message}`
                );
            }
        }
    }
}