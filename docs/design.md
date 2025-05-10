# Arcano VS Code Extension Design Document

## UI Design Preferences

### Task Button Styling
The preferred styling for task buttons maintains a clean, modern look with the following characteristics:
- Base style:
  ```css
  .task-button {
    background: var(--electric-blue);
    color: var(--dark-bg);
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.3s ease;
  }
  ```

- Hover effects:
  ```css
  .task-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 15px var(--blue-glow);
  }
  ```

- Disabled state:
  ```css
  .task-button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  ```

This styling provides a good balance of visibility and interactivity, with clear visual feedback for hover states and disabled conditions. The electric blue color scheme stands out against the dark background while maintaining visual harmony with other UI elements.

### Color Variables
```css
:root {
  --electric-blue: #00c3ff;
  --silver-white: #e3eafc;
  --dark-bg: #0f2027;
  --blue-glow: #00c3ff44;
}
```