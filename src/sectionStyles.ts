// Simple test CSS for debugging - copy to panel.ts when needed
const headerSectionsCSS = `
/* Blog post style section headers */
.blog-header-section {
  margin: 2rem 0 1.5rem 0;
  padding: 0;
  border: none;
  background: transparent;
}

.blog-header-section h3 {
  font-size: 1.8rem !important;
  font-weight: 700 !important;
  color: #00c3ff !important;
  margin: 0;
  padding-bottom: 0.5rem;
  border-bottom: 3px solid rgba(0, 195, 255, 0.3);
  position: relative;
}

.blog-header-section h3::after {
  content: '';
  position: absolute;
  bottom: -3px;
  left: 0;
  width: 60px;
  height: 3px;
  background: #00c3ff;
  border-radius: 2px;
}

/* Tasks under header sections */
.header-section-tasks {
  margin-bottom: 2rem;
  padding: 0 0 0 1rem;
}

.header-section-tasks .task-item {
  margin-bottom: 8px;
  transition: transform 0.2s ease;
}

.header-section-tasks .task-item:hover {
  transform: translateX(5px);
}

/* Task group sections with collapsible functionality */
.task-group-section {
  margin: 1.2em 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(0,195,255,0.1);
}

/* Empty sections styling */
.empty-section .section-header {
  background: rgba(0, 195, 255, 0.05);
  cursor: default;
}

.empty-section .section-header:hover {
  background: rgba(0, 195, 255, 0.05);
}

.empty-task-message {
  padding: 8px 12px;
  font-style: italic;
  color: rgba(227, 234, 252, 0.5);
  text-align: center;
  font-size: 0.85rem;
}
`;
