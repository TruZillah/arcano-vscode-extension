"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const copilotAssist_1 = require("./copilotAssist");
const debugProvider_1 = require("./debugProvider");
const debugUI_1 = require("./debugUI");
const inputHelper_1 = require("./inputHelper");
const panel_1 = require("./panel");
const problemScanner_1 = require("./problemScanner");
const pythonBridge_1 = require("./pythonBridge");
// Global variable to store design instructions
let designInstructions = null;
/**
 * Loads design instructions from design.json
 */
async function loadDesignInstructions(context) {
    try {
        const designJsonPath = context.asAbsolutePath('docs/design.json');
        const data = await fs.promises.readFile(designJsonPath, 'utf-8');
        const instructions = JSON.parse(data);
        return instructions;
    }
    catch (err) {
        console.error('Failed to load design instructions:', err);
        vscode.window.showErrorMessage(`Failed to load design instructions: ${err instanceof Error ? err.message : String(err)}`);
        return null;
    }
}
/**
 * Formats and displays agent responses in the output channel
 */
class AgentResponseHandler {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    /**
     * Process and display agent response in the output channel
     * @param response The response text from the agent
     * @param taskName The task that was being worked on
     */
    displayResponse(response, taskName) {
        this.outputChannel.appendLine('\n==================================================');
        this.outputChannel.appendLine(`🤖 Agent Response for Task: ${taskName}`);
        this.outputChannel.appendLine('==================================================\n');
        // Format code blocks for better readability
        const formattedResponse = this.formatResponseText(response);
        this.outputChannel.appendLine(formattedResponse);
        this.outputChannel.appendLine('\n==================================================\n');
        this.outputChannel.show(true);
    }
    /**
     * Format the response text with better code block formatting
     * @param text The response text to format
     */
    formatResponseText(text) {
        // Highlight code blocks with better formatting
        let formatted = text.replace(/```([a-zA-Z]*)([\s\S]*?)```/g, (match, language, code) => {
            return `\n▶️ Code (${language || 'text'}):\n───────────────────────\n${code.trim()}\n───────────────────────\n`;
        });
        // Add bullet point highlighting
        formatted = formatted.replace(/^(\d+\.|\*|\-)\s+(.*)/gm, '• $2');
        return formatted;
    }
}
/**
 * Helper for interacting with GitHub Copilot Chat
 */
class CopilotChatHelper {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    /**
     * Opens GitHub Copilot Chat
     * @returns true if successful, false otherwise
     */
    async openChat() {
        this.outputChannel.appendLine('Opening GitHub Copilot Chat...');
        // Get all available commands
        const commands = await vscode.commands.getCommands(true);
        const copilotCommands = commands.filter(cmd => cmd.includes('copilot'));
        this.outputChannel.appendLine(`Available Copilot commands: ${copilotCommands.join(', ')}`);
        // List of commands to try (in order of preference)
        const chatCommands = [
            'workbench.action.chat.open',
            'workbench.action.chatWith',
            'github.copilot-chat.focus',
            'github.copilot.chat.focus',
            'chat.open'
        ];
        // Try each command in sequence
        for (const cmd of chatCommands) {
            try {
                this.outputChannel.appendLine(`Trying to open chat with command: ${cmd}`);
                if (cmd === 'workbench.action.chatWith') {
                    await vscode.commands.executeCommand(cmd, { provider: 'github.copilot' });
                }
                else {
                    await vscode.commands.executeCommand(cmd);
                }
                this.outputChannel.appendLine(`Successfully opened chat with ${cmd}`);
                return true;
            }
            catch (err) {
                this.outputChannel.appendLine(`Command ${cmd} failed: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
        // If we get here, all commands failed
        this.outputChannel.appendLine('Failed to open chat with any available command');
        return false;
    }
    /**
     * Sends a message to GitHub Copilot Chat
     * @param message The message to send
     * @returns true if successful, false otherwise
     */
    async sendMessage(message) {
        try {
            // First open the chat
            const chatOpened = await this.openChat();
            if (!chatOpened) {
                this.outputChannel.appendLine('Failed to open chat');
                return false;
            }
            // Get all available commands
            const commands = await vscode.commands.getCommands(true);
            // Try different ways to send a message
            const sendCommands = [
                'github.copilot.chat.sendMessage',
                'github.copilot-chat.sendMessage'
            ];
            // First try command-based sending
            for (const cmd of sendCommands) {
                if (commands.includes(cmd)) {
                    try {
                        this.outputChannel.appendLine(`Trying to send message with command: ${cmd}`);
                        await vscode.commands.executeCommand(cmd, message);
                        this.outputChannel.appendLine(`Successfully sent message with ${cmd}`);
                        return true;
                    }
                    catch (cmdErr) {
                        this.outputChannel.appendLine(`Command ${cmd} failed: ${cmdErr}`);
                    }
                }
            }
            // Try insertion commands next
            const insertCommands = [
                'github.copilot-chat.insertTextIntoPrompt',
                'github.copilot.chat.insertTextIntoPrompt'
            ];
            const acceptCommands = [
                'github.copilot-chat.acceptInput',
                'github.copilot.chat.acceptInput'
            ];
            for (const insertCmd of insertCommands) {
                if (commands.includes(insertCmd)) {
                    try {
                        this.outputChannel.appendLine(`Trying insertion with: ${insertCmd}`);
                        await vscode.commands.executeCommand(insertCmd, message);
                        // Try to accept input
                        for (const acceptCmd of acceptCommands) {
                            if (commands.includes(acceptCmd)) {
                                try {
                                    await vscode.commands.executeCommand(acceptCmd);
                                    this.outputChannel.appendLine('Successfully sent message via insert+accept method');
                                    return true;
                                }
                                catch (acceptErr) {
                                    this.outputChannel.appendLine(`Accept command ${acceptCmd} failed: ${acceptErr}`);
                                }
                            }
                        }
                    }
                    catch (insertErr) {
                        this.outputChannel.appendLine(`Insert command ${insertCmd} failed: ${insertErr}`);
                    }
                }
            }
            // Last resort: use keyboard input
            try {
                const { sendKeysToActive, submitActiveInput } = require('./inputHelper');
                await sendKeysToActive(message);
                await submitActiveInput();
                this.outputChannel.appendLine('Successfully sent message via keyboard input');
                return true;
            }
            catch (keyErr) {
                this.outputChannel.appendLine(`Keyboard input method failed: ${keyErr}`);
                return false;
            }
        }
        catch (err) {
            this.outputChannel.appendLine(`Error in sendMessage: ${err instanceof Error ? err.message : String(err)}`);
            return false;
        }
    }
    /**
     * Sends a message and captures the response
     * @param message The message to send
     * @param responseHandler The handler for processing the response
     * @param taskName The task being worked on
     * @returns true if successful, false otherwise
     */
    async sendMessageAndCaptureResponse(message, responseHandler, taskName) {
        try {
            // Try to use the language model API to get a direct response
            const response = await this.sendToLanguageModel(message);
            if (response) {
                responseHandler.displayResponse(response, taskName);
                return true;
            }
            // If that fails, open the chat UI
            await this.openChat();
            await vscode.commands.executeCommand('github.copilot.chat.sendMessage', message);
            this.outputChannel.appendLine('Successfully sent message to Copilot Chat (response will appear in chat UI)');
            return true;
        }
        catch (err) {
            this.outputChannel.appendLine(`Error sending message and capturing response: ${err}`);
            return false;
        }
    }
    /**
     * Sends a message to GitHub Copilot Language Model API (no UI)
     * @param message The message to send
     * @returns The response text, or null if failed
     */
    async sendToLanguageModel(message) {
        try {
            const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
            if (!model) {
                this.outputChannel.appendLine('No Copilot model available');
                return null;
            }
            const response = await model.sendRequest([
                vscode.LanguageModelChatMessage.User([new vscode.LanguageModelTextPart(message)])
            ], {}, new vscode.CancellationTokenSource().token);
            let fullResponse = '';
            for await (const text of response.text) {
                fullResponse += text;
            }
            return fullResponse;
        }
        catch (err) {
            this.outputChannel.appendLine(`Language model error: ${err}`);
            return null;
        }
    }
    /**
     * Generates a rich prompt with task, sprint context and design guidelines
     */
    async generateRichPrompt(task, sprintFile = null) {
        try {
            // Start with the basic task prompt
            let prompt = designInstructions?.prompts.taskStart.replace('{task}', task) ||
                `I'm working on this task: "${task}". Please help me implement it.`;
            // Add sprint context if available
            let sprintContext = '';
            if (sprintFile) {
                try {
                    const docs_path = path.join(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '', 'docs');
                    const sprintFilePath = path.join(docs_path, sprintFile);
                    const sprintData = await fs.promises.readFile(sprintFilePath, 'utf-8');
                    const tasks = JSON.parse(sprintData);
                    if (Array.isArray(tasks)) {
                        sprintContext = tasks.map(t => `- ${t.done ? '[x]' : '[ ]'} ${t.task}`).join('\n');
                    }
                }
                catch (err) {
                    this.outputChannel.appendLine(`Error reading sprint file: ${err}`);
                }
            }
            // Add design guidelines if available
            let designContext = '';
            if (designInstructions) {
                designContext = `
Agent Instructions:
${designInstructions.agentInstructions.general}
${designInstructions.agentInstructions.taskFormat}

UI Preferences:
- Primary color: ${designInstructions.uiPreferences.colors.electricBlue}
- Background: ${designInstructions.uiPreferences.colors.darkBg}
- Text color: ${designInstructions.uiPreferences.colors.silverWhite}
`;
            }
            // Combine everything using the template from design.json if available
            if (designInstructions?.prompts.contextFormat && (sprintContext || designContext)) {
                prompt = designInstructions.prompts.contextFormat
                    .replace('{task}', task)
                    .replace('{sprintContext}', sprintContext || 'No sprint context available')
                    .replace('{designContext}', designContext || 'No design context available');
            }
            return prompt;
        }
        catch (err) {
            this.outputChannel.appendLine(`Error generating rich prompt: ${err}`);
            return `I'm working on this task: "${task}". Please help me implement it.`;
        }
    }
}
function activate(context) {
    // Create output channel for debugging information
    const outputChannel = vscode.window.createOutputChannel('Arcano Debug');
    // Setup debug functionality
    // Initialize the Problem Scanner
    const problemScanner = new problemScanner_1.ProblemScanner(outputChannel);
    // Register problem scanner listeners
    const scannerDisposables = problemScanner.registerListeners();
    scannerDisposables.forEach(disposable => {
        context.subscriptions.push(disposable);
    });
    // Initialize the Debug UI
    const debugUI = new debugUI_1.ArcanoDebugUI(outputChannel); // Make sure to use ArcanoDebugUI, not DebugUI
    // Initialize debug provider
    const debugProvider = new debugProvider_1.ArcanoDebugProvider(outputChannel);
    // Register debug configuration provider
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('python', debugProvider));
    // Show debug UI in the status bar
    debugUI.show();
    // Register debug commands
    context.subscriptions.push(vscode.commands.registerCommand('arcano.showDebugOptions', () => {
        debugUI.showDebugOptions();
    }), vscode.commands.registerCommand('arcano.startAutomatedDebug', async (taskName) => {
        if (!taskName) {
            taskName = await vscode.window.showInputBox({
                prompt: 'Enter the task name to debug',
                placeHolder: 'Type the task name or leave empty to show task list'
            });
        }
        if (taskName) {
            await debugUI.debugTask(taskName); // Changed from debugSystem to debugUI
        }
        else {
            await vscode.commands.executeCommand('arcano.showDebugOptions');
        }
    }));
    // Pass the extension context to the pythonBridge module
    (0, pythonBridge_1.setExtensionContext)(context);
    // Setup panel provider
    const arcanoPanel = new panel_1.ArcanoPanelProvider(context, outputChannel);
    // Register panel provider
    context.subscriptions.push(vscode.window.registerWebviewViewProvider('arcanoTaskList', arcanoPanel));
    // Get design instructions from JSON
    loadDesignInstructions(context).then(instructions => {
        designInstructions = instructions;
    });
    // Create response handler and copilot helper
    const responseHandler = new AgentResponseHandler(outputChannel);
    const copilotHelper = new CopilotChatHelper(outputChannel);
    // Register extension commands
    context.subscriptions.push(vscode.commands.registerCommand('arcano.showDebugOutput', () => {
        outputChannel.show();
    }));
    // Register Copilot-related commands
    context.subscriptions.push(vscode.commands.registerCommand('arcano.showCopilot', async () => {
        outputChannel.appendLine('Opening GitHub Copilot Chat...');
        const success = await copilotHelper.openChat();
        if (!success) {
            vscode.window.showErrorMessage('Failed to open Copilot chat. Please ensure Copilot is properly installed and authenticated.');
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand('arcano.sendToCopilot', async (message) => {
        outputChannel.appendLine(`Sending message to Copilot: ${message}`);
        try {
            // Format the message
            const formattedMessage = `/help I need to implement this task: "${message}". Please help me with:
1. Breaking down the implementation steps
2. Suggesting which files to modify
3. Providing code examples with best practices
4. Including error handling
5. Adding proper documentation`;
            // Try Language Model API first
            try {
                const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
                if (model) {
                    const response = await model.sendRequest([
                        vscode.LanguageModelChatMessage.User([new vscode.LanguageModelTextPart(formattedMessage)])
                    ], {}, new vscode.CancellationTokenSource().token);
                    let fullResponse = '';
                    for await (const text of response.text) {
                        fullResponse += text;
                    }
                    await vscode.window.showInformationMessage('Implementation Guidance', {
                        modal: true,
                        detail: fullResponse
                    });
                    return;
                }
            }
            catch (lmErr) {
                outputChannel.appendLine(`Language Model API failed: ${lmErr}, trying chat commands...`);
            }
            // Try each chat command in sequence
            const commands = [
                'github.copilot-chat.focus',
                'workbench.action.chatWith',
                'chat.open'
            ];
            let success = false;
            for (const cmd of commands) {
                try {
                    outputChannel.appendLine(`Trying command: ${cmd}`);
                    if (cmd === 'workbench.action.chatWith') {
                        await vscode.commands.executeCommand(cmd, { provider: 'github.copilot' });
                    }
                    else {
                        await vscode.commands.executeCommand(cmd);
                    }
                    success = true;
                    break;
                }
                catch (cmdErr) {
                    outputChannel.appendLine(`Command ${cmd} failed: ${cmdErr}`);
                    continue;
                }
            }
            if (!success) {
                throw new Error('All chat commands failed');
            }
            // Wait longer for chat to be ready
            await new Promise(resolve => setTimeout(resolve, 2000));
            await (0, inputHelper_1.sendKeysToActive)(formattedMessage);
            await (0, inputHelper_1.submitActiveInput)();
            outputChannel.appendLine('Message sent successfully');
        }
        catch (err) {
            outputChannel.appendLine(`Error sending to Copilot chat: ${err}`);
            vscode.window.showErrorMessage('Failed to send message to Copilot. Please ensure Copilot is properly installed and authenticated.');
        }
    }));
    // Register the Copilot assist command
    context.subscriptions.push(vscode.commands.registerCommand('arcano.copilotAssist', async (taskLabel) => {
        await (0, copilotAssist_1.insertCopilotHint)(taskLabel);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('arcano.startSprint', async () => {
        const sprintName = await vscode.window.showInputBox({
            prompt: 'Enter sprint name to run',
            placeHolder: 'e.g. Deck Sharing'
        });
        if (sprintName) {
            await (0, pythonBridge_1.runSprintManager)(['--run', sprintName]);
        }
    }));
    // Register the task flow command
    context.subscriptions.push(vscode.commands.registerCommand('arcano.taskFlow', async () => {
        outputChannel.appendLine('Starting task flow...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        outputChannel.appendLine('Task flow completed successfully');
    }));
}
exports.activate = activate;
