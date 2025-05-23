import argparse
import json
import os
import re
import sys
from datetime import datetime

if hasattr(sys.stdout, "reconfigure"):
    if sys.stdout.encoding.lower() != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8") # type: ignore

# Debug mode flag
DEBUG_MODE = os.environ.get('ARCANO_DEBUG', '0') == '1'
DEBUG_LEVEL = os.environ.get('ARCANO_DEBUG_LEVEL', 'normal')

# Dummy task list for demonstration
arcano_tasks = [
    {"task": "Automated Debug System (Highest Priority)", "done": False},
    {"task": "Develop advanced deck sharing & privacy features", "done": False},
    {"task": "Implement lazy loading for media assets", "done": False},
    {"task": "Reduce API response times through optimization", "done": False},
    {"task": "Enhance accessibility features", "done": False},
    {"task": "Implement advanced customization options for UX", "done": False},
    {"task": "Add personalized recommendations", "done": False},
    {"task": "Implement user feedback loop for AI improvements", "done": False},
    {"task": "Add advanced customization options for AI-generated content", "done": False},
    {"task": "Explore additional AI model integrations", "done": False}
]

def debug_log(message, level='normal'):
    """Log debug messages when in debug mode"""
    if DEBUG_MODE and (DEBUG_LEVEL == 'verbose' or level == 'normal'):
        print(f"🐛 DEBUG: {message}", flush=True)

def load_tasks_from_any_json_or_md():
    debug_log("Looking for task files...")
    docs_path = os.path.join(os.getcwd(), 'docs')
    # Scan all .json files in docs
    if os.path.exists(docs_path):
        json_files = [f for f in os.listdir(docs_path) if f.endswith('.json')]
        debug_log(f"Found JSON files: {json_files}")
        
        for json_file in json_files:
            file_path = os.path.join(docs_path, json_file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list) and all('task' in item for item in data):
                        debug_log(f"Loaded tasks from {json_file}")
                        return data
            except Exception as e:
                debug_log(f"Error reading {json_file}: {e}", level='verbose')
        
    # Try sprint.md or todo.md as fallback
    for md_file in [os.path.join(docs_path, 'sprint.md'), os.path.join(docs_path, 'todo.md')]:
        if os.path.exists(md_file):
            try:
                with open(md_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    tasks = []
                    for line in content.splitlines():
                        match = re.search(r'- \[([ x])\] (.*)', line)
                        if match:
                            done = match.group(1) == 'x'
                            task_text = match.group(2)
                            tasks.append({"task": task_text, "done": done})
                    if tasks:
                        debug_log(f"Loaded tasks from {md_file}")
                        return tasks
            except Exception as e:
                debug_log(f"Error reading {md_file}: {e}", level='verbose')
    
    debug_log("No task files found, using default tasks")
    return None

def save_tasks_to_json(tasks):
    debug_log("Saving tasks to JSON")
    docs_path = os.path.join(os.getcwd(), 'docs')
    os.makedirs(docs_path, exist_ok=True)
    json_path = os.path.join(docs_path, 'sprint.json')
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(tasks, f, indent=2)
        debug_log(f"Tasks saved to {json_path}")
        return True
    except Exception as e:
        debug_log(f"Error saving tasks: {e}", level='verbose')
        return False

def list_sprint_files():
    docs_path = os.path.join(os.getcwd(), 'docs')
    files = []
    if os.path.exists(docs_path):
        files = [f for f in os.listdir(docs_path) if f.endswith('.json') or f.endswith('.md')]
        debug_log(f"Found sprint files: {files}")
    print(json.dumps(files))

# Try to load tasks from any .json, or sprint.md/todo.md if they exist
loaded_tasks = load_tasks_from_any_json_or_md()
if loaded_tasks is not None:
    arcano_tasks = loaded_tasks

def start_task(task_name):
    debug_log(f"Starting task: {task_name}")
    matched = False
    for task in arcano_tasks:
        if task['task'] == task_name:
            task['done'] = False
            task['started_at'] = datetime.now().isoformat()
            matched = True
            print(f"▶️ Started task: {task_name}")
            save_tasks_to_json(arcano_tasks)
            break
    
    if not matched:
        print(f"❌ Task not found: {task_name}")

def run_sprint(sprint_name):
    debug_log(f"Running sprint: {sprint_name}")
    print(f"\n▶️ Running {sprint_name}...")
    changed = False
    for task in arcano_tasks:
        if not task['done']:
            print(f"⏳ Working on: {task['task']}")
            # In debug mode, add details about the task
            if DEBUG_MODE:
                print(f"   - Status: {'✓ Done' if task['done'] else '⏳ In progress'}")
                if 'started_at' in task:
                    print(f"   - Started: {task['started_at']}")
            changed = True
    
    if changed:
        save_tasks_to_json(arcano_tasks)
    
    print("\nSprint complete.")

def mark_task_done(task_name):
    debug_log(f"Marking task as done: {task_name}")
    for task in arcano_tasks:
        if task['task'] == task_name:
            task['done'] = True
            task['completed_at'] = datetime.now().isoformat()
            print(f"✅ Task completed: {task_name}")
            save_tasks_to_json(arcano_tasks)
            return
    
    print(f"❌ Task not found: {task_name}")

def show_status():
    debug_log("Showing sprint status")
    completed = [t for t in arcano_tasks if t['done']]
    pending = [t for t in arcano_tasks if not t['done']]

    print("\n📊 Sprint Progress Summary:")
    print(f"✅ Completed: {len(completed)}")
    print(f"🕐 Pending: {len(pending)}")

    # In debug mode, add more details
    if DEBUG_MODE:
        print("\n==== DETAILED STATUS ====")
    
    for task in arcano_tasks:
        status = "✅" if task['done'] else "⏳"
        details = ""
        if DEBUG_MODE and 'started_at' in task:
            details += f" (Started: {task['started_at']})"
        if DEBUG_MODE and task['done'] and 'completed_at' in task:
            details += f" (Completed: {task['completed_at']})"
        
        print(f"{status} {task['task']}{details}")

def update_markdown_task(file_path, task_text, new_status):
    """Update a task's status in a markdown file."""
    debug_log(f"Updating task status in {file_path}: {task_text} -> {new_status}")
    if not os.path.exists(file_path):
        debug_log(f"File not found: {file_path}")
        return False
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Escape special regex characters in the task text
    escaped_task = re.escape(task_text)
    
    # Pattern to match the task line, capturing any indentation and handling Windows line endings
    # This pattern will match the task regardless of indentation or section
    pattern = r'(\r?\n|\A)(\s*)- \[([ x])\] ' + escaped_task + r'(\r?\n|\Z)'
    
    # Replace with new status
    mark = 'x' if new_status else ' '
    replacement = r'\1\2- [' + mark + r'] ' + task_text + r'\4'
    
    updated_content = re.sub(pattern, replacement, content)
    
    if content == updated_content:
        debug_log(f"Task not found in {file_path}")
        return False
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    debug_log(f"Task updated in {file_path}")
    return True

def toggle_task_status(task_name):
    debug_log(f"Toggling task status: {task_name}")
    for task in arcano_tasks:
        if task['task'] == task_name:
            task['done'] = not task['done']
            if task['done']:
                task['completed_at'] = datetime.now().isoformat()
                print(f"✅ Task completed: {task_name}")
            else:
                task['started_at'] = datetime.now().isoformat()
                print(f"▶️ Task reopened: {task_name}")
            save_tasks_to_json(arcano_tasks)
            
            # Try to update any markdown files as well
            docs_path = os.path.join(os.getcwd(), 'docs')
            if os.path.exists(docs_path):
                for md_file in ['sprint.md', 'todo.md']:
                    md_path = os.path.join(docs_path, md_file)
                    if os.path.exists(md_path):
                        update_markdown_task(md_path, task_name, task['done'])
            return
    
    print(f"❌ Task not found: {task_name}")

def debug_task_details(task_name):
    """Show detailed debug information for a specific task"""
    debug_log(f"Getting debug details for task: {task_name}")
    for task in arcano_tasks:
        if task['task'] == task_name:
            print(f"\n🔍 DEBUG DETAILS FOR TASK: {task_name}")
            print(f"Status: {'✅ Done' if task['done'] else '⏳ In progress'}")
            
            # Print all task properties
            for key, value in task.items():
                if key != 'task':
                    print(f"{key}: {value}")
            
            # Check for related files
            docs_path = os.path.join(os.getcwd(), 'docs')
            if os.path.exists(docs_path):
                related_files = []
                for file in os.listdir(docs_path):
                    file_path = os.path.join(docs_path, file)
                    if os.path.isfile(file_path):
                        try:
                            with open(file_path, 'r', encoding='utf-8') as f:
                                content = f.read()
                                if task_name in content:
                                    related_files.append(file)
                        except Exception as e:
                            debug_log(f"Error reading file {file}: {e}", level='verbose')
                            pass
                
                if related_files:
                    print(f"Related files: {', '.join(related_files)}")
            return
    
    print(f"❌ Task not found: {task_name}")

def load_tasks_from_file(file_path):
    """Load tasks from a specific file and return them as a JSON-compatible object."""
    debug_log(f"Loading tasks from file: {file_path}")
    
    if not os.path.exists(file_path):
        debug_log(f"File not found: {file_path}")
        return []
    
    tasks = []
    
    if file_path.lower().endswith('.json'):
        # Load from JSON
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, list) and all('task' in item for item in data):
                    debug_log(f"Loaded tasks from JSON: {file_path}")
                    return data
        except Exception as e:
            debug_log(f"Error reading JSON {file_path}: {e}", level='verbose')
    
    elif file_path.lower().endswith('.md'):
        # Load from Markdown
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            current_section = None
            
            for line in content.split('\n'):
                line = line.strip()
                
                # Check for section headers (both ## and ###)
                section_match = re.match(r'^(##|###)\s+(.+)', line)
                if section_match:
                    current_section = section_match.group(2).strip()
                    header_level = section_match.group(1)
                    # Add section with flag indicating if it's a header (##) or task group (###)
                    tasks.append({
                        "type": "section",
                        "name": current_section,
                        "isHeader": header_level == "##"  # True for ##, False for ###
                    })
                    continue
                
                # Check for task items
                task_match = re.match(r'^-\s*\[([ x])\]\s*(.+)', line)
                if task_match:
                    is_done = task_match.group(1).lower() == 'x'
                    task_text = task_match.group(2).strip()
                    
                    tasks.append({
                        "type": "task",
                        "task": task_text,
                        "done": is_done,
                        "section": current_section
                    })
                    
            debug_log(f"Loaded {len(tasks)} items from Markdown: {file_path}")
            return tasks
            
        except Exception as e:
            debug_log(f"Error reading Markdown {file_path}: {e}", level='verbose')
    
    debug_log(f"No valid tasks found in: {file_path}")
    return []

def main():
    parser = argparse.ArgumentParser(description='Arcano Sprint Manager')
    parser.add_argument('--start', help='Start a task')
    parser.add_argument('--done', help='Mark a task as done')
    parser.add_argument('--toggle', help='Toggle task status')
    parser.add_argument('--status', action='store_true', help='Show sprint status')
    parser.add_argument('--run', help='Run a sprint')
    parser.add_argument('--list-files', action='store_true', help='List available sprint files')
    parser.add_argument('--debug-task', help='Show detailed debug information for a task')
    parser.add_argument('--file', help='Load tasks from a specific file and output as JSON')
    
    args = parser.parse_args()
    
    if args.start:
        start_task(args.start)
    elif args.done:
        mark_task_done(args.done)
    elif args.toggle:
        toggle_task_status(args.toggle)
    elif args.status:
        show_status()
    elif args.run:
        run_sprint(args.run)
    elif args.list_files:
        list_sprint_files()
    elif args.debug_task:
        debug_task_details(args.debug_task)
    elif args.file:
        # When called with --file, load tasks from the specified file and output as JSON
        docs_path = os.path.join(os.getcwd(), 'docs')
        file_path = os.path.join(docs_path, args.file)
        if os.path.exists(file_path):
            tasks = load_tasks_from_file(file_path)
            print(json.dumps(tasks))
        else:
            debug_log(f"File not found: {file_path}")
            print("[]")  # Return empty array on error to avoid breaking the UI
    else:
        parser.print_help()

if __name__ == '__main__':
    if DEBUG_MODE:
        print("🐛 DEBUG MODE ENABLED")
        if DEBUG_LEVEL == 'verbose':
            print("🔍 VERBOSE LOGGING ENABLED")
    
    try:
        main()
    except Exception as e:
        if DEBUG_MODE:
            import traceback
            print(f"❌ ERROR: {e}")
            print("Stack trace:")
            traceback.print_exc()
        else:
            print(f"❌ ERROR: {e}")
