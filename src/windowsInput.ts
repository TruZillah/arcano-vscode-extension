import { spawn } from 'child_process';

/**
 * Sends text to the currently active input field by simulating keystrokes.
 * This works with any active input, including the GitHub Copilot Chat and ChatGPT chat inputs.
 * 
 * @param text The text to send
 * @returns A promise that resolves when the text has been sent
 */
export async function sendKeysToActive(text: string): Promise<void> {
    // Basic PowerShell escaping
    const escapedText = text
        .replace(/"/g, '`"')
        .replace(/`/g, '``')
        .replace(/\$/g, '`$')
        .replace(/\r?\n/g, ' ');

    const script = `
    $ErrorActionPreference = 'Stop'
    try {
        # Add Windows Forms for SendKeys
        Add-Type -AssemblyName System.Windows.Forms

        # Wait for window to be ready
        Start-Sleep -Milliseconds 1500

        # Send the text
        $text = @"
${escapedText}
"@
        [System.Windows.Forms.SendKeys]::SendWait($text)
        Start-Sleep -Milliseconds 500
        [System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
    } catch {
        Write-Error $_.Exception.Message
        exit 1
    }
    `;

    return new Promise<void>((resolve, reject) => {
        const proc = spawn('powershell.exe', ['-Command', script]);
        let stderr = '';
        
        proc.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });
        
        proc.on('close', (code: number | null) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Failed to send keys: ${stderr}`));
            }
        });
    });
}
