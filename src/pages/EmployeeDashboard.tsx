import { useAuth } from '@/contexts/AuthContext';
import MetricCard from '@/components/shared/MetricCard';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle2, TrendingUp, Gift, IndianRupee, Clock, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '@/components/shared/StatusBadge';
import PriorityBadge from '@/components/shared/PriorityBadge';
import { format } from 'date-fns';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: tasks = [] } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').eq('assigned_to', user!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: incentives = [] } = useQuery({
    queryKey: ['my-incentives', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('incentives').select('*').eq('employee_id', user!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const pending = tasks.filter(t => t.status === 'pending').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const totalIncentives = incentives.reduce((s, i) => s + Number(i.amount), 0);
  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

  const metrics = [
    { title: 'My Tasks', value: String(tasks.length), icon: <ClipboardList size={22} />, gradient: 'primary' as const },
    { title: 'Pending', value: String(pending), icon: <AlertCircle size={22} />, gradient: 'warning' as const },
    { title: 'Completed', value: String(completed), icon: <CheckCircle2 size={22} />, gradient: 'success' as const },
    { title: 'Incentives', value: fmt(totalIncentives), icon: <Gift size={22} />, gradient: 'primary' as const },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Hi, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground mt-1">Here's your personal workspace.</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, i) => <MetricCard key={m.title} {...m} index={i} />)}
      </div>

      {/* My Tasks */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">My Tasks</h2>
          <button onClick={() => navigate('/tasks')} className="text-sm text-primary hover:underline">View all</button>
        </div>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tasks assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 5).map(task => (
              <div key={task.id} onClick={() => navigate(`/tasks/${task.id}`)}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={task.status as any} />
                    <PriorityBadge priority={task.priority as 'low' | 'medium' | 'high'} />
                    <span className="text-xs text-muted-foreground">{task.service_type}</span>
                  </div>
                </div>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"><Clock size={12} />{format(new Date(task.due_date), 'MMM d')}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* My Incentives */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">My Incentives</h2>
          <button onClick={() => navigate('/incentives')} className="text-sm text-primary hover:underline">View all</button>
        </div>
        {incentives.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No incentives yet.</p>
        ) : (
          <div className="space-y-3">
            {incentives.slice(0, 5).map(inc => (
              <div key={inc.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{inc.reason || 'Incentive'}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(inc.incentive_date), 'MMM d, yyyy')}</p>
                </div>
                <p className="text-sm font-bold text-foreground flex items-center gap-0.5"><IndianRupee size={13} />{Number(inc.amount).toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* My Permissions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">My Permissions</h2>
        {user?.permissions && user.permissions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {user.permissions.map((perm) => (
              <div key={perm.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted">
                <CheckCircle2 size={16} className="text-success shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">{perm.label}</p>
                  {perm.description && <p className="text-xs text-muted-foreground">{perm.description}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No permissions assigned yet.</p>
        )}
      </motion.div>
    </div>
  );
};

export default EmployeeDashboard;
