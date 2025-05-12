"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitActiveInput = exports.sendKeysToActive = void 0;
const child_process_1 = require("child_process");
/**
 * Sends text to the currently active input field by simulating keystrokes.
 * This works with any active input, including the GitHub Copilot Chat and ChatGPT chat inputs.
 *
 * @param text The text to send
 * @returns A promise that resolves when the text has been sent
 */
async function sendKeysToActive(text) {
    try {
        // Format string for PowerShell - escape special characters and handle multi-line text
        const escapedText = text
            .replace(/['"]/g, '`$&')
            .replace(/\n/g, '{ENTER}')
            .replace(/\r/g, '')
            .replace(/[{}[\]()^+%~]/g, '{$&}');
        // PowerShell script to send keys to the currently active input
        const script = `
        Add-Type -AssemblyName System.Windows.Forms
        Start-Sleep -Milliseconds 500
        [System.Windows.Forms.SendKeys]::SendWait("${escapedText}")
    `;
        return new Promise((resolve, reject) => {
            const proc = (0, child_process_1.spawn)('powershell.exe', ['-Command', script]);
            let stderr = '';
            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            proc.on('close', (code) => {
                if (code === 0) {
                    resolve(true);
                }
                else {
                    console.error(`Failed to send keys: ${stderr}`);
                    resolve(false);
                }
            });
        });
    }
    catch (err) {
        console.error('Error sending keys to active element:', err);
        return false;
    }
}
exports.sendKeysToActive = sendKeysToActive;
/**
 * Submits the current input by attempting to send Enter key
 */
async function submitActiveInput() {
    try { // PowerShell script to send Enter key to the active element
        const script = `
        Add-Type -AssemblyName System.Windows.Forms
        Start-Sleep -Milliseconds 500
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
                    resolve(true);
                }
                else {
                    console.error(`Failed to send Enter key: ${stderr}`);
                    resolve(false);
                }
            });
        });
    }
    catch (err) {
        console.error('Error submitting active input:', err);
        return false;
    }
}
exports.submitActiveInput = submitActiveInput;
