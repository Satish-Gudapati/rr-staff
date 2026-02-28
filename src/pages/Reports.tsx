import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const Reports = () => {
  const { user } = useAuth();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'employee').eq('owner_id', user?.id || '');
      return data || [];
    },
    enabled: !!user,
  });

  const active = employees.filter((e: any) => e.is_active).length;
  const inactive = employees.filter((e: any) => !e.is_active).length;
  const total = employees.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">Workforce analytics overview</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <BarChart3 size={18} /> Workforce Distribution
        </h2>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data yet. Add employees to see reports.</p>
        ) : (
          <div className="space-y-4">
            {[
              { label: 'Active', count: active, color: 'bg-success' },
              { label: 'Inactive', count: inactive, color: 'bg-muted-foreground' },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{item.count} of {total}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${total > 0 ? (item.count / total) * 100 : 0}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }} className={`h-full rounded-full ${item.color}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Reports;
