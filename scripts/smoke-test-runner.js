/**
 * Runner for the Arcano Sprint Manager smoke test
 */
const path = require('path');
const vscode = require('vscode');
const assert = require('assert');

// This is the main entry point for the test runner
function run() {
  const testRunner = require('vscode/lib/testrunner');
  
  // Configure the test runner
  const options = {
    ui: 'tdd',
    useColors: true,
    timeout: 60000
  };
  
  // Run the tests
  return testRunner.configure(options).run();
}

// Export run function for launching from extension host
exports.run = run;

// Define the test suite
suite('Arcano Smoke Tests', () => {
  test('Extension Smoke Test', async function() {
    this.timeout(30000);
    await runSmokeTests();
  });
});

async function runSmokeTests() {
  console.log('Starting Arcano smoke test runner...');
  
  // Wait for extension to activate fully
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 1: Check if Arcano extension is activated
  const extension = vscode.extensions.getExtension('ArcanoDevelopment.arcano-sprint-manager');
  assert.ok(extension, 'Extension should be available');
  console.log('✅ Extension is available');
  
  if (!extension.isActive) {
    await extension.activate();
  }
  assert.ok(extension.isActive, 'Extension should be active');
  console.log('✅ Extension is active');
  
  // Test 2: Open the panel
  try {
    await vscode.commands.executeCommand('arcano.runPanel');
    console.log('✅ Panel opened successfully');
  } catch (e) {
    console.error('❌ Failed to open panel:', e);
    throw e;
  }
  
  // Wait for panel to initialize
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test 3: Check if Copilot integration commands exist
  const planCommand = await vscode.commands.getCommands(true).then(
    cmds => cmds.includes('arcano.sendTaskToPlan')
  );
  assert.ok(planCommand, 'Planning command should exist');
  console.log('✅ Planning command exists');
  
  const implementCommand = await vscode.commands.getCommands(true).then(
    cmds => cmds.includes('arcano.sendTaskToImplement')
  );
  assert.ok(implementCommand, 'Implementation command should exist');
  console.log('✅ Implementation command exists');
    // Test 4: Send a simple task for planning (without actually executing)
  console.log('Simulation: Sending task to plan');
  if (planCommand) {
    console.log('✅ Ready to send tasks for planning');
  }
  
  // Test 5: Send a simple task for implementation (without actually executing)
  console.log('Simulation: Sending task to implement');
  if (implementCommand) {
    console.log('✅ Ready to send tasks for implementation');
  }

  // Test 6: Check for startTask command
  const startTaskCommand = await vscode.commands.getCommands(true).then(
    cmds => cmds.includes('arcano.startTask')
  );
  assert.ok(startTaskCommand, 'startTask command should exist');
  console.log('✅ startTask command exists');
  
  // Test 7: Verify startTask can be invoked (without actually executing)
  console.log('Simulation: Starting a task with arcano.startTask');
  if (startTaskCommand) {
    console.log('✅ Ready to start tasks with arcano.startTask');
  }
  
  console.log('Smoke test completed successfully!');
  
  // Output platform-specific information 
  console.log(`Platform: ${process.platform}`);
  console.log(`Node.js version: ${process.version}`);
  console.log(`VS Code version: ${vscode.version}`);
  
  return {
    success: true,
    platform: process.platform,
    vsCodeVersion: vscode.version
  };
}
