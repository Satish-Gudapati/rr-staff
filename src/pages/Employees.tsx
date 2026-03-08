import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, X, Loader2, Shield, UserPlus, Users, Monitor, Smartphone, Tablet, MonitorSmartphone, KeyRound } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import { DeviceType, DEVICE_LABELS } from '@/lib/deviceDetect';

const DEVICE_OPTIONS: { value: DeviceType; label: string; icon: React.ReactNode }[] = [
  { value: 'mobile', label: 'Mobile', icon: <Smartphone size={16} /> },
  { value: 'tablet', label: 'Tablet', icon: <Tablet size={16} /> },
  { value: 'desktop', label: 'Desktop', icon: <Monitor size={16} /> },
  { value: 'pos', label: 'POS Terminal', icon: <MonitorSmartphone size={16} /> },
];

interface EmployeeFormData {
  full_name: string;
  email: string;
  password: string;
  permissions: string[];
  role_id: string;
  salary: string;
  incentives: string;
  allowed_devices: string[];
}

const Employees = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<EmployeeFormData>({ full_name: '', email: '', password: '', permissions: [], role_id: '', salary: '0', incentives: '0', allowed_devices: ['mobile', 'tablet', 'desktop', 'pos'] });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetPwId, setResetPwId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Fetch employees
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee')
        .eq('owner_id', user?.id || '');
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch roles
  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('*');
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all permissions
  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await supabase.from('permissions').select('*');
      return (data || []) as Permission[];
    },
  });

  // Fetch employee permissions
  const { data: empPermissions = [] } = useQuery({
    queryKey: ['employee-permissions'],
    queryFn: async () => {
      const { data } = await supabase.from('employee_permissions').select('*');
      return data || [];
    },
    enabled: !!user,
  });

  // Create employee
  const createMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const { data: result, error } = await supabase.functions.invoke('manage-employees', {
        body: { action: 'create', ...data },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Employee created successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-permissions'] });
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update employee
  const updateMutation = useMutation({
    mutationFn: async ({ profileId, data }: { profileId: string; data: Partial<EmployeeFormData> }) => {
      const { data: result, error } = await supabase.functions.invoke('manage-employees', {
        body: { action: 'update', profile_id: profileId, ...data },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Employee updated successfully');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-permissions'] });
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete employee
  const deleteMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const { data: result, error } = await supabase.functions.invoke('manage-employees', {
        body: { action: 'delete', profile_id: profileId },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast.success('Employee deleted');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ profileId, isActive }: { profileId: string; isActive: boolean }) => {
      const { data: result, error } = await supabase.functions.invoke('manage-employees', {
        body: { action: 'update', profile_id: profileId, is_active: isActive },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ full_name: '', email: '', password: '', permissions: [], role_id: '', salary: '0', incentives: '0', allowed_devices: ['mobile', 'tablet', 'desktop', 'pos'] });
  };

  const handleEdit = (emp: any) => {
    const empPerms = empPermissions.filter((ep: any) => ep.profile_id === emp.id).map((ep: any) => ep.permission_id);
    setFormData({ full_name: emp.full_name, email: emp.email, password: '', permissions: empPerms, role_id: emp.role_id || '', salary: String(emp.salary || 0), incentives: String(emp.incentives || 0), allowed_devices: emp.allowed_devices || ['mobile', 'tablet', 'desktop', 'pos'] });
    setEditingId(emp.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({
        profileId: editingId,
        data: { full_name: formData.full_name, email: formData.email, permissions: formData.permissions, role_id: formData.role_id || '', salary: formData.salary, incentives: formData.incentives, allowed_devices: formData.allowed_devices },
      });
    } else {
      if (!formData.password || formData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      createMutation.mutate(formData);
    }
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const filteredEmployees = employees.filter((e: any) =>
    e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Employees</h1>
          <p className="text-muted-foreground mt-1">Create and manage employee accounts</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl metric-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <UserPlus size={16} /> Add Employee
        </button>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search employees..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-foreground">{editingId ? 'Edit Employee' : 'Add New Employee'}</h2>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                  <input type="text" value={formData.full_name} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Employee name" required
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="employee@company.com" required
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                    <input type="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Min. 6 characters" required minLength={6}
                      className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                )}

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Role</label>
                  <select value={formData.role_id} onChange={(e) => setFormData(prev => ({ ...prev, role_id: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">No role assigned</option>
                    {roles.map((role: any) => (
                      <option key={role.id} value={role.id}>{role.name}</option>
                    ))}
                  </select>
                </div>

                {/* Salary & Incentives */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Salary (₹)</label>
                    <input type="number" value={formData.salary} onChange={(e) => setFormData(prev => ({ ...prev, salary: e.target.value }))}
                      placeholder="0" min="0" step="100"
                      className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Incentives (₹)</label>
                    <input type="number" value={formData.incentives} onChange={(e) => setFormData(prev => ({ ...prev, incentives: e.target.value }))}
                      placeholder="0" min="0" step="100"
                      className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Shield size={14} /> Website Access Permissions
                  </label>
                  <div className="space-y-2">
                    {allPermissions.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-accent/10 cursor-pointer transition-colors">
                        <input type="checkbox" checked={formData.permissions.includes(perm.id)}
                          onChange={() => togglePermission(perm.id)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-ring" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{perm.label}</p>
                          {perm.description && <p className="text-xs text-muted-foreground">{perm.description}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Device Access Control */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Monitor size={14} /> Allowed Login Devices
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DEVICE_OPTIONS.map((device) => {
                      const isChecked = formData.allowed_devices.includes(device.value);
                      return (
                        <label key={device.value}
                          className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                            isChecked ? 'bg-primary/10 border border-primary/30' : 'bg-muted border border-transparent hover:bg-accent/10'
                          }`}>
                          <input type="checkbox" checked={isChecked}
                            onChange={() => {
                              setFormData(prev => ({
                                ...prev,
                                allowed_devices: isChecked
                                  ? prev.allowed_devices.filter(d => d !== device.value)
                                  : [...prev.allowed_devices, device.value],
                              }));
                            }}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-ring" />
                          <span className="text-muted-foreground">{device.icon}</span>
                          <span className="text-sm font-medium text-foreground">{device.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  {formData.allowed_devices.length === 0 && (
                    <p className="text-xs text-destructive mt-1">At least one device must be selected</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetForm}
                    className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className="flex-1 py-2.5 rounded-xl metric-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {editingId ? 'Update Employee' : 'Create Employee'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Employee List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : filteredEmployees.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{search ? 'No employees match your search.' : 'No employees yet. Click "Add Employee" to get started.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEmployees.map((emp: any, i: number) => {
            const empPerms = empPermissions.filter((ep: any) => ep.profile_id === emp.id);
            const permNames = empPerms.map((ep: any) => {
              const perm = allPermissions.find(p => p.id === ep.permission_id);
              return perm?.label || '';
            }).filter(Boolean);

            return (
              <motion.div key={emp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                    {emp.full_name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                   <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{emp.full_name}</h3>
                      {emp.role_id && roles.find((r: any) => r.id === emp.role_id) && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent text-accent-foreground">
                          {roles.find((r: any) => r.id === emp.role_id)?.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {(emp.salary > 0 || emp.incentives > 0) && (
                        <span className="text-xs text-muted-foreground">
                          ₹{Number(emp.salary || 0).toLocaleString()}{emp.incentives > 0 ? ` + ₹${Number(emp.incentives).toLocaleString()} incentives` : ''}
                        </span>
                      )}
                    </div>
                    {permNames.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {permNames.map((name: string) => (
                          <span key={name} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleActiveMutation.mutate({ profileId: emp.id, isActive: !emp.is_active })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      emp.is_active ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}>
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => handleEdit(emp)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil size={15} />
                  </button>
                  {deleteConfirm === emp.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteMutation.mutate(emp.id)}
                        className="px-2 py-1 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:opacity-90">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(emp.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};


export default Employees;
