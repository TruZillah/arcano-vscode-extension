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
exports.loadTasksFromFile = exports.listSprintFiles = exports.runSprintManager = exports.setExtensionContext = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
// Store the extension context for accessing resources
let extensionContext;
// Set the context when the extension activates
function setExtensionContext(context) {
    extensionContext = context;
}
exports.setExtensionContext = setExtensionContext;
/**
 * Runs the sprint_manager.py script with the given arguments and returns stdout as a string.
 * Shows errors in VS Code if the script fails.
 */
async function runSprintManager(args) {
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
            const proc = (0, child_process_1.spawn)(pythonPath, [scriptPath, ...args], { cwd });
            let stdout = '';
            let stderr = '';
            proc.stdout.on('data', data => { stdout += data.toString(); });
            proc.stderr.on('data', data => { stderr += data.toString(); });
            proc.on('close', code => {
                if (code === 0) {
                    resolve(stdout.trim());
                }
                else {
                    if (stderr.toLowerCase().includes('not recognized') || stderr.toLowerCase().includes('no such file')) {
                        tryNext();
                    }
                    else {
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
exports.runSprintManager = runSprintManager;
async function listSprintFiles() {
    const output = await runSprintManager(['--list-files']);
    console.log('listSprintFiles raw output:', output);
    try {
        return JSON.parse(output);
    }
    catch (error) {
        console.error('Error parsing JSON in listSprintFiles:', error);
        return [];
    }
}
exports.listSprintFiles = listSprintFiles;
async function loadTasksFromFile(file) {
    const output = await runSprintManager(['--file', file]);
    console.log('loadTasksFromFile raw output:', output);
    try {
        return JSON.parse(output);
    }
    catch (error) {
        console.error('Error parsing JSON in loadTasksFromFile:', error);
        return [];
    }
}
exports.loadTasksFromFile = loadTasksFromFile;
/**
 * Example: runSprintManager(['--status'])
 */
