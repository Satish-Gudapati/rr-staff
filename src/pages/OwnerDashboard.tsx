import { useAuth } from '@/contexts/AuthContext';
import MetricCard from '@/components/shared/MetricCard';
import { motion } from 'framer-motion';
import { Users, ClipboardList, ArrowRight, IndianRupee, TrendingUp, Gift, CheckCircle, Clock, AlertCircle, LogIn, Timer, Coffee, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, startOfMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').eq('role', 'employee').eq('owner_id', user?.id || '');
      return data || [];
    },
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['dashboard-sales'],
    queryFn: async () => {
      const { data } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: incentives = [] } = useQuery({
    queryKey: ['dashboard-incentives'],
    queryFn: async () => {
      const { data } = await supabase.from('incentives').select('*');
      return data || [];
    },
    enabled: !!user,
  });

  const { data: todayAttendance = [] } = useQuery({
    queryKey: ['dashboard-attendance-today'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('attendance').select('*, profile:profiles(full_name)').eq('date', today);
      return data || [];
    },
    enabled: !!user,
  });

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  const todaySales = sales.filter(s => s.created_at >= todayStart).reduce((sum, s) => sum + Number(s.amount), 0);
  const monthSales = sales.filter(s => s.created_at >= monthStart).reduce((sum, s) => sum + Number(s.amount), 0);
  const totalSalesAmount = sales.reduce((sum, s) => sum + Number(s.amount), 0);
  const totalIncentivesPaid = incentives.reduce((sum, i) => sum + Number(i.amount), 0);

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

  const checkedInCount = todayAttendance.filter((a: any) => a.status === 'checked_in' || a.status === 'on_break').length;
  const checkedOutCount = todayAttendance.filter((a: any) => a.status === 'checked_out').length;
  const onBreakCount = todayAttendance.filter((a: any) => a.status === 'on_break').length;
  const totalHoursToday = todayAttendance.reduce((sum: number, a: any) => sum + Number(a.total_hours || 0), 0);

  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

  // Daily sales chart data (last 7 days)
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStart = startOfDay(d).toISOString();
    const nextDay = new Date(d);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayEnd = startOfDay(nextDay).toISOString();
    const dayTotal = sales.filter(s => s.created_at >= dayStart && s.created_at < dayEnd).reduce((sum, s) => sum + Number(s.amount), 0);
    return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), sales: dayTotal };
  });

  const salesMetrics = [
    { title: "Today's Sales", value: fmt(todaySales), icon: <IndianRupee size={22} />, gradient: 'success' as const },
    { title: 'This Month', value: fmt(monthSales), icon: <TrendingUp size={22} />, gradient: 'primary' as const },
    { title: 'Total Sales', value: fmt(totalSalesAmount), icon: <IndianRupee size={22} />, gradient: 'warning' as const },
    { title: 'Incentives Paid', value: fmt(totalIncentivesPaid), icon: <Gift size={22} />, gradient: 'primary' as const },
  ];

  const taskMetrics = [
    { title: 'Pending', value: String(pendingTasks), icon: <AlertCircle size={22} />, gradient: 'warning' as const },
    { title: 'In Progress', value: String(inProgressTasks), icon: <Clock size={22} />, gradient: 'primary' as const },
    { title: 'Completed', value: String(completedTasks), icon: <CheckCircle size={22} />, gradient: 'success' as const },
    { title: 'Staff', value: String(employees.filter((e: any) => e.is_active).length), icon: <Users size={22} />, gradient: 'primary' as const },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-muted-foreground text-sm">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</p>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground mt-0.5">{user?.full_name?.split(' ')[0]} 👋</h1>
      </motion.div>

      {/* Sales Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {salesMetrics.map((m, i) => <MetricCard key={m.title} {...m} index={i} />)}
      </div>

      {/* Sales Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Sales (Last 7 Days)</h2>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, 'Sales']}
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Task Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="text-lg font-semibold text-foreground mb-3">Task Summary</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {taskMetrics.map((m, i) => <MetricCard key={m.title} {...m} index={i} />)}
        </div>
      </motion.div>

      {/* Attendance Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Today's Attendance</h2>
          <button onClick={() => navigate('/attendance')} className="text-sm text-primary hover:underline">View all</button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <MetricCard title="Checked In" value={String(checkedInCount)} icon={<LogIn size={22} />} gradient="success" index={0} />
          <MetricCard title="On Break" value={String(onBreakCount)} icon={<Coffee size={22} />} gradient="warning" index={1} />
          <MetricCard title="Checked Out" value={String(checkedOutCount)} icon={<LogOut size={22} />} gradient="primary" index={2} />
          <MetricCard title="Total Hours" value={totalHoursToday.toFixed(1) + 'h'} icon={<Timer size={22} />} gradient="primary" index={3} />
        </div>
        {todayAttendance.length > 0 && (
          <div className="glass-card p-4">
            <div className="space-y-2">
              {todayAttendance.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
                      {a.profile?.full_name?.split(' ').map((n: string) => n[0]).join('') || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{a.profile?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.check_in ? new Date(a.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '--'}
                        {a.check_out ? ` → ${new Date(a.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ' → Working...'}
                        {' · '}{Number(a.total_hours || 0).toFixed(1)}h
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    a.status === 'checked_in' ? 'bg-success/10 text-success' :
                    a.status === 'on_break' ? 'bg-warning/10 text-warning' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {a.status === 'checked_in' ? 'Working' : a.status === 'on_break' ? 'On Break' : 'Done'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: 'Add Sale', action: () => navigate('/sales') },
            { label: 'New Task', action: () => navigate('/tasks') },
            { label: 'Employees', action: () => navigate('/employees') },
            { label: 'Incentives', action: () => navigate('/incentives') },
            { label: 'Reports', action: () => navigate('/reports') },
            { label: 'Roles', action: () => navigate('/roles') },
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Employees</h2>
          <button onClick={() => navigate('/employees')} className="text-sm text-primary hover:underline">View all</button>
        </div>
        {employees.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No employees yet.</p>
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
