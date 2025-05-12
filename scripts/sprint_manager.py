import argparse
import json
import os
import sys
import re

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

# Dummy task list for demonstration
arcano_tasks = [
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

def load_tasks_from_any_json_or_md():
    docs_path = os.path.join(os.getcwd(), 'docs')
    # Scan all .json files in docs
    if os.path.exists(docs_path):
        for fname in os.listdir(docs_path):
            if fname.endswith('.json'):
                json_path = os.path.join(docs_path, fname)
                try:
                    with open(json_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        if isinstance(data, list) and all(isinstance(t, dict) and 'task' in t and 'done' in t for t in data):
                            return data
                except Exception as e:
                    print(f"⚠️ Failed to load {fname}: {e}")
    # Try sprint.md or todo.md as fallback
    for md_file in [os.path.join(docs_path, 'sprint.md'), os.path.join(docs_path, 'todo.md')]:
        if os.path.exists(md_file):
            try:
                with open(md_file, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                tasks = []
                current_section = None
                
                for line in lines:
                    line = line.strip()
                    
                    # Check for section headers (### Header)
                    if line.startswith('###'):
                        current_section = line.lstrip('#').strip()
                        # Add a section marker to the tasks list
                        tasks.append({"type": "section", "name": current_section})
                        continue
                        
                    # Check for task items
                    if line.startswith('- [ ]') or line.startswith('- [x]'):
                        done = line.startswith('- [x]')
                        label = line[5:].strip()
                        tasks.append({
                            "type": "task",
                            "task": label,
                            "done": done,
                            "section": current_section
                        })
                        
                if tasks:
                    return tasks
            except Exception as e:
                print(f"⚠️ Failed to load {md_file}: {e}")
    return None

def save_tasks_to_json(tasks):
    docs_path = os.path.join(os.getcwd(), 'docs')
    os.makedirs(docs_path, exist_ok=True)
    json_path = os.path.join(docs_path, 'sprint.json')
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(tasks, f, indent=2)
    except Exception as e:
        print(f"⚠️ Failed to save sprint.json: {e}")

def list_sprint_files():
    docs_path = os.path.join(os.getcwd(), 'docs')
    files = []
    if os.path.exists(docs_path):
        for fname in os.listdir(docs_path):
            if fname.endswith('.json') or fname.endswith('.md'):
                files.append(fname)
    print(json.dumps(files))

# Try to load tasks from any .json, or sprint.md/todo.md if they exist
loaded_tasks = load_tasks_from_any_json_or_md()
if loaded_tasks is not None:
    arcano_tasks = loaded_tasks

def start_task(task_name):
    matched = False
    for task in arcano_tasks:
        if task["task"].strip().lower() == task_name.strip().lower():
            print(f"▶️ Starting task: {task['task']}")
            matched = True
            break
    if not matched:
        print(f"❌ Task not found: {task_name}")

def run_sprint(sprint_name):
    print(f"\n▶️ Running {sprint_name}...")
    changed = False
    for task in arcano_tasks:
        if sprint_name.lower() in task["task"].lower():
            if not task["done"]:
                task["done"] = True
                changed = True
            print(f"✅ {task['task']}")
    if changed:
        save_tasks_to_json(arcano_tasks)
    print("\nSprint complete.")

def mark_task_done(task_name):
    # Convert to use toggle_task_status
    for task in arcano_tasks:
        if task["task"].strip().lower() == task_name.strip().lower():
            if not task["done"]:
                toggle_task_status(task_name)
            return
    print(f"❌ Task not found: {task_name}")

def show_status():
    completed = [t for t in arcano_tasks if t['done']]
    pending = [t for t in arcano_tasks if not t['done']]

    print("\n📊 Sprint Progress Summary:")
    print(f"✅ Completed: {len(completed)}")
    print(f"🕐 Pending: {len(pending)}")

    for task in arcano_tasks:
        status = "[x]" if task["done"] else "[ ]"
        print(f" {status} {task['task']}")

def update_markdown_task(file_path, task_text, new_status):
    """Update a task's status in a markdown file."""
    if not os.path.exists(file_path):
        return False
        
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Escape special regex characters in the task text
    escaped_task = re.escape(task_text)
    
    # Pattern to match the task line, capturing any indentation and handling Windows line endings
    # This pattern will match the task regardless of indentation or section
    pattern = r'(\r?\n|\A)(\s*)- \[([ x])\] ' + escaped_task + r'(\r?\n|\Z)'
    
    # Create the replacement with the same indentation and line endings
    def replace_match(match):
        line_start = match.group(1)  # \n, \r\n, or empty if at start
        indentation = match.group(2)  # Spaces/tabs
        line_end = match.group(4)     # \n, \r\n, or empty if at end
        return f"{line_start}{indentation}- [{'x' if new_status else ' '}] {task_text}{line_end}"
        
    new_content = re.sub(pattern, replace_match, content)
    
    if new_content != content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def toggle_task_status(task_name):
    """Toggle a task's done status."""
    matched = False
    task_to_toggle = None
    
    # First find the task and get its current status
    for task in arcano_tasks:
        if task.get("type", "task") == "task" and task["task"].strip().lower() == task_name.strip().lower():
            task_to_toggle = task
            matched = True
            break
            
    if not matched:
        print(f"❌ Task not found: {task_name}")
        return
        
    # Toggle the status
    new_status = not task_to_toggle["done"]
    task_to_toggle["done"] = new_status
    
    # Update both JSON and MD files
    save_tasks_to_json(arcano_tasks)
    
    # Try to update markdown files
    docs_path = os.path.join(os.getcwd(), 'docs')
    md_files = ['sprint.md', 'todo.md']
    updated_md = False
    
    for md_file in md_files:
        file_path = os.path.join(docs_path, md_file)
        if update_markdown_task(file_path, task_name, new_status):
            updated_md = True
            print(f"✔️ Updated task status in {md_file}")
            
    if not updated_md:
        print("⚠️ Could not find task in markdown files")
        
    print(f"{'✔️' if new_status else '↩️'} Task {'marked as done' if new_status else 'unmarked'}: {task_name}")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sprint', type=str, help='Sprint name to run')
    parser.add_argument('--done', type=str, help='Exact task name to mark as done')
    parser.add_argument('--start', type=str, help='Record starting a specific task')
    parser.add_argument('--status', action='store_true', help='Show current task status')
    parser.add_argument('--list-files', action='store_true', help='List available sprint/task files')
    parser.add_argument('--file', type=str, help='Specify a sprint/task file to load')
    parser.add_argument('--toggle', type=str, help='Toggle done status of a task')
    args = parser.parse_args()

    if args.list_files:
        list_sprint_files()
    elif args.file:
        # Load tasks from the specified file
        docs_path = os.path.join(os.getcwd(), 'docs')
        file_path = os.path.join(docs_path, args.file)
        tasks = None
        if args.file.endswith('.json'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        tasks = data
            except Exception as e:
                print(f"⚠️ Failed to load {args.file}: {e}", file=sys.stderr)
        elif args.file.endswith('.md'):
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                tasks = []
                current_section = None
                
                for line in lines:
                    line = line.strip()
                    
                    # Check for section headers (### Header)
                    if line.startswith('###'):
                        current_section = line.lstrip('#').strip()
                        # Add a section marker to the tasks list
                        tasks.append({"type": "section", "name": current_section})
                        continue
                        
                    # Check for task items
                    if line.startswith('- [ ]') or line.startswith('- [x]'):
                        done = line.startswith('- [x]')
                        label = line[5:].strip()
                        tasks.append({
                            "type": "task",
                            "task": label,
                            "done": done,
                            "section": current_section
                        })
            except Exception as e:
                print(f"⚠️ Failed to load {args.file}: {e}", file=sys.stderr)
        if tasks is not None:
            print(json.dumps(tasks, ensure_ascii=False))
        else:
            print(f"⚠️ No valid tasks found in {args.file}", file=sys.stderr)
    elif args.sprint:
        run_sprint(args.sprint)
    elif args.done:
        mark_task_done(args.done)
    elif args.toggle:
        toggle_task_status(args.toggle)
    elif args.start:
        start_task(args.start)
    elif args.status:
        show_status()
    else:
        print("❓ No valid command provided. Use --sprint, --start, --done, --toggle, --status, --list-files, or --file.")

if __name__ == '__main__':
    main()
