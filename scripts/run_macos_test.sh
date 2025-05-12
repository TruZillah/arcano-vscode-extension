#!/bin/bash
# Run Cross-Platform Smoke Test for Arcano Sprint Manager
# For macOS environments

# Print colored output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Arcano Sprint Manager Cross-Platform Smoke Test (macOS)...${NC}"

# Check if Python is installed
if command -v python3 &>/dev/null; then
    PYTHON_CMD="python3"
elif command -v python &>/dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}ERROR: Python is not installed${NC}"
    echo -e "${RED}Please install Python 3.6 or higher${NC}"
    exit 1
fi

echo -e "${CYAN}Using $($PYTHON_CMD --version)${NC}"

# Run the cross-platform test script
echo -e "\n${CYAN}Running cross-platform test script...${NC}"
$PYTHON_CMD "$(dirname "$0")/cross_platform_test.py"

echo -e "\n${GREEN}Test script completed. Follow the instructions provided above to complete the manual testing.${NC}"

# Create test results file for taking notes
RESULTS_FILE="$(dirname "$0")/../tests/macos-test-results.md"

if [ ! -f "$RESULTS_FILE" ]; then
    cat > "$RESULTS_FILE" << EOL
# macOS Test Results

Date: $(date +"%Y-%m-%d")
Tester: 

## System Information
- macOS Version: $(sw_vers -productVersion)
- VS Code Version: 
- GitHub Copilot Version:

## Test Results

| Test | Result | Notes |
|------|--------|-------|
| Extension Activation | | |
| Sprint File Loading | | |
| Task Display | | |
| Mark Task Done | | |
| Send to Copilot - Plan | | |
| Send to Copilot - Code | | |

## Issues Found



## Additional Notes


EOL
fi

echo -e "\n${CYAN}Created results template at: $RESULTS_FILE${NC}"
echo -e "${CYAN}Please document your findings there.${NC}"

# Try to open the results file
if command -v open &>/dev/null; then
    open "$RESULTS_FILE"
else
    echo -e "${CYAN}Please open the results file manually: $RESULTS_FILE${NC}"
fi

echo -e "\n${GREEN}Smoke test procedure complete!${NC}"
