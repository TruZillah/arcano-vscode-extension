# Arcano Sprint Manager - "Start Task" Button

## How the Start Button Works

The "Start Task" button in the Arcano Sprint Manager extension is designed to help users initiate work on specific sprint tasks by connecting them with GitHub Copilot for implementation guidance. Here's an explanation of how it works:

1. **User Experience**: 
   - When a user clicks the "Start Task" button next to a task in the Arcano panel, it triggers a workflow to open GitHub Copilot Chat and send the task as a prompt
   - This provides the user with AI assistance for implementing the specific task

2. **Technical Implementation**:
   - The button triggers the `openTaskInCopilotChat` method in `src/panel.ts`
   - This method formats the task into a structured prompt for Copilot
   - It then uses VS Code's API commands to open Copilot Chat and send the message
   - The extension also provides multiple fallback methods if the primary approach fails

## Issues Encountered

The extension was initially working correctly but stopped functioning after a GitHub Copilot update. Specifically:

1. **Command Not Found Error**: 
   - Error: `command 'github.copilot.chat.focus' not found`
   - The GitHub Copilot extension had changed its command names and API structure
   - This broke our hardcoded references to specific command IDs

2. **API Compatibility Issues**:
   - Original code was designed for a specific version of the Copilot Chat API
   - Changes in the Copilot extension broke this integration
   - Different users experienced different issues depending on their VS Code version and Copilot version

3. **Keyboard Input Limitations**:
   - Initial fallback approach relied on keyboard input simulation
   - This approach was unreliable across different environments and OS configurations
   - Some systems blocked or restricted simulated keyboard input for security reasons

## Solutions Implemented

We implemented a multi-layered approach to ensure compatibility across different environments and Copilot versions:

1. **Dynamic Command Detection**:
   - The extension now detects available commands in the runtime environment
   - It tries multiple command patterns (`github.copilot-chat.focus`, `github.copilot.chat.focus`, etc.)
   - This makes the extension resilient to API changes in the Copilot extension

2. **Modern VS Code Chat API Integration**:
   - Added support for the newer VS Code chat API patterns
   - Used `workbench.action.chat.open` with direct query parameters
   - Implemented the `chat.insertInput` + `chat.acceptInput` command sequence

3. **Multiple Fallback Methods**:
   - Added a series of progressively more reliable fallback methods:
     1. Direct chat opening with query parameter
     2. Chat opening followed by message sending
     3. Inline Chat as an alternative approach
     4. Language Model API as a final resort

4. **Enhanced Error Handling and Logging**:
   - Added comprehensive logging to help with troubleshooting
   - Improved error messages to guide users when automatic methods fail
   - Added graceful degradation to ensure the extension remains functional

## Current Implementation (May 2025)

The current implementation uses the following approach sequence:

```typescript
// 1. Try using the modern Chat API with direct query
await vscode.commands.executeCommand('workbench.action.chat.open', {
  query: message,
  provider: 'copilot'
});

// 2. Try opening chat then using API to send message
await vscode.commands.executeCommand('chat.open');
await vscode.commands.executeCommand('chat.insertInput', message);
await vscode.commands.executeCommand('chat.acceptInput');

// 3. Try inline chat as a reliable fallback
const doc = await vscode.workspace.openTextDocument({ content: '', language: 'markdown' });
const editor = await vscode.window.showTextDocument(doc);
await editor.edit(edit => {
  edit.insert(new vscode.Position(0, 0), `# ${task}\n\n${message}`);
});
await vscode.commands.executeCommand('inlineChat.start');

// 4. Fall back to the language model API as a last resort
const [model] = await vscode.lm.selectChatModels({ vendor: 'copilot' });
const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
```

This approach ensures the Start Task button functions reliably across different environments and versions of GitHub Copilot.