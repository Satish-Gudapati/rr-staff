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
  owner_id: string;
  created_by: string;
  assigned_to: string;
  title: string;
  description: string;
  service_type: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  total_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // joined fields
  assigned_to_profile?: UserProfile;
  created_by_profile?: UserProfile;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  details?: string;
  created_at: string;
  user_profile?: UserProfile;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface Sale {
  id: string;
  owner_id: string;
  entered_by: string;
  amount: number;
  payment_mode: 'cash' | 'upi' | 'card';
  description?: string;
  customer_name?: string;
  task_id?: string;
  created_at: string;
  updated_at: string;
  entered_by_profile?: Partial<UserProfile>;
}

export interface Incentive {
  id: string;
  owner_id: string;
  employee_id: string;
  amount: number;
  reason?: string;
  incentive_date: string;
  created_by: string;
  created_at: string;
  employee_profile?: UserProfile;
}
