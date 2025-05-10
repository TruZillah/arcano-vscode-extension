import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Detects sprint.json and sprint.md files in a docs directory in the user's workspace.
 * Returns a list of found sprints (file names without extension).
 */
export function detectSprintFiles(): string[] {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return [];
  const rootPath = workspaceFolders[0].uri.fsPath;
  const docsPath = path.join(rootPath, 'docs');
  if (!fs.existsSync(docsPath)) return [];
  const files = fs.readdirSync(docsPath);
  return files
    .filter(f => f.startsWith('sprint.') && (f.endsWith('.json') || f.endsWith('.md')))
    .map(f => f.replace(/^sprint\./, '').replace(/\.(json|md)$/, ''));
}

/**
 * Returns the absolute path to a sprint file by name and extension.
 */
export function getSprintFilePath(name: string, ext: 'json' | 'md'): string | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return null;
  const rootPath = workspaceFolders[0].uri.fsPath;
  const docsPath = path.join(rootPath, 'docs');
  const filePath = path.join(docsPath, `sprint.${name}.${ext}`);
  return fs.existsSync(filePath) ? filePath : null;
}
