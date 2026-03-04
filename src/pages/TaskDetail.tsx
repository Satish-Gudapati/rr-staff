import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, IndianRupee, Clock, User, Send, Edit2, Check } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task, TaskActivity } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import PriorityBadge from '@/components/shared/PriorityBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';

const paymentConfig = {
  unpaid: { label: 'Unpaid', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  partial: { label: 'Partial', className: 'bg-warning/10 text-warning border-warning/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
};

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [remark, setRemark] = useState('');
  const [editing, setEditing] = useState(false);

  const isOwner = user?.role === 'owner';
  const canManage = isOwner || user?.permissions?.some(p => p.name === 'can_manage_tasks');

  // Fetch task
  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').eq('id', id!).single();
      if (error) throw error;
      const profileIds = [data.assigned_to, data.created_by];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', profileIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      return { ...data, assigned_to_profile: profileMap[data.assigned_to], created_by_profile: profileMap[data.created_by] } as Task;
    },
    enabled: !!id && !!user,
  });

  // Fetch activities
  const { data: activities = [] } = useQuery({
    queryKey: ['task-activities', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('task_activities').select('*').eq('task_id', id!).order('created_at', { ascending: true });
      if (error) throw error;
      const userIds = [...new Set((data || []).map(a => a.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      return (data || []).map(a => ({ ...a, user_profile: profileMap[a.user_id] })) as TaskActivity[];
    },
    enabled: !!id && !!user,
  });

  // Fetch employees
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list-detail', user?.id],
    queryFn: async () => {
      const ownerId = isOwner ? user!.id : user!.owner_id;
      const { data } = await supabase.from('profiles').select('id, full_name').eq('owner_id', ownerId || '').eq('is_active', true);
      return data || [];
    },
    enabled: !!user,
  });

  // Realtime
  useEffect(() => {
    if (!id) return;
    const ch1 = supabase.channel(`task-${id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `id=eq.${id}` }, () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
    }).subscribe();
    const ch2 = supabase.channel(`task-activities-${id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'task_activities', filter: `task_id=eq.${id}` }, () => {
      queryClient.invalidateQueries({ queryKey: ['task-activities', id] });
    }).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [id, queryClient]);

  // Edit form state
  const [editForm, setEditForm] = useState<any>({});
  useEffect(() => {
    if (task && editing) {
      setEditForm({
        status: task.status,
        payment_status: task.payment_status,
        total_amount: String(task.total_amount || 0),
        assigned_to: task.assigned_to,
        priority: task.priority,
        due_date: task.due_date ? format(new Date(task.due_date), 'yyyy-MM-dd') : '',
      });
    }
  }, [task, editing]);

  // Update task
  const updateMutation = useMutation({
    mutationFn: async () => {
      const updates: any = {
        status: editForm.status,
        payment_status: editForm.payment_status,
        total_amount: parseFloat(editForm.total_amount) || 0,
        assigned_to: editForm.assigned_to,
        priority: editForm.priority,
        due_date: editForm.due_date || null,
      };
      if (editForm.status === 'completed' && task?.status !== 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await supabase.from('tasks').update(updates).eq('id', id!);
      if (error) throw error;

      // Log changes
      const changes: string[] = [];
      if (editForm.status !== task?.status) changes.push(`Status → ${editForm.status}`);
      if (editForm.payment_status !== task?.payment_status) changes.push(`Payment → ${editForm.payment_status}`);
      if (editForm.assigned_to !== task?.assigned_to) changes.push('Reassigned');
      if (changes.length > 0) {
        await supabase.from('task_activities').insert({ task_id: id!, user_id: user!.id, action: 'updated', details: changes.join(', ') });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setEditing(false);
      const wasCompleted = editForm.status === 'completed' && task?.status !== 'completed';
      const isPaid = editForm.payment_status === 'paid';
      if (wasCompleted && isPaid && (parseFloat(editForm.total_amount) || 0) > 0) {
        toast.success('Task updated — sale auto-created in Sales');
      } else {
        toast.success('Task updated');
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Quick status update (for assigned employees)
  const quickStatusUpdate = useMutation({
    mutationFn: async (newStatus: string) => {
      const updates: any = { status: newStatus };
      if (newStatus === 'completed') updates.completed_at = new Date().toISOString();
      const { error } = await supabase.from('tasks').update(updates).eq('id', id!);
      if (error) throw error;
      await supabase.from('task_activities').insert({ task_id: id!, user_id: user!.id, action: 'status_change', details: `Status → ${newStatus}` });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast.success('Status updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Add remark
  const remarkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('task_activities').insert({ task_id: id!, user_id: user!.id, action: 'remark', details: remark.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-activities', id] });
      setRemark('');
      toast.success('Remark added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !task) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <button onClick={() => navigate('/tasks')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={16} /> Back to Tasks
        </button>
        <div className="glass-card p-12 text-center"><p className="text-muted-foreground">Loading...</p></div>
      </div>
    );
  }

  const isAssignee = task.assigned_to === user?.id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate('/tasks')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft size={16} /> Back to Tasks
        </button>
      </motion.div>

      {/* Task Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{task.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{task.description || 'No description'}</p>
            <div className="flex items-center gap-3 mt-3 flex-wrap">
              <StatusBadge status={task.status as any} />
              <PriorityBadge priority={task.priority} />
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${paymentConfig[task.payment_status].className}`}>
                {paymentConfig[task.payment_status].label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && !editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors">
                <Edit2 size={14} /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-muted-foreground">Service</p>
            <p className="text-sm font-medium text-foreground mt-0.5">{task.service_type}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Amount</p>
            <p className="text-sm font-semibold text-foreground mt-0.5 flex items-center gap-0.5"><IndianRupee size={13} />{Number(task.total_amount).toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Assigned To</p>
            <p className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1"><User size={13} />{task.assigned_to_profile?.full_name || 'Unknown'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <p className="text-sm font-medium text-foreground mt-0.5 flex items-center gap-1"><Clock size={13} />{task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'Not set'}</p>
          </div>
        </div>

        {/* Quick status for assignee */}
        {isAssignee && !editing && task.status !== 'completed' && task.status !== 'cancelled' && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Update Status</p>
            <div className="flex gap-2 flex-wrap">
              {task.status === 'pending' && (
                <button onClick={() => quickStatusUpdate.mutate('in_progress')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  Start Working
                </button>
              )}
              {(task.status === 'pending' || task.status === 'in_progress') && (
                <button onClick={() => quickStatusUpdate.mutate('completed')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-success text-success-foreground hover:bg-success/90 transition-colors flex items-center gap-1">
                  <Check size={12} /> Mark Complete
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Edit form */}
      {editing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Edit Task</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Status</Label>
              <Select value={editForm.payment_status} onValueChange={v => setEditForm((f: any) => ({ ...f, payment_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Total Amount (₹)</Label>
              <Input type="number" min="0" step="0.01" value={editForm.total_amount} onChange={e => setEditForm((f: any) => ({ ...f, total_amount: e.target.value }))} />
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={editForm.priority} onValueChange={v => setEditForm((f: any) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign To</Label>
              <Select value={editForm.assigned_to} onValueChange={v => setEditForm((f: any) => ({ ...f, assigned_to: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={editForm.due_date} onChange={e => setEditForm((f: any) => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Activity Timeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Activity Timeline</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No activity yet.</p>
        ) : (
          <div className="space-y-4">
            {activities.map(a => (
              <div key={a.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0 mt-0.5">
                  {a.user_profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{a.user_profile?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{a.action === 'remark' ? 'added a remark' : a.action === 'status_change' ? 'changed status' : 'updated task'}</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(a.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                  {a.details && <p className="text-sm text-muted-foreground mt-0.5">{a.details}</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add remark */}
        <div className="mt-4 pt-4 border-t border-border">
          <form onSubmit={e => { e.preventDefault(); if (remark.trim()) remarkMutation.mutate(); }} className="flex gap-2">
            <Textarea value={remark} onChange={e => setRemark(e.target.value)} placeholder="Add a remark or update..." rows={1} className="flex-1 min-h-[40px] resize-none" />
            <button type="submit" disabled={!remark.trim() || remarkMutation.isPending}
              className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0">
              <Send size={16} />
            </button>
          </form>
        </div>
      </motion.div>

      {/* Meta info */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-xs text-muted-foreground flex flex-wrap gap-4">
        <span>Created by: {task.created_by_profile?.full_name || 'Unknown'}</span>
        <span>Created: {format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}</span>
        {task.completed_at && <span>Completed: {format(new Date(task.completed_at), 'MMM d, yyyy h:mm a')}</span>}
      </motion.div>
    </div>
  );
};

export default TaskDetail;
