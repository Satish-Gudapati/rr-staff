import { Task, ActivityLog, UserProfile } from '@/types';

export const mockOwnerProfile: UserProfile = {
  id: '1',
  email: 'admin@rrworkforce.com',
  full_name: 'Rajesh Rathore',
  role: 'owner',
  permissions: {
    can_manage_tasks: true,
    can_manage_employees: true,
    can_view_reports: true,
  },
};

export const mockEmployeeProfile: UserProfile = {
  id: '2',
  email: 'priya@rrworkforce.com',
  full_name: 'Priya Sharma',
  role: 'employee',
  permissions: {
    can_manage_tasks: false,
    can_manage_employees: false,
    can_view_reports: false,
  },
};

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Complete Q1 Financial Report',
    description: 'Prepare and submit the quarterly financial analysis report with all department inputs.',
    status: 'in_progress',
    priority: 'high',
    assigned_to: '2',
    assigned_to_name: 'Priya Sharma',
    created_by: '1',
    created_at: '2026-02-20T09:00:00Z',
    updated_at: '2026-02-25T14:30:00Z',
    due_date: '2026-03-01',
  },
  {
    id: '2',
    title: 'Update Employee Onboarding Docs',
    description: 'Revise the onboarding documentation to include new compliance policies.',
    status: 'pending',
    priority: 'medium',
    assigned_to: '3',
    assigned_to_name: 'Amit Verma',
    created_by: '1',
    created_at: '2026-02-22T10:00:00Z',
    updated_at: '2026-02-22T10:00:00Z',
    due_date: '2026-03-05',
  },
  {
    id: '3',
    title: 'Server Migration Planning',
    description: 'Plan the migration of legacy servers to cloud infrastructure.',
    status: 'completed',
    priority: 'high',
    assigned_to: '4',
    assigned_to_name: 'Suresh Kumar',
    created_by: '1',
    created_at: '2026-02-10T08:00:00Z',
    updated_at: '2026-02-24T16:00:00Z',
    due_date: '2026-02-25',
  },
  {
    id: '4',
    title: 'Design New Dashboard Mockups',
    description: 'Create UI mockups for the new analytics dashboard module.',
    status: 'in_progress',
    priority: 'medium',
    assigned_to: '2',
    assigned_to_name: 'Priya Sharma',
    created_by: '1',
    created_at: '2026-02-18T11:00:00Z',
    updated_at: '2026-02-26T09:15:00Z',
    due_date: '2026-03-02',
  },
  {
    id: '5',
    title: 'Inventory Audit',
    description: 'Conduct a full audit of office supplies and IT equipment.',
    status: 'pending',
    priority: 'low',
    assigned_to: '5',
    assigned_to_name: 'Neha Gupta',
    created_by: '1',
    created_at: '2026-02-25T07:00:00Z',
    updated_at: '2026-02-25T07:00:00Z',
    due_date: '2026-03-10',
  },
];

export const mockActivityLogs: ActivityLog[] = [
  { id: '1', user_id: '2', user_name: 'Priya Sharma', action: 'Updated task status to In Progress', timestamp: '2026-02-27T08:45:00Z', details: 'Q1 Financial Report' },
  { id: '2', user_id: '4', user_name: 'Suresh Kumar', action: 'Completed task', timestamp: '2026-02-24T16:00:00Z', details: 'Server Migration Planning' },
  { id: '3', user_id: '1', user_name: 'Rajesh Rathore', action: 'Created new task', timestamp: '2026-02-25T07:00:00Z', details: 'Inventory Audit' },
  { id: '4', user_id: '3', user_name: 'Amit Verma', action: 'Logged in', timestamp: '2026-02-27T09:00:00Z' },
  { id: '5', user_id: '2', user_name: 'Priya Sharma', action: 'Added update note', timestamp: '2026-02-26T09:15:00Z', details: 'Dashboard Mockups' },
];

export const mockEmployees = [
  { id: '2', name: 'Priya Sharma', role: 'Finance Analyst', status: 'active' },
  { id: '3', name: 'Amit Verma', role: 'HR Manager', status: 'active' },
  { id: '4', name: 'Suresh Kumar', role: 'DevOps Engineer', status: 'active' },
  { id: '5', name: 'Neha Gupta', role: 'Office Admin', status: 'active' },
];
