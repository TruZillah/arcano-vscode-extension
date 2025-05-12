export interface Task {
    type: 'task';
    task: string;
    done: boolean;
    section?: string;
}

export interface Section {
    type: 'section';
    name: string;
}

export type SprintItem = Task | Section;

export interface User {
    name: string;
    preferences?: {
        [key: string]: any;
    };
}
