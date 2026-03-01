import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Permission } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, X, Loader2, Shield, Tag } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RoleFormData {
  name: string;
  description: string;
  permissions: string[];
}

const Roles = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<RoleFormData>({ name: '', description: '', permissions: [] });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data } = await supabase.from('roles').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data } = await supabase.from('permissions').select('*');
      return (data || []) as Permission[];
    },
  });

  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data } = await supabase.from('role_permissions').select('*');
      return data || [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: RoleFormData & { id?: string }) => {
      if (data.id) {
        await supabase.from('roles').update({ name: data.name, description: data.description }).eq('id', data.id);
        await supabase.from('role_permissions').delete().eq('role_id', data.id);
        if (data.permissions.length > 0) {
          await supabase.from('role_permissions').insert(
            data.permissions.map(pid => ({ role_id: data.id!, permission_id: pid }))
          );
        }
      } else {
        const profileId = user?.id;
        const { data: role, error } = await supabase.from('roles').insert({
          name: data.name, description: data.description, owner_id: profileId!,
        }).select().single();
        if (error) throw error;
        if (data.permissions.length > 0) {
          await supabase.from('role_permissions').insert(
            data.permissions.map(pid => ({ role_id: role.id, permission_id: pid }))
          );
        }
      }
    },
    onSuccess: () => {
      toast.success(editingId ? 'Role updated' : 'Role created');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role deleted');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDeleteConfirm(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', permissions: [] });
  };

  const handleEdit = (role: any) => {
    const perms = rolePermissions.filter((rp: any) => rp.role_id === role.id).map((rp: any) => rp.permission_id);
    setFormData({ name: role.name, description: role.description || '', permissions: perms });
    setEditingId(role.id);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...formData, id: editingId || undefined });
  };

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const filteredRoles = roles.filter((r: any) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Roles</h1>
          <p className="text-muted-foreground mt-1">Create and manage employee roles with permissions</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl metric-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
          <Plus size={16} /> Add Role
        </button>
      </motion.div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search roles..." value={search} onChange={(e) => setSearch(e.target.value)}
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
                <h2 className="text-lg font-semibold text-foreground">{editingId ? 'Edit Role' : 'Add New Role'}</h2>
                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Role Name</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Manager, Technician" required
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this role" rows={2}
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                    <Shield size={14} /> Permissions
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

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetForm}
                    className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saveMutation.isPending}
                    className="flex-1 py-2.5 rounded-xl metric-gradient text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                    {saveMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                    {editingId ? 'Update Role' : 'Create Role'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Role List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : filteredRoles.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Tag size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{search ? 'No roles match your search.' : 'No roles yet. Click "Add Role" to get started.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRoles.map((role: any, i: number) => {
            const perms = rolePermissions.filter((rp: any) => rp.role_id === role.id);
            const permNames = perms.map((rp: any) => {
              const perm = allPermissions.find(p => p.id === rp.permission_id);
              return perm?.label || '';
            }).filter(Boolean);

            return (
              <motion.div key={role.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                    <Tag size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">{role.name}</h3>
                    {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
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
                  <button onClick={() => handleEdit(role)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil size={15} />
                  </button>
                  {deleteConfirm === role.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteMutation.mutate(role.id)}
                        className="px-2 py-1 rounded text-xs font-medium bg-destructive text-destructive-foreground hover:opacity-90">
                        Confirm
                      </button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(role.id)} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
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

export default Roles;
