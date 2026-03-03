import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { BarChart3, DollarSign, TrendingUp, Users, ClipboardList, IndianRupee, CheckCircle, Clock, AlertCircle, Download, Gift } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MetricCard from '@/components/shared/MetricCard';
import { startOfDay, startOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

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

  const { data: sales = [] } = useQuery({
    queryKey: ['report-sales'],
    queryFn: async () => {
      const { data } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: incentives = [] } = useQuery({
    queryKey: ['report-incentives'],
    queryFn: async () => {
      const { data } = await supabase.from('incentives').select('*');
      return data || [];
    },
    enabled: !!user,
  });

  const { data: profileMap = {} } = useQuery({
    queryKey: ['report-profiles', tasks.length, sales.length],
    queryFn: async () => {
      const ids = [...new Set([
        ...tasks.flatMap(t => [t.assigned_to, t.created_by]),
        ...sales.map(s => s.entered_by),
      ])];
      if (ids.length === 0) return {};
      const { data } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      return Object.fromEntries((data || []).map(p => [p.id, p]));
    },
    enabled: tasks.length > 0 || sales.length > 0,
  });

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  const todaySales = sales.filter(s => s.created_at >= todayStart).reduce((s, x) => s + Number(x.amount), 0);
  const monthSales = sales.filter(s => s.created_at >= monthStart).reduce((s, x) => s + Number(x.amount), 0);
  const totalSalesAmt = sales.reduce((s, x) => s + Number(x.amount), 0);
  const totalIncentivesPaid = incentives.reduce((s, i) => s + Number(i.amount), 0);

  const total = employees.length;
  const totalSalaries = employees.reduce((sum: number, e: any) => sum + (Number(e.salary) || 0), 0);
  const fmt = (v: number) => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    cancelled: tasks.filter(t => t.status === 'cancelled').length,
  };

  // Employee-wise sales
  const empSalesMap: Record<string, { name: string; total: number; count: number }> = {};
  sales.forEach(s => {
    const id = s.entered_by;
    if (!empSalesMap[id]) empSalesMap[id] = { name: (profileMap as any)[id]?.full_name || 'Unknown', total: 0, count: 0 };
    empSalesMap[id].total += Number(s.amount);
    empSalesMap[id].count++;
  });

  // Employee work tracking
  const employeeWorkMap: Record<string, { name: string; assigned: number; completed: number; in_progress: number; pending: number; revenue: number }> = {};
  tasks.forEach(t => {
    const id = t.assigned_to;
    if (!employeeWorkMap[id]) employeeWorkMap[id] = { name: (profileMap as any)[id]?.full_name || 'Unknown', assigned: 0, completed: 0, in_progress: 0, pending: 0, revenue: 0 };
    employeeWorkMap[id].assigned++;
    if (t.status === 'completed') { employeeWorkMap[id].completed++; employeeWorkMap[id].revenue += Number(t.total_amount) || 0; }
    if (t.status === 'in_progress') employeeWorkMap[id].in_progress++;
    if (t.status === 'pending') employeeWorkMap[id].pending++;
  });

  // Front office assignments
  const creatorMap: Record<string, { name: string; total: number; completed: number; pending: number; in_progress: number }> = {};
  tasks.forEach(t => {
    const id = t.created_by;
    if (!creatorMap[id]) creatorMap[id] = { name: (profileMap as any)[id]?.full_name || 'Unknown', total: 0, completed: 0, pending: 0, in_progress: 0 };
    creatorMap[id].total++;
    if (t.status === 'completed') creatorMap[id].completed++;
    if (t.status === 'pending') creatorMap[id].pending++;
    if (t.status === 'in_progress') creatorMap[id].in_progress++;
  });

  // Daily sales chart
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const dayStart = startOfDay(d).toISOString();
    const nextDay = new Date(d); nextDay.setDate(nextDay.getDate() + 1);
    const dayEnd = startOfDay(nextDay).toISOString();
    const dayTotal = sales.filter(s => s.created_at >= dayStart && s.created_at < dayEnd).reduce((sum, s) => sum + Number(s.amount), 0);
    return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), sales: dayTotal };
  });

  // CSV Export
  const exportCSV = (type: 'sales' | 'tasks') => {
    let csv = '';
    if (type === 'sales') {
      csv = 'Date,Customer,Amount,Payment Mode,Entered By\n';
      sales.forEach(s => {
        csv += `${new Date(s.created_at).toLocaleDateString()},${s.customer_name || 'Walk-in'},${s.amount},${s.payment_mode},${(profileMap as any)[s.entered_by]?.full_name || ''}\n`;
      });
    } else {
      csv = 'Title,Service,Assigned To,Status,Priority,Amount,Payment Status\n';
      tasks.forEach(t => {
        csv += `${t.title},${t.service_type},${(profileMap as any)[t.assigned_to]?.full_name || ''},${t.status},${t.priority},${t.total_amount || 0},${t.payment_status}\n`;
      });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${type}-report.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${type} report downloaded`);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Sales, workforce & work analytics</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportCSV('sales')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-accent/10 transition-colors">
            <Download size={14} /> Sales CSV
          </button>
          <button onClick={() => exportCSV('tasks')} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-accent/10 transition-colors">
            <Download size={14} /> Tasks CSV
          </button>
        </div>
      </motion.div>

      {/* Sales KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Today's Sales" value={fmt(todaySales)} icon={<IndianRupee size={22} />} gradient="success" index={0} />
        <MetricCard title="This Month" value={fmt(monthSales)} icon={<TrendingUp size={22} />} gradient="primary" index={1} />
        <MetricCard title="Total Sales" value={fmt(totalSalesAmt)} icon={<DollarSign size={22} />} gradient="warning" index={2} />
        <MetricCard title="Incentives Paid" value={fmt(totalIncentivesPaid)} icon={<Gift size={22} />} gradient="primary" index={3} />
      </div>

      {/* Sales Chart */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Daily Sales (Last 7 Days)</h2>
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Sales']}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Employee-wise Sales */}
      {Object.keys(empSalesMap).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><IndianRupee size={18} /> Employee-wise Sales</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium text-center">Entries</th>
                  <th className="pb-2 font-medium text-right">Total Sales</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(empSalesMap).sort((a, b) => b[1].total - a[1].total).map(([id, s]) => (
                  <tr key={id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{s.name}</td>
                    <td className="py-2.5 text-center text-foreground">{s.count}</td>
                    <td className="py-2.5 text-right font-semibold text-foreground">{fmt(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Work Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><ClipboardList size={18} /> Task Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricCard title="Total Tasks" value={String(taskStats.total)} icon={<ClipboardList size={22} />} gradient="primary" index={0} />
          <MetricCard title="Completed" value={String(taskStats.completed)} icon={<CheckCircle size={22} />} gradient="success" index={1} />
          <MetricCard title="In Progress" value={String(taskStats.in_progress)} icon={<Clock size={22} />} gradient="warning" index={2} />
          <MetricCard title="Pending" value={String(taskStats.pending)} icon={<AlertCircle size={22} />} gradient="primary" index={3} />
        </div>
      </motion.div>

      {/* Employee Work Tracking */}
      {Object.keys(employeeWorkMap).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><Users size={18} /> Employee Work Tracking</h2>
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
                {Object.entries(employeeWorkMap).sort((a, b) => b[1].completed - a[1].completed).map(([id, w]) => (
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
        </motion.div>
      )}

      {/* Front Office Assignments */}
      {Object.keys(creatorMap).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2"><ClipboardList size={18} /> Tasks Assigned By</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Assigned By</th>
                  <th className="pb-2 font-medium text-center">Total</th>
                  <th className="pb-2 font-medium text-center">Completed</th>
                  <th className="pb-2 font-medium text-center">In Progress</th>
                  <th className="pb-2 font-medium text-center">Pending</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(creatorMap).sort((a, b) => b[1].total - a[1].total).map(([id, w]) => (
                  <tr key={id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{w.name}</td>
                    <td className="py-2.5 text-center font-semibold text-foreground">{w.total}</td>
                    <td className="py-2.5 text-center"><span className="text-success font-semibold">{w.completed}</span></td>
                    <td className="py-2.5 text-center"><span className="text-primary font-semibold">{w.in_progress}</span></td>
                    <td className="py-2.5 text-center"><span className="text-warning font-semibold">{w.pending}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Payroll */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><DollarSign size={18} /> Payroll Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard title="Total Salaries" value={fmt(totalSalaries)} icon={<Users size={22} />} gradient="success" index={0} />
          <MetricCard title="Incentives Paid" value={fmt(totalIncentivesPaid)} icon={<Gift size={22} />} gradient="warning" index={1} />
          <MetricCard title="Total Payroll" value={fmt(totalSalaries + totalIncentivesPaid)} icon={<DollarSign size={22} />} gradient="primary" index={2} />
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
