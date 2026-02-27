import { useAuth } from '@/contexts/AuthContext';
import { mockTasks, mockActivityLogs, mockEmployees } from '@/data/mock';
import MetricCard from '@/components/shared/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { motion } from 'framer-motion';
import { IndianRupee, Users, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const completedTasks = mockTasks.filter(t => t.status === 'completed').length;
  const totalTasks = mockTasks.length;
  const completionRate = Math.round((completedTasks / totalTasks) * 100);

  const metrics = [
    {
      title: 'Total Monthly Salaries',
      value: '₹4,85,000',
      change: '+2.4% from last month',
      changeType: 'positive' as const,
      icon: <IndianRupee size={22} />,
      gradient: 'primary' as const,
    },
    {
      title: 'Active Staff',
      value: mockEmployees.length,
      change: 'All hands on deck',
      changeType: 'neutral' as const,
      icon: <Users size={22} />,
      gradient: 'success' as const,
    },
    {
      title: 'Task Completion',
      value: `${completionRate}%`,
      change: `${completedTasks} of ${totalTasks} completed`,
      changeType: 'positive' as const,
      icon: <CheckCircle2 size={22} />,
      gradient: 'warning' as const,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Welcome back, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-1">Here's your workforce overview for today.</p>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m, i) => (
          <MetricCard key={m.title} {...m} index={i} />
        ))}
      </div>

      {/* Quick Actions + Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'New Task', action: () => navigate('/tasks') },
              { label: 'View Staff', action: () => navigate('/employees') },
              { label: 'Reports', action: () => navigate('/reports') },
              { label: 'All Tasks', action: () => navigate('/tasks') },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="p-4 rounded-xl bg-muted hover:bg-accent/10 transition-colors text-sm font-medium text-foreground flex items-center justify-between group"
              >
                {item.label}
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Tasks</h2>
            <button onClick={() => navigate('/tasks')} className="text-sm text-primary hover:underline">
              View all
            </button>
          </div>
          <div className="space-y-3">
            {mockTasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.assigned_to_name}</p>
                </div>
                <StatusBadge status={task.status} />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Activity Log */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {mockActivityLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0 mt-0.5">
                {log.user_name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{log.user_name}</span>{' '}
                  <span className="text-muted-foreground">{log.action}</span>
                </p>
                {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock size={12} />
                {format(new Date(log.timestamp), 'MMM d, HH:mm')}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default OwnerDashboard;
