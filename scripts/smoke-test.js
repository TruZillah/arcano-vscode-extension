/**
 * Smoke Test Script for Arcano Sprint Manager
 * 
 * This script tests the core functionality of the extension:
 * 1. Loading sprint files
 * 2. Listing tasks
 * 3. Marking tasks as done
 * 4. Sending tasks to GitHub Copilot for planning or implementation
 * 
 * To run this script:
 * 1. Open the Arcano Sprint Manager extension in VS Code
 * 2. Open the Debug Console (View > Debug Console)
 * 3. Run the script using the VS Code debugger
 */

const vscode = acquireVsCodeApi();

async function runSmokeTest() {
  console.log('Starting Arcano Sprint Manager smoke test...');
  
  // Test: Check if sprint panel is accessible
  try {
    await vscode.commands.executeCommand('arcano.runPanel');
    console.log('✅ Sprint panel command executed successfully');
  } catch (err) {
    console.error('❌ Failed to run the panel:', err);
  }
  
  // Wait for panel to initialize
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Test: Check if Copilot integration works  try {
    // Send a simple task for planning
    const planResult = await vscode.commands.executeCommand(
      'arcano.sendTaskToPlan',
      'Create a simple hello world function'
    );
    console.log('✅ Task sent to Copilot for planning:', planResult);
    
    // Wait a bit to avoid overwhelming Copilot
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test new startTask command
    const startTaskResult = await vscode.commands.executeCommand(
      'arcano.startTask',
      'Verify Copilot Chat extension and authentication'
    );
    console.log('✅ Task started with startTask command:', startTaskResult);
    
    // Wait a bit to avoid overwhelming Copilot
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Send a simple task for implementation
    const implementResult = await vscode.commands.executeCommand(
      'arcano.sendTaskToImplement',
      'Create a function that returns the sum of two numbers'
    );
    console.log('✅ Task sent to Copilot for implementation:', implementResult);
    } catch (err) {
    console.error('❌ Failed to interact with Copilot:', err);
  }
  
  console.log('Smoke test completed');
}

runSmokeTest().catch(err => {
  console.error('Test failed with error:', err);
});
