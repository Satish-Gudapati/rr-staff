import { useAuth } from '@/contexts/AuthContext';
import { mockTasks, mockActivityLogs } from '@/data/mock';
import MetricCard from '@/components/shared/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle2, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filter tasks for current employee
  const myTasks = mockTasks.filter(t => t.assigned_to === user?.id);
  const openTasks = myTasks.filter(t => t.status !== 'completed').length;
  const completedTasks = myTasks.filter(t => t.status === 'completed').length;
  const performance = myTasks.length > 0 ? Math.round((completedTasks / myTasks.length) * 100) : 0;

  const myLogs = mockActivityLogs.filter(l => l.user_id === user?.id);

  const metrics = [
    {
      title: 'My Open Tasks',
      value: openTasks,
      icon: <ClipboardList size={22} />,
      gradient: 'primary' as const,
    },
    {
      title: 'Tasks Completed',
      value: completedTasks,
      icon: <CheckCircle2 size={22} />,
      gradient: 'success' as const,
    },
    {
      title: 'Performance',
      value: `${performance}%`,
      icon: <TrendingUp size={22} />,
      gradient: 'warning' as const,
    },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Hi, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's your personal workspace.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m, i) => (
          <MetricCard key={m.title} {...m} index={i} />
        ))}
      </div>

      {/* My Tasks */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">My Tasks</h2>
          <button onClick={() => navigate('/tasks')} className="text-sm text-primary hover:underline">
            View all
          </button>
        </div>
        {myTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No tasks assigned yet.</p>
        ) : (
          <div className="space-y-3">
            {myTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => navigate(`/tasks/${task.id}`)}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Due: {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No deadline'}
                  </p>
                </div>
                <StatusBadge status={task.status} />
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* My Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">My Recent Activity</h2>
        {myLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No recent activity.</p>
        ) : (
          <div className="space-y-3">
            {myLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <p className="text-sm text-foreground">{log.action}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} />
                  {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default EmployeeDashboard;
