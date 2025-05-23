# Arcano VS Code Extension Design Document

## UI Design Preferences

.task-button {
  background: var(--electric-blue);
  color: var(--dark-bg);
  border: none;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 2px;
  line-height: 1.2;
  cursor: pointer;

  display: flex;
  align-items: center;
  justify-content: center;

  transition: background 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease;
  user-select: none;
}
.task-button[disabled] {
  background: #666;
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

:root {
  --electric-blue: #00c3ff;
  --silver-white: #e3eafc;
  --dark-bg: #0f2027;
  --blue-glow: #00c3ff44;
}

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