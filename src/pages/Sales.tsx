import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IndianRupee, Plus, Search, Wallet, CreditCard, Smartphone, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sale } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format, startOfDay, startOfMonth } from 'date-fns';
import MetricCard from '@/components/shared/MetricCard';

const paymentModeIcons: Record<string, React.ReactNode> = {
  cash: <Wallet size={14} />,
  upi: <Smartphone size={14} />,
  card: <CreditCard size={14} />,
};

const paymentModeColors: Record<string, string> = {
  cash: 'bg-success/10 text-success',
  upi: 'bg-primary/10 text-primary',
  card: 'bg-warning/10 text-warning',
};

const Sales = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');

  const isOwner = user?.role === 'owner';
  const canAddSales = isOwner || user?.permissions?.some(p => p.name === 'can_add_sales');

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data || []).map(s => s.entered_by))];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      return (data || []).map(s => ({ ...s, entered_by_profile: profileMap[s.entered_by] })) as Sale[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const channel = supabase.channel('sales-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        queryClient.invalidateQueries({ queryKey: ['sales'] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const [form, setForm] = useState({ amount: '', payment_mode: 'cash', description: '', customer_name: '' });

  const createMutation = useMutation({
    mutationFn: async () => {
      const ownerId = isOwner ? user!.id : user!.owner_id!;
      const { error } = await supabase.from('sales').insert({
        owner_id: ownerId,
        entered_by: user!.id,
        amount: parseFloat(form.amount) || 0,
        payment_mode: form.payment_mode,
        description: form.description.trim() || null,
        customer_name: form.customer_name.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      setShowCreate(false);
      setForm({ amount: '', payment_mode: 'cash', description: '', customer_name: '' });
      toast.success('Sale recorded successfully');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const monthStart = startOfMonth(now).toISOString();

  const todaySales = sales.filter(s => s.created_at >= todayStart).reduce((sum, s) => sum + Number(s.amount), 0);
  const monthSales = sales.filter(s => s.created_at >= monthStart).reduce((sum, s) => sum + Number(s.amount), 0);
  const totalSales = sales.reduce((sum, s) => sum + Number(s.amount), 0);

  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

  const filtered = sales.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.customer_name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || s.entered_by_profile?.full_name?.toLowerCase().includes(q);
  });

  const metrics = [
    { title: "Today's Sales", value: fmt(todaySales), icon: <IndianRupee size={22} />, gradient: 'success' as const },
    { title: 'This Month', value: fmt(monthSales), icon: <Calendar size={22} />, gradient: 'primary' as const },
    { title: 'Total Sales', value: fmt(totalSales), icon: <Wallet size={22} />, gradient: 'warning' as const },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Sales</h1>
          <p className="text-muted-foreground mt-1">Track sales entries & revenue</p>
        </div>
        {canAddSales && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-md">
            <Plus size={18} /> New Sale
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m, i) => <MetricCard key={m.title} {...m} index={i} />)}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by customer, description, employee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="glass-card p-12 text-center"><p className="text-muted-foreground">Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <IndianRupee size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{sales.length === 0 ? 'No sales yet. Add your first sale!' : 'No sales match your search.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((sale, i) => (
              <motion.div key={sale.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{sale.customer_name || 'Walk-in Customer'}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${paymentModeColors[sale.payment_mode]}`}>
                        {paymentModeIcons[sale.payment_mode]} {sale.payment_mode.toUpperCase()}
                      </span>
                    </div>
                    {sale.description && <p className="text-xs text-muted-foreground mt-1">{sale.description}</p>}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>By: {sale.entered_by_profile?.full_name || 'Unknown'}</span>
                      <span>{format(new Date(sale.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-foreground flex items-center gap-0.5 justify-end"><IndianRupee size={16} />{Number(sale.amount).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record New Sale</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div><Label>Amount (₹) *</Label><Input required type="number" min="1" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={form.payment_mode} onValueChange={v => setForm(f => ({ ...f, payment_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Customer Name</Label><Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Optional" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Sale details..." rows={2} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={createMutation.isPending || !form.amount}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Saving...' : 'Record Sale'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Sales;
