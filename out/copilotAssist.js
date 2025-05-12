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
exports.startTaskFlow = exports.detectCopilotPrompt = exports.respondToCopilot = exports.replyToCopilotFollowUp = exports.insertCopilotHint = void 0;
const vscode = __importStar(require("vscode"));
const inputHelper_1 = require("./inputHelper");
/**
 * Sends a task to GitHub Copilot Chat for assistance with implementation.
 */
async function insertCopilotHint(taskLabel) {
    try {
        // First, create or show an untitled file to host our conversation
        const document = await vscode.workspace.openTextDocument({
            content: '',
            language: 'markdown'
        });
        const editor = await vscode.window.showTextDocument(document);
        // Insert our task description
        await editor.edit((editBuilder) => {
            const text = `# Implementation Task: ${taskLabel}

I need help implementing this feature:
- Task: ${taskLabel}
- Priority: High
- Guidelines: 
  - Follow best practices
  - Include error handling
  - Add proper documentation
  - Consider scalability

Please provide step-by-step guidance on how to implement this feature.`;
            editBuilder.insert(new vscode.Position(0, 0), text);
        });
        // Move cursor to the end of our text
        const position = new vscode.Position(editor.document.lineCount, 0);
        editor.selection = new vscode.Selection(position, position);
        // Trigger inline chat
        await vscode.commands.executeCommand('inlineChat.start');
    }
    catch (err) {
        vscode.window.showErrorMessage('Failed to start chat: ' + (err instanceof Error ? err.message : String(err)));
    }
}
exports.insertCopilotHint = insertCopilotHint;
/**
 * Replies to a detected Copilot suggestion prompt by injecting text automatically.
 * Currently simulated via snippet insertion — later can hook into Copilot CLI or API.
 */
async function replyToCopilotFollowUp(reply) {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    await editor.insertSnippet(new vscode.SnippetString(reply));
    vscode.window.showInformationMessage('💬 Replied to Copilot suggestion.');
}
exports.replyToCopilotFollowUp = replyToCopilotFollowUp;
/**
 * Generate automated responses to Copilot questions based on task context
 */
async function respondToCopilot(context) {
    const editor = vscode.window.activeTextEditor;
    if (!editor)
        return;
    const response = generateContextualResponse(context.question, context.task);
    if (!response)
        return;
    // Insert response below the question
    const position = editor.selection.active;
    await editor.edit(editBuilder => {
        editBuilder.insert(position, `\n// ${response}\n`);
    });
    // Trigger new suggestion
    await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
}
exports.respondToCopilot = respondToCopilot;
/**
 * Generate contextual responses to common Copilot questions
 */
function generateContextualResponse(question, taskContext) {
    // Normalize question for matching
    const q = question.toLowerCase();
    // File creation questions
    if (q.includes('create') && q.includes('file')) {
        return 'Yes, please create any necessary files following the project structure.';
    }
    // Framework/library questions
    if (q.includes('use') && (q.includes('framework') || q.includes('library'))) {
        return 'Yes, use modern and well-maintained libraries that best fit the task requirements.';
    }
    // Testing questions
    if (q.includes('test')) {
        return 'Yes, please include unit tests for the new functionality.';
    }
    // API questions
    if (q.includes('api') || q.includes('endpoint')) {
        return 'Yes, implement RESTful API endpoints following best practices.';
    }
    // Database questions
    if (q.includes('database') || q.includes('storage')) {
        return 'Use appropriate data storage that fits the project requirements.';
    }
    // Default response encouraging continuation
    return 'Yes, please proceed with your suggested approach.';
}
/**
 * Detects simple Copilot-like questions and answers with pre-programmed logic.
 * Extend with LLM calls or GitHub Copilot API later.
 */
function detectCopilotPrompt(lineText) {
    if (lineText.includes('?') || lineText.toLowerCase().includes('should i')) {
        return generateContextualResponse(lineText, '');
    }
    return null;
}
exports.detectCopilotPrompt = detectCopilotPrompt;
/**
 * Starts a task by sending the task name to GitHub Copilot Chat.
 * Simple implementation focused only on sending the task to Copilot.
 */
async function startTaskFlow(taskName, outputChannel) {
    // Check if sendMessage command is available
    const commands = await vscode.commands.getCommands(true);
    const hasSendApi = commands.includes('github.copilot.chat.sendMessage');
    // Simple prompt with just the task name
    const finalPrompt = `I want to start working on this task: "${taskName}". Please help me implement it.`;
    // Try multiple approaches to open Copilot Chat and send the message
    try {
        // Try opening Copilot Chat using workbench.action.chat.open which is the most reliable method
        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', finalPrompt);
            outputChannel.appendLine(`Opened chat with workbench.action.chat.open and sent: ${taskName}`);
            return true;
        }
        catch (err) {
            outputChannel.appendLine(`workbench.action.chat.open failed: ${err}`);
        }
        // Try with explicit focus and send
        try {
            await vscode.commands.executeCommand('github.copilot.chat.focus');
            await vscode.commands.executeCommand('github.copilot.chat.sendMessage', finalPrompt);
            outputChannel.appendLine(`Sent task via focus+sendMessage: ${taskName}`);
            return true;
        }
        catch (err) {
            outputChannel.appendLine(`focus+sendMessage failed: ${err}`);
        }
        // Last resort: try to focus and use keystrokes
        await vscode.commands.executeCommand('github.copilot.chat.focus');
        // Wait for the view to be ready
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Send keystrokes and submit
        await (0, inputHelper_1.sendKeysToActive)(finalPrompt);
        await (0, inputHelper_1.submitActiveInput)();
        outputChannel.appendLine(`Sent task via keystrokes: ${taskName}`);
        return true;
    }
    catch (err) {
        outputChannel.appendLine(`All methods failed when sending task: ${err}`);
        vscode.window.showErrorMessage(`Failed to send Start Task: ${err instanceof Error ? err.message : String(err)}`);
        return false;
    }
}
exports.startTaskFlow = startTaskFlow;
