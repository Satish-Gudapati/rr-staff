import { useAuth } from '@/contexts/AuthContext';
import MetricCard from '@/components/shared/MetricCard';
import { motion } from 'framer-motion';
import { ClipboardList, CheckCircle2, TrendingUp } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useAuth();

  const permissionCount = user?.permissions?.length || 0;

  const metrics = [
    { title: 'My Permissions', value: permissionCount, icon: <ClipboardList size={22} />, gradient: 'primary' as const },
    { title: 'Status', value: user?.is_active ? 'Active' : 'Inactive', icon: <CheckCircle2 size={22} />, gradient: 'success' as const },
    { title: 'Role', value: 'Employee', icon: <TrendingUp size={22} />, gradient: 'warning' as const },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Hi, {user?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-muted-foreground mt-1">Here's your personal workspace.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m, i) => <MetricCard key={m.title} {...m} index={i} />)}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
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
          <p className="text-sm text-muted-foreground text-center py-4">No permissions assigned yet. Contact your owner.</p>
        )}
      </motion.div>
    </div>
  );
};

export default EmployeeDashboard;
