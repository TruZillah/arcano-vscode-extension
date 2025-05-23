// This script will fix the issues in extension.ts
const fs = require('fs');
const path = require('path');

const fixIssues = () => {
  const extensionPath = path.join(__dirname, 'extension.ts');
  
  // Read the current file content
  let content = fs.readFileSync(extensionPath, 'utf8');
  
  // Fix imports - make sure we're not duplicating existing imports
  if (!content.includes('import { ProblemScanner }') && !content.includes('ProblemScanner')) {
    content = content.replace(
      /import \* as vscode from 'vscode';/,
      "import * as vscode from 'vscode';\nimport { ProblemScanner } from './problemScanner';"
    );
  }
  
  // Find the problematic lines
  const badPatterns = [
    /const debugTracker = new ArcanoDebugTracker\(outputChannel\);/,
    /const debugHelper = new ArcanoDebugHelper\(outputChannel, debugTracker\);/,
    /const debugUI = new ArcanoDebugUI\(outputChannel, debugHelper\);/
  ];
  
  // Replace with correct implementations
  const replacements = [
    '',
    '',
    '  // Initialize the Problem Scanner\n  const problemScanner = new ProblemScanner(outputChannel);\n  \n  // Register problem scanner listeners\n  const scannerDisposables = problemScanner.registerListeners();\n  scannerDisposables.forEach((disposable: vscode.Disposable) => {\n    context.subscriptions.push(disposable);\n  });\n  \n  // Initialize the Debug UI\n  const debugUI = new DebugUI(outputChannel);'
  ];
  
  // Apply the replacements
  for (let i = 0; i < badPatterns.length; i++) {
    if (content.includes(badPatterns[i].source)) {
      content = content.replace(badPatterns[i], replacements[i]);
    }
  }
  
  // Fix duplicate code blocks
  const duplicateRegex = /\/\/ Register debug system commands[\s\S]*?applyCopilotFixes\(\);[\s\S]*?\}\)\s*\);([\s\S]*?)\/\/ Register debug system commands[\s\S]*?applyCopilotFixes\(\);[\s\S]*?\}\)\s*\);/g;
  content = content.replace(duplicateRegex, '$1');
  
  // Fix incomplete if statement
  const incompleteIfRegex = /const sprintName = await vscode\.window\.showInputBox\([\s\S]*?if[\s\S]*?(?!\{)/;
  content = content.replace(incompleteIfRegex, match => {
    if (!match.includes('{')) {
      return match + ' {';
    }
    return match;
  });
  
  // Fix debugHelper references
  content = content.replace(/await debugHelper\.debugTask\(taskName\);/, 'await debugSystem.debugTask(taskName);');
  
  // Fix any missing method in AutomatedDebugSystem
  if (content.includes('await debugSystem.debugTask(taskName);')) {
    // Check if debugTask exists in debugSystem.ts
    const debugSystemPath = path.join(__dirname, 'debugSystem.ts');
    let debugSystemContent = fs.readFileSync(debugSystemPath, 'utf8');
    
    if (!debugSystemContent.includes('debugTask')) {
      // Add the missing method
      const methodPosition = debugSystemContent.lastIndexOf('}');
      if (methodPosition !== -1) {
        const newMethod = `
  /**
   * Debug a specific task
   * @param taskName Name of the task to debug
   */
  async debugTask(taskName: string): Promise<void> {
    this.outputChannel.appendLine(\`Debugging task: \${taskName}\`);
    // Implement task debugging logic
    await this.scanForIssues();
  }
`;
        debugSystemContent = debugSystemContent.slice(0, methodPosition) + newMethod + debugSystemContent.slice(methodPosition);
        fs.writeFileSync(debugSystemPath, debugSystemContent);
        console.log('Added missing debugTask method to debugSystem.ts');
      }
    }
  }
  
  // Write the changes back to the file
  fs.writeFileSync(extensionPath, content);
  console.log('Fixed issues in extension.ts');
};

fixIssues();

fixIssues();

fixIssues();
