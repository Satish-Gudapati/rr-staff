import { mockTasks, mockEmployees } from '@/data/mock';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';

const Reports = () => {
  const statusCounts = {
    pending: mockTasks.filter(t => t.status === 'pending').length,
    in_progress: mockTasks.filter(t => t.status === 'in_progress').length,
    completed: mockTasks.filter(t => t.status === 'completed').length,
  };

  const total = mockTasks.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">Workforce analytics overview</p>
      </motion.div>

      {/* Task Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <BarChart3 size={18} />
          Task Distribution
        </h2>
        <div className="space-y-4">
          {[
            { label: 'Pending', count: statusCounts.pending, color: 'bg-warning' },
            { label: 'In Progress', count: statusCounts.in_progress, color: 'bg-primary' },
            { label: 'Completed', count: statusCounts.completed, color: 'bg-success' },
          ].map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground font-medium">{item.label}</span>
                <span className="text-muted-foreground">{item.count} of {total}</span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.count / total) * 100}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className={`h-full rounded-full ${item.color}`}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Employee Workload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-6"
      >
        <h2 className="text-lg font-semibold text-foreground mb-4">Employee Workload</h2>
        <div className="space-y-3">
          {mockEmployees.map((emp) => {
            const empTasks = mockTasks.filter(t => t.assigned_to === emp.id);
            const completed = empTasks.filter(t => t.status === 'completed').length;
            return (
              <div key={emp.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                    {emp.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">{emp.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-foreground">{empTasks.length} tasks</p>
                  <p className="text-xs text-muted-foreground">{completed} completed</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
