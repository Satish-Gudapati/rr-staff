import { mockEmployees, mockTasks } from '@/data/mock';
import { motion } from 'framer-motion';
import { Users, Mail, Briefcase } from 'lucide-react';

const Employees = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Employees</h1>
        <p className="text-muted-foreground mt-1">Manage your workforce</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockEmployees.map((emp, i) => {
          const taskCount = mockTasks.filter(t => t.assigned_to === emp.id).length;
          return (
            <motion.div
              key={emp.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 flex items-start gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
                {emp.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground">{emp.name}</h3>
                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                  <Briefcase size={13} />
                  {emp.role}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {taskCount} tasks
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success capitalize">
                    {emp.status}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Employees;
