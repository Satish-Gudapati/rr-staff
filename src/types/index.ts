export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'employee';
  company_name?: string;
  owner_id?: string;
  is_active: boolean;
  role_id?: string;
  salary?: number;
  incentives?: number;
  created_at: string;
  updated_at: string;
  permissions?: Permission[];
}

export interface Role {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: string;
  name: string;
  label: string;
  description?: string;
}

export interface EmployeePermission {
  id: string;
  profile_id: string;
  permission_id: string;
  granted_by?: string;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assigned_to: string;
  assigned_to_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  timestamp: string;
  details?: string;
}
