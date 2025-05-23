import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { sendKeysToActive, submitActiveInput } from './inputHelper';

/**
 * Sends a task to GitHub Copilot Chat for assistance with implementation.
 */
export async function insertCopilotHint(taskLabel: string) {
  try {
    // First, create or show an untitled file to host our conversation
    const document = await vscode.workspace.openTextDocument({ 
      content: '',
      language: 'markdown' 
    });
    const editor = await vscode.window.showTextDocument(document);

    // Insert our task description
    await editor.edit((editBuilder: vscode.TextEditorEdit) => {
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
  } catch (err) {
    vscode.window.showErrorMessage('Failed to start chat: ' + (err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Replies to a detected Copilot suggestion prompt by injecting text automatically.
 * Currently simulated via snippet insertion — later can hook into Copilot CLI or API.
 */
export async function replyToCopilotFollowUp(reply: string) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  await editor.insertSnippet(new vscode.SnippetString(reply));
  vscode.window.showInformationMessage('💬 Replied to Copilot suggestion.');
}

/**
 * Generate automated responses to Copilot questions based on task context
 */
export async function respondToCopilot(context: { question: string, task: string }) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const response = generateContextualResponse(context.question, context.task);
  if (!response) return;

  // Insert response below the question
  const position = editor.selection.active;
  await editor.edit(editBuilder => {
    editBuilder.insert(position, `\n// ${response}\n`);
  });

  // Trigger new suggestion
  await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
}

/**
 * Generate contextual responses to common Copilot questions
 */
function generateContextualResponse(question: string, taskContext: string): string | null {
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
export function detectCopilotPrompt(lineText: string): string | null {
  if (lineText.includes('?') || lineText.toLowerCase().includes('should i')) {
    return generateContextualResponse(lineText, '');
  }
  return null;
}

/**
 * Starts a task by sending the task name to GitHub Copilot Chat.
 * Uses VS Code's chat API and command system directly.
 */
export async function startTaskFlow(
  taskName: string,
  outputChannel: vscode.OutputChannel
): Promise<boolean> {
  // Format a comprehensive prompt
  const finalPrompt = `I want to start working on this task: "${taskName}". 
Please help me implement it with:
1. A step-by-step implementation plan
2. Key files to create or modify
3. Code examples for the core functionality
4. Best practices to follow`;

  try {
    outputChannel.appendLine(`Starting task flow for: ${taskName}`);
    const commands = await vscode.commands.getCommands(true);
    
    // First try: Use the modern built-in VS Code chat API with direct query
    try {
      if (commands.includes('workbench.action.chat.open')) {
        outputChannel.appendLine('Using workbench.action.chat.open with direct query');
        await vscode.commands.executeCommand('workbench.action.chat.open', {
          query: finalPrompt,
          provider: 'copilot'
        });
        outputChannel.appendLine('Successfully opened chat with query');
        return true;
      }
    } catch (err) {
      outputChannel.appendLine(`Direct query method failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Second try: Open the chat first, then use API commands to send the message
    try {
      // Try to open the chat
      for (const cmd of ['workbench.action.chat.open', 'workbench.action.chatWith', 'chat.open']) {
        if (commands.includes(cmd)) {
          try {
            outputChannel.appendLine(`Trying to open chat with: ${cmd}`);
            if (cmd === 'workbench.action.chatWith') {
              await vscode.commands.executeCommand(cmd, { provider: 'github.copilot' });
            } else {
              await vscode.commands.executeCommand(cmd);
            }
            outputChannel.appendLine(`Successfully opened chat with ${cmd}`);
            break;
          } catch (cmdErr) {
            outputChannel.appendLine(`Command ${cmd} failed: ${cmdErr instanceof Error ? cmdErr.message : String(cmdErr)}`);
          }
        }
      }
      
      // Give the UI time to initialize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Now try to send the message with API commands
      if (commands.includes('chat.acceptInput')) {
        // First set the input text if possible
        if (commands.includes('chat.insertInput')) {
          await vscode.commands.executeCommand('chat.insertInput', finalPrompt);
        }
        
        // Then submit it
        await vscode.commands.executeCommand('chat.acceptInput');
        outputChannel.appendLine('Successfully sent message via chat.acceptInput');
        return true;
      }
    } catch (err) {
      outputChannel.appendLine(`API command approach failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    
    // Third try: Use inline chat as a fallback
    try {
      outputChannel.appendLine('Trying inline chat approach');
      
      // Create a new untitled document to use for the Copilot interaction
      const doc = await vscode.workspace.openTextDocument({ content: '', language: 'markdown' });
      const editor = await vscode.window.showTextDocument(doc);
      
      // Insert the task description
      await editor.edit(edit => {
        edit.insert(new vscode.Position(0, 0), `# Task: ${taskName}\n\n${finalPrompt}`);
      });
      
      // Start inline chat with the selected text
      editor.selection = new vscode.Selection(
        new vscode.Position(0, 0),
        new vscode.Position(editor.document.lineCount, 0)
      );
      
      await vscode.commands.executeCommand('inlineChat.start');
      outputChannel.appendLine('Successfully initiated inline chat for the task');
      
      vscode.window.showInformationMessage(`Task "${taskName}" opened for Copilot assistance. Please interact with the inline chat.`);
      return true;
    } catch (inlineErr) {
      outputChannel.appendLine(`Inline chat approach failed: ${inlineErr instanceof Error ? inlineErr.message : String(inlineErr)}`);
    }
    
    // Fourth try: Fall back to the language model API if available
    try {
      outputChannel.appendLine('Trying language model API approach');
      const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
      if (model) {
        const messages = [
          vscode.LanguageModelChatMessage.User([
            new vscode.LanguageModelTextPart(finalPrompt)
          ])
        ];
        
        await vscode.window.withProgress({
          location: vscode.ProgressLocation.Notification,
          title: `Getting assistance for task: ${taskName}...`,
          cancellable: false
        }, async () => {
          const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
          
          let fullResponse = '';
          for await (const text of response.text) {
            fullResponse += text;
          }
          
          await vscode.window.showInformationMessage(`Task: ${taskName}`, { 
            modal: true, 
            detail: fullResponse 
          });
        });
        
        return true;
      }
    } catch (lmErr) {
      outputChannel.appendLine(`Language model API approach failed: ${lmErr instanceof Error ? lmErr.message : String(lmErr)}`);
    }
    
    // As a last resort, show the message to the user
    vscode.window.showInformationMessage(
      `Could not automatically send task "${taskName}" to Copilot. Please manually open Copilot Chat and paste the following prompt:`, 
      { modal: true, detail: finalPrompt }
    );
    
    return false;
  } catch (err) {
    outputChannel.appendLine(`All methods failed when sending task: ${err instanceof Error ? err.message : String(err)}`);
    vscode.window.showErrorMessage(
      `Failed to send task to Copilot: ${err instanceof Error ? err.message : String(err)}`
    );
    return false;
  }
}
