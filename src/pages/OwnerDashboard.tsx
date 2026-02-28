import { useAuth } from '@/contexts/AuthContext';
import MetricCard from '@/components/shared/MetricCard';
import { motion } from 'framer-motion';
import { Users, ClipboardList, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: employees = [] } = useQuery({
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

  const activeEmployees = employees.filter((e: any) => e.is_active).length;

  const metrics = [
    {
      title: 'Active Staff',
      value: activeEmployees,
      change: `${employees.length} total employees`,
      changeType: 'neutral' as const,
      icon: <Users size={22} />,
      gradient: 'success' as const,
    },
    {
      title: 'Total Employees',
      value: employees.length,
      icon: <ClipboardList size={22} />,
      gradient: 'primary' as const,
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Welcome back, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-1">Here's your workforce overview.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((m, i) => (
          <MetricCard key={m.title} {...m} index={i} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Manage Employees', action: () => navigate('/employees') },
            { label: 'View Tasks', action: () => navigate('/tasks') },
            { label: 'Reports', action: () => navigate('/reports') },
          ].map((item) => (
            <button key={item.label} onClick={item.action}
              className="p-4 rounded-xl bg-muted hover:bg-accent/10 transition-colors text-sm font-medium text-foreground flex items-center justify-between group">
              {item.label}
              <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>
      </motion.div>

      {/* Recent Employees */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Employees</h2>
          <button onClick={() => navigate('/employees')} className="text-sm text-primary hover:underline">View all</button>
        </div>
        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No employees yet. Add your first employee from the Employees page.</p>
        ) : (
          <div className="space-y-3">
            {employees.slice(0, 5).map((emp: any) => (
              <div key={emp.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                    {emp.full_name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{emp.full_name}</p>
                    <p className="text-xs text-muted-foreground">{emp.email}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  emp.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                }`}>
                  {emp.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default OwnerDashboard;
