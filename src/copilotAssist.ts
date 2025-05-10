import * as vscode from 'vscode';

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
    await editor.edit(editBuilder => {
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
