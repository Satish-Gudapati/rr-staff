import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Search, Filter, IndianRupee, Clock, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Task } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';
import PriorityBadge from '@/components/shared/PriorityBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const paymentConfig = {
  unpaid: { label: 'Unpaid', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  partial: { label: 'Partial', className: 'bg-warning/10 text-warning border-warning/20' },
  paid: { label: 'Paid', className: 'bg-success/10 text-success border-success/20' },
};

const Tasks = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isOwner = user?.role === 'owner';
  const canManage = isOwner || user?.permissions?.some(p => p.name === 'can_manage_tasks');

  // Fetch employees for assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list', user?.id],
    queryFn: async () => {
      const ownerId = isOwner ? user!.id : user!.owner_id;
      const { data } = await supabase.from('profiles').select('*').eq('owner_id', ownerId || '').eq('is_active', true);
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch services for dropdown
  const { data: servicesList = [] } = useQuery({
    queryKey: ['services-list', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('services').select('*').eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch sub-services for dropdown
  const { data: subServicesList = [] } = useQuery({
    queryKey: ['sub-services-list', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('sub_services').select('*').eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch tasks
  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch profile names for assigned_to and created_by
      const profileIds = [...new Set((data || []).flatMap(t => [t.assigned_to, t.created_by]))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', profileIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      return (data || []).map(t => ({
        ...t,
        assigned_to_profile: profileMap[t.assigned_to],
        created_by_profile: profileMap[t.created_by],
      })) as Task[];
    },
    enabled: !!user,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Create task
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', description: '', service_id: '', sub_service_id: '',
    assigned_to: '',
    priority: 'medium' as Task['priority'],
    total_amount: '', payment_status: 'unpaid' as Task['payment_status'],
    due_date: '',
  });

  // Filter sub-services based on selected service
  const filteredSubServices = subServicesList.filter(
    ss => ss.service_id === form.service_id
  );

  // Auto-fill amount when sub-service is selected
  const handleSubServiceChange = (subServiceId: string) => {
    const subService = subServicesList.find(ss => ss.id === subServiceId);
    setForm(f => ({
      ...f,
      sub_service_id: subServiceId,
      total_amount: subService ? String(subService.price) : f.total_amount,
    }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const ownerId = isOwner ? user!.id : user!.owner_id!;
      const selectedService = servicesList.find(s => s.id === form.service_id);
      const selectedSubService = subServicesList.find(ss => ss.id === form.sub_service_id);
      const title = form.customer_name.trim() + (selectedSubService ? ` — ${selectedSubService.name}` : selectedService ? ` — ${selectedService.name}` : '');
      const { error } = await supabase.from('tasks').insert({
        owner_id: ownerId,
        created_by: user!.id,
        assigned_to: form.assigned_to,
        assigned_at: new Date().toISOString(),
        title: title,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        description: form.description.trim(),
        service_type: selectedService?.name || 'General',
        service_id: form.service_id || null,
        sub_service_id: form.sub_service_id || null,
        priority: form.priority,
        total_amount: parseFloat(form.total_amount) || 0,
        payment_status: form.payment_status,
        due_date: form.due_date || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreate(false);
      setForm({ customer_name: '', customer_phone: '', description: '', service_id: '', sub_service_id: '', assigned_to: '', priority: 'medium', total_amount: '', payment_status: 'unpaid', due_date: '' });
      toast.success('Task created successfully');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = tasks.filter(t => {
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.service_type.toLowerCase().includes(search.toLowerCase()) ||
      t.assigned_to_profile?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage work assignments & service tracking</p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-md">
            <Plus size={18} /> New Task
          </button>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground' },
          { label: 'Pending', value: stats.pending, color: 'text-warning' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-primary' },
          { label: 'Completed', value: stats.completed, color: 'text-success' },
        ].map(s => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks, services, employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]"><Filter size={14} className="mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="glass-card p-12 text-center"><p className="text-muted-foreground">Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardList size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{tasks.length === 0 ? 'No tasks yet. Create your first task!' : 'No tasks match your filters.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((task, i) => (
              <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="glass-card p-4 cursor-pointer hover:shadow-lg transition-all group">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{task.title}</h3>
                      <StatusBadge status={task.status as any} />
                      <PriorityBadge priority={task.priority} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="inline-flex items-center gap-1"><ClipboardList size={12} />{task.service_type}</span>
                      <span className="inline-flex items-center gap-1"><User size={12} />{task.assigned_to_profile?.full_name || 'Unknown'}</span>
                      {task.due_date && <span className="inline-flex items-center gap-1"><Clock size={12} />{format(new Date(task.due_date), 'MMM d, yyyy')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground flex items-center gap-0.5"><IndianRupee size={13} />{Number(task.total_amount).toLocaleString('en-IN')}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border mt-1 ${paymentConfig[task.payment_status].className}`}>
                        {paymentConfig[task.payment_status].label}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Task</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div><Label>Title *</Label><Input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service *</Label>
                <Select value={form.service_id} onValueChange={v => setForm(f => ({ ...f, service_id: v, sub_service_id: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                    {servicesList.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sub-Service</Label>
                <Select value={form.sub_service_id} onValueChange={handleSubServiceChange} disabled={!form.service_id}>
                  <SelectTrigger><SelectValue placeholder={form.service_id ? "Select sub-service" : "Select service first"} /></SelectTrigger>
                  <SelectContent>
                    {filteredSubServices.map(ss => (
                      <SelectItem key={ss.id} value={ss.id}>{ss.name} — ₹{Number(ss.price).toLocaleString('en-IN')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Task details..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Assign To *</Label>
                <Select required value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Total Amount (₹)</Label><Input type="number" min="0" step="0.01" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} placeholder="0" /></div>
              <div>
                <Label>Payment Status</Label>
                <Select value={form.payment_status} onValueChange={v => setForm(f => ({ ...f, payment_status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={createMutation.isPending || !form.title || !form.assigned_to || !form.service_id}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tasks;
