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
exports.getSprintFilePath = exports.detectSprintFiles = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Detects sprint.json and sprint.md files in a docs directory in the user's workspace.
 * Returns a list of found sprints (file names without extension).
 */
function detectSprintFiles() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders)
        return [];
    const rootPath = workspaceFolders[0].uri.fsPath;
    const docsPath = path.join(rootPath, 'docs');
    if (!fs.existsSync(docsPath))
        return [];
    const files = fs.readdirSync(docsPath);
    return files
        .filter(f => f.startsWith('sprint.') && (f.endsWith('.json') || f.endsWith('.md')))
        .map(f => f.replace(/^sprint\./, '').replace(/\.(json|md)$/, ''));
}
exports.detectSprintFiles = detectSprintFiles;
/**
 * Returns the absolute path to a sprint file by name and extension.
 */
function getSprintFilePath(name, ext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders)
        return null;
    const rootPath = workspaceFolders[0].uri.fsPath;
    const docsPath = path.join(rootPath, 'docs');
    const filePath = path.join(docsPath, `sprint.${name}.${ext}`);
    return fs.existsSync(filePath) ? filePath : null;
}
exports.getSprintFilePath = getSprintFilePath;
