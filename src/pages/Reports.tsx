import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { BarChart3, DollarSign, TrendingUp, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MetricCard from '@/components/shared/MetricCard';

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

  const totalSalaries = employees.reduce((sum: number, e: any) => sum + (Number(e.salary) || 0), 0);
  const totalIncentives = employees.reduce((sum: number, e: any) => sum + (Number(e.incentives) || 0), 0);
  const totalPayroll = totalSalaries + totalIncentives;
  const avgSalary = total > 0 ? totalSalaries / total : 0;

  const formatCurrency = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  const payrollMetrics = [
    { title: 'Total Payroll', value: formatCurrency(totalPayroll), icon: <DollarSign size={22} />, gradient: 'primary' as const, change: `${total} employees`, changeType: 'neutral' as const },
    { title: 'Total Salaries', value: formatCurrency(totalSalaries), icon: <Users size={22} />, gradient: 'success' as const },
    { title: 'Total Incentives', value: formatCurrency(totalIncentives), icon: <TrendingUp size={22} />, gradient: 'warning' as const },
    { title: 'Avg Salary', value: formatCurrency(avgSalary), icon: <BarChart3 size={22} />, gradient: 'primary' as const },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">Workforce & payroll analytics</p>
      </motion.div>

      {/* Payroll Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {payrollMetrics.map((m, i) => (
          <MetricCard key={m.title} {...m} index={i} />
        ))}
      </div>

      {/* Per-employee breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Employee Payroll Breakdown</h2>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No employees yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium text-right">Salary</th>
                  <th className="pb-2 font-medium text-right">Incentives</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp: any) => (
                  <tr key={emp.id} className="border-b border-border last:border-0">
                    <td className="py-2.5">
                      <p className="font-medium text-foreground">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.email}</p>
                    </td>
                    <td className="py-2.5 text-right text-foreground">{formatCurrency(Number(emp.salary) || 0)}</td>
                    <td className="py-2.5 text-right text-foreground">{formatCurrency(Number(emp.incentives) || 0)}</td>
                    <td className="py-2.5 text-right font-semibold text-foreground">{formatCurrency((Number(emp.salary) || 0) + (Number(emp.incentives) || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Workforce Distribution */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <BarChart3 size={18} /> Workforce Distribution
        </h2>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>
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
