# Collapsed Sections Fix

## Overview

This document describes how the Arcano Sprint Manager extension preserves the collapsed/expanded state of task sections when toggling task completion status.

## Problem

In previous versions, when a user would mark a task as done or undone, the panel would completely refresh, causing all previously collapsed sections to expand. This created a poor user experience as users would have to re-collapse sections after each task status update.

## Solution

Version 1.0.4 implements a comprehensive solution:

1. **State Tracking**: The extension now properly tracks which sections are collapsed in a `collapsedSections` Set.

2. **Data Attribute**: Task sections are marked with a `data-section-name` attribute to make them easily identifiable.

3. **Two-Way Communication**:
   - When the webview loads, it sends a 'ready' message to the extension.
   - The extension responds with a 'restoreCollapsedSections' message containing the list of sections that should be collapsed.
   - The webview script then applies the collapsed state to the appropriate sections.

4. **State Preservation**: The state is maintained during panel refreshes, which happen:
   - After toggling a task
   - During periodic auto-refresh
   - When selecting a different file

## Implementation Details

The implementation follows a message-based approach:

1. The extension maintains a `collapsedSections` Set that gets updated when a user collapses/expands a section.

2. Upon webview initialization, a 'ready' event triggers the extension to send the current collapsed state.

3. When receiving a 'restoreCollapsedSections' message, the webview applies the collapsed state to the matching sections.

This approach ensures that the UI consistently reflects the user's preferences for section visibility, creating a smoother and more intuitive experience.

## Future Improvements

Potential enhancements for future versions:

- Persist collapsed state between extension sessions
- Add animation to section collapse/expand
- Remember collapsed state per sprint file
