import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { BarChart3, DollarSign, TrendingUp, Users, ClipboardList, IndianRupee, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MetricCard from '@/components/shared/MetricCard';
import StatusBadge from '@/components/shared/StatusBadge';

const Reports = () => {
  const { user } = useAuth();

  const { data: employees = [] } = useQuery({
    queryKey: ['report-employees'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'employee').eq('owner_id', user?.id || '');
      return data || [];
    },
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['report-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch profile names for created_by / assigned_to
  const { data: profileMap = {} } = useQuery({
    queryKey: ['report-profiles', tasks.length],
    queryFn: async () => {
      const ids = [...new Set(tasks.flatMap(t => [t.assigned_to, t.created_by]))];
      if (ids.length === 0) return {};
      const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      return Object.fromEntries((data || []).map(p => [p.id, p]));
    },
    enabled: tasks.length > 0,
  });

  const total = employees.length;
  const active = employees.filter((e: any) => e.is_active).length;
  const inactive = employees.filter((e: any) => !e.is_active).length;
  const totalSalaries = employees.reduce((sum: number, e: any) => sum + (Number(e.salary) || 0), 0);
  const totalIncentives = employees.reduce((sum: number, e: any) => sum + (Number(e.incentives) || 0), 0);
  const totalPayroll = totalSalaries + totalIncentives;
  const avgSalary = total > 0 ? totalSalaries / total : 0;
  const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  // Task stats
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
  };

  const totalRevenue = tasks.reduce((s, t) => s + (Number(t.total_amount) || 0), 0);
  const paidRevenue = tasks.filter(t => t.payment_status === 'paid').reduce((s, t) => s + (Number(t.total_amount) || 0), 0);
  const unpaidRevenue = tasks.filter(t => t.payment_status === 'unpaid').reduce((s, t) => s + (Number(t.total_amount) || 0), 0);

  // Per-employee work done
  const employeeWorkMap: Record<string, { name: string; assigned: number; completed: number; in_progress: number; pending: number; revenue: number }> = {};
  tasks.forEach(t => {
    const id = t.assigned_to;
    if (!employeeWorkMap[id]) {
      employeeWorkMap[id] = { name: (profileMap as any)[id]?.full_name || 'Unknown', assigned: 0, completed: 0, in_progress: 0, pending: 0, revenue: 0 };
    }
    employeeWorkMap[id].assigned++;
    if (t.status === 'completed') { employeeWorkMap[id].completed++; employeeWorkMap[id].revenue += Number(t.total_amount) || 0; }
    if (t.status === 'in_progress') employeeWorkMap[id].in_progress++;
    if (t.status === 'pending') employeeWorkMap[id].pending++;
  });
  const employeeWork = Object.entries(employeeWorkMap).sort((a, b) => b[1].completed - a[1].completed);

  // Front office assignments (tasks created by each person)
  const creatorMap: Record<string, { name: string; total: number; completed: number; pending: number; in_progress: number; revenue: number }> = {};
  tasks.forEach(t => {
    const id = t.created_by;
    if (!creatorMap[id]) {
      creatorMap[id] = { name: (profileMap as any)[id]?.full_name || 'Unknown', total: 0, completed: 0, pending: 0, in_progress: 0, revenue: 0 };
    }
    creatorMap[id].total++;
    if (t.status === 'completed') { creatorMap[id].completed++; creatorMap[id].revenue += Number(t.total_amount) || 0; }
    if (t.status === 'pending') creatorMap[id].pending++;
    if (t.status === 'in_progress') creatorMap[id].in_progress++;
  });
  const creatorWork = Object.entries(creatorMap).sort((a, b) => b[1].total - a[1].total);

  const payrollMetrics = [
    { title: 'Total Payroll', value: fmt(totalPayroll), icon: <DollarSign size={22} />, gradient: 'primary' as const, change: `${total} employees`, changeType: 'neutral' as const },
    { title: 'Total Salaries', value: fmt(totalSalaries), icon: <Users size={22} />, gradient: 'success' as const },
    { title: 'Total Incentives', value: fmt(totalIncentives), icon: <TrendingUp size={22} />, gradient: 'warning' as const },
    { title: 'Avg Salary', value: fmt(avgSalary), icon: <BarChart3 size={22} />, gradient: 'primary' as const },
  ];

  const taskMetrics = [
    { title: 'Total Tasks', value: String(taskStats.total), icon: <ClipboardList size={22} />, gradient: 'primary' as const },
    { title: 'Completed', value: String(taskStats.completed), icon: <CheckCircle size={22} />, gradient: 'success' as const },
    { title: 'In Progress', value: String(taskStats.in_progress), icon: <Clock size={22} />, gradient: 'warning' as const },
    { title: 'Pending', value: String(taskStats.pending), icon: <AlertCircle size={22} />, gradient: 'primary' as const },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">Workforce, payroll & work analytics</p>
      </motion.div>

      {/* Work Status Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><ClipboardList size={18} /> Work Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {taskMetrics.map((m, i) => <MetricCard key={m.title} {...m} index={i} />)}
        </div>
      </motion.div>

      {/* Work Status Distribution */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Work Status Distribution</h2>
        {taskStats.total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No tasks yet.</p>
        ) : (
          <div className="space-y-3">
            {[
              { label: 'Completed', count: taskStats.completed, color: 'bg-success' },
              { label: 'In Progress', count: taskStats.in_progress, color: 'bg-primary' },
              { label: 'Pending', count: taskStats.pending, color: 'bg-warning' },
              { label: 'Cancelled', count: taskStats.cancelled, color: 'bg-muted-foreground' },
            ].map(item => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">{item.label}</span>
                  <span className="text-muted-foreground">{item.count} of {taskStats.total} ({taskStats.total > 0 ? Math.round((item.count / taskStats.total) * 100) : 0}%)</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${taskStats.total > 0 ? (item.count / taskStats.total) * 100 : 0}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }} className={`h-full rounded-full ${item.color}`} />
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Revenue summary */}
        {taskStats.total > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-lg font-bold text-foreground flex items-center justify-center gap-0.5"><IndianRupee size={15} />{totalRevenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Collected</p>
              <p className="text-lg font-bold text-success flex items-center justify-center gap-0.5"><IndianRupee size={15} />{paidRevenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold text-destructive flex items-center justify-center gap-0.5"><IndianRupee size={15} />{unpaidRevenue.toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Employee Work Tracking */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Users size={18} /> Employee Work Tracking</h2>
        {employeeWork.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No work data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium text-center">Assigned</th>
                  <th className="pb-2 font-medium text-center">Completed</th>
                  <th className="pb-2 font-medium text-center">In Progress</th>
                  <th className="pb-2 font-medium text-center">Pending</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {employeeWork.map(([id, w]) => (
                  <tr key={id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{w.name}</td>
                    <td className="py-2.5 text-center text-foreground">{w.assigned}</td>
                    <td className="py-2.5 text-center"><span className="text-success font-semibold">{w.completed}</span></td>
                    <td className="py-2.5 text-center"><span className="text-primary font-semibold">{w.in_progress}</span></td>
                    <td className="py-2.5 text-center"><span className="text-warning font-semibold">{w.pending}</span></td>
                    <td className="py-2.5 text-right font-semibold text-foreground">{fmt(w.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Front Office Assignments */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><ClipboardList size={18} /> Front Office — Tasks Assigned</h2>
        {creatorWork.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No assignments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Assigned By</th>
                  <th className="pb-2 font-medium text-center">Total Assigned</th>
                  <th className="pb-2 font-medium text-center">Completed</th>
                  <th className="pb-2 font-medium text-center">In Progress</th>
                  <th className="pb-2 font-medium text-center">Pending</th>
                  <th className="pb-2 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {creatorWork.map(([id, w]) => (
                  <tr key={id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{w.name}</td>
                    <td className="py-2.5 text-center text-foreground font-semibold">{w.total}</td>
                    <td className="py-2.5 text-center"><span className="text-success font-semibold">{w.completed}</span></td>
                    <td className="py-2.5 text-center"><span className="text-primary font-semibold">{w.in_progress}</span></td>
                    <td className="py-2.5 text-center"><span className="text-warning font-semibold">{w.pending}</span></td>
                    <td className="py-2.5 text-right font-semibold text-foreground">{fmt(w.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Payroll Summary */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><DollarSign size={18} /> Payroll Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {payrollMetrics.map((m, i) => <MetricCard key={m.title} {...m} index={i} />)}
        </div>
      </motion.div>

      {/* Employee Payroll Breakdown */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
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
                    <td className="py-2.5 text-right text-foreground">{fmt(Number(emp.salary) || 0)}</td>
                    <td className="py-2.5 text-right text-foreground">{fmt(Number(emp.incentives) || 0)}</td>
                    <td className="py-2.5 text-right font-semibold text-foreground">{fmt((Number(emp.salary) || 0) + (Number(emp.incentives) || 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Workforce Distribution */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2"><BarChart3 size={18} /> Workforce Distribution</h2>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>
        ) : (
          <div className="space-y-4">
            {[
              { label: 'Active', count: active, color: 'bg-success' },
              { label: 'Inactive', count: inactive, color: 'bg-muted-foreground' },
            ].map(item => (
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
