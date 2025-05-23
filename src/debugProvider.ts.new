import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Provides debug configuration for Arcano tasks
 */
export class ArcanoDebugProvider implements vscode.DebugConfigurationProvider {
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }

    /**
     * Fill in default debug configuration values if they're missing
     */
    resolveDebugConfiguration(
        folder: vscode.WorkspaceFolder | undefined,
        config: vscode.DebugConfiguration,
        token?: vscode.CancellationToken
    ): vscode.DebugConfiguration | null {
        // If launch.json is missing or empty
        if (!config.type && !config.request && !config.name) {
            config.type = 'arcano';
            config.name = 'Arcano Automated Debug';
            config.request = 'launch';
            config.program = '${workspaceFolder}/scripts/sprint_manager.py';
        }

        // Ensure program is specified
        if (!config.program) {
            this.outputChannel.appendLine('❌ No program specified for Arcano debug');
            return null; // abort
        }

        // Add environment variables for debug mode
        config.env = {
            ...config.env,
            ARCANO_DEBUG: '1',
            ARCANO_DEBUG_LEVEL: '2' // Detailed logging
        };

        return config;
    }
}
