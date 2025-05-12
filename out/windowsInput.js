"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendKeysToActive = void 0;
const child_process_1 = require("child_process");
/**
 * Sends text to the currently active input field by simulating keystrokes.
 * This works with any active input, including the GitHub Copilot Chat and ChatGPT chat inputs.
 *
 * @param text The text to send
 * @returns A promise that resolves when the text has been sent
 */
async function sendKeysToActive(text) {
    // Format string for PowerShell - escape special characters and handle multi-line text
    const escapedText = text
        .replace(/['"]/g, '`$&')
        .replace(/\n/g, '{ENTER}')
        .replace(/\r/g, '')
        .replace(/[{}[\]()^+%~]/g, '{$&}');
    // PowerShell script to send keys to the currently active input
    const script = `
        Add-Type -AssemblyName System.Windows.Forms
        Start-Sleep -Milliseconds 100
        [System.Windows.Forms.SendKeys]::SendWait("${escapedText}")
        Start-Sleep -Milliseconds 100
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    `;
    return new Promise((resolve, reject) => {
        const proc = (0, child_process_1.spawn)('powershell.exe', ['-Command', script]);
        let stderr = '';
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            }
            else {
                reject(new Error(`Failed to send keys: ${stderr}`));
            }
        });
    });
}
exports.sendKeysToActive = sendKeysToActive;
