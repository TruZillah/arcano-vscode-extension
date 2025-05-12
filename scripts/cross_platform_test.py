# Cross-Platform Test Script for Arcano Copilot Integration

# This script helps test the integration between Arcano Sprint Manager and GitHub Copilot
# on both Windows and macOS platforms.

# Import required modules
import os
import platform
import sys
import subprocess
import json
from datetime import datetime

# Define test tasks
TEST_TASKS = [
    {
        "id": "TEST-1",
        "task": "Create a function to convert Fahrenheit to Celsius",
        "done": False
    },
    {
        "id": "TEST-2",
        "task": "Add error handling to the API response parser",
        "done": False
    },
    {
        "id": "TEST-3", 
        "task": "Implement a dark mode toggle for the UI",
        "done": False
    }
]

# Define test file path
def get_test_file_path():
    # Get the script directory
    script_dir = os.path.dirname(os.path.realpath(__file__))
    return os.path.join(script_dir, "test-sprint.json")

def create_test_sprint_file():
    """Creates a test sprint file for testing"""
    file_path = get_test_file_path()
    
    with open(file_path, 'w') as f:
        json.dump(TEST_TASKS, f, indent=2)
    
    print(f"Created test sprint file at: {file_path}")
    return file_path

def get_system_info():
    """Get system information for test report"""
    return {
        "platform": platform.system(),
        "platform_version": platform.version(),
        "python_version": sys.version,
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

def main():
    """Main test function"""
    # Print header
    print("\n===== Arcano Sprint Manager Cross-Platform Test =====")
    
    # Get system info
    sys_info = get_system_info()
    print(f"\nRunning on: {sys_info['platform']} {sys_info['platform_version']}")
    print(f"Python version: {sys_info['python_version']}")
    print(f"Test time: {sys_info['time']}")
    
    # Create test sprint file
    test_file = create_test_sprint_file()
    print(f"\nTest sprint file created at: {test_file}")
    print("\nPlease perform the following manual tests:")
    
    # Manual test instructions
    print("\n1. Open VS Code with the Arcano extension installed")
    print("2. Open the Arcano panel (via command or icon)")
    print("3. Select the test-sprint.json file from the dropdown")
    print("4. Verify tasks are displayed correctly")
    print("5. Test the 'Plan' button on one of the tasks")
    print("6. Verify GitHub Copilot Chat opens with the correct prompt")
    print("7. Test the 'Code' button on another task")
    print("8. Verify GitHub Copilot Chat opens with the correct prompt")
    print("9. Mark a task as done and verify the change is saved")
    
    print("\n===== Test Complete =====")
    print(f"Please document your findings in the test report.")

if __name__ == "__main__":
    main()
