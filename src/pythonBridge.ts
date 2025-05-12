import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';

// Store the extension context for accessing resources
let extensionContext: vscode.ExtensionContext;

// Set the context when the extension activates
export function setExtensionContext(context: vscode.ExtensionContext) {
  extensionContext = context;
}

/**
 * Runs the sprint_manager.py script with the given arguments and returns stdout as a string.
 * Shows errors in VS Code if the script fails.
 */
export async function runSprintManager(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    // Try py, then python, then python3 for best Windows compatibility
    const pythonCandidates = ['py', 'python', 'python3'];
    let tried = 0;
    // Get the workspace root for cwd
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const cwd = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.fsPath : process.cwd();
    
    function tryNext() {
      if (tried >= pythonCandidates.length) {
        vscode.window.showErrorMessage('No Python interpreter found (tried py, python, python3). Please install Python and add it to your PATH.');
        return reject(new Error('No Python interpreter found.'));
      }
      
      const pythonPath = pythonCandidates[tried++];
      
      // Use context to get the absolute path to the script
      const scriptPath = extensionContext ? 
        extensionContext.asAbsolutePath('scripts/sprint_manager.py') : 
        path.join(__dirname, '../scripts/sprint_manager.py');
        
      const proc = spawn(pythonPath, [scriptPath, ...args], { cwd });
      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', data => { stdout += data.toString(); });
      proc.stderr.on('data', data => { stderr += data.toString(); });
      proc.on('close', code => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          if (stderr.toLowerCase().includes('not recognized') || stderr.toLowerCase().includes('no such file')) {
            tryNext();
          } else {
            vscode.window.showErrorMessage(`Sprint Manager error: ${stderr || 'Unknown error'}`);
            reject(new Error(stderr || 'Unknown error'));
          }
        }
      });
      proc.on('error', () => tryNext());
    }
    tryNext();
  });
}

export async function listSprintFiles(): Promise<string[]> {
  const output = await runSprintManager(['--list-files']);
  console.log('listSprintFiles raw output:', output);
  try {
    return JSON.parse(output);
  } catch (error) {
    console.error('Error parsing JSON in listSprintFiles:', error);
    return [];
  }
}

export async function loadTasksFromFile(file: string): Promise<any[]> {
  const output = await runSprintManager(['--file', file]);
  console.log('loadTasksFromFile raw output:', output);
  try {
    return JSON.parse(output);
  } catch (error) {
    console.error('Error parsing JSON in loadTasksFromFile:', error);
    return [];
  }
}

/**
 * Example: runSprintManager(['--status'])
 */
