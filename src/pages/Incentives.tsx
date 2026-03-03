import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IndianRupee, Plus, Gift, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Incentive } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import MetricCard from '@/components/shared/MetricCard';

const Incentives = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const isOwner = user?.role === 'owner';

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-incentive'],
    queryFn: async () => {
      const ownerId = isOwner ? user!.id : user!.owner_id;
      const { data } = await supabase.from('profiles').select('id, full_name, email').eq('owner_id', ownerId || '').eq('is_active', true);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: incentives = [], isLoading } = useQuery({
    queryKey: ['incentives'],
    queryFn: async () => {
      const { data, error } = await supabase.from('incentives').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const empIds = [...new Set((data || []).map(i => i.employee_id))];
      if (empIds.length === 0) return (data || []) as Incentive[];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', empIds);
      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
      return (data || []).map(i => ({ ...i, employee_profile: profileMap[i.employee_id] })) as Incentive[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const channel = supabase.channel('incentives-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incentives' }, () => {
        queryClient.invalidateQueries({ queryKey: ['incentives'] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const [form, setForm] = useState({ employee_id: '', amount: '', reason: '', incentive_date: format(new Date(), 'yyyy-MM-dd') });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('incentives').insert({
        owner_id: user!.id,
        employee_id: form.employee_id,
        amount: parseFloat(form.amount) || 0,
        reason: form.reason.trim() || null,
        incentive_date: form.incentive_date,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incentives'] });
      setShowCreate(false);
      setForm({ employee_id: '', amount: '', reason: '', incentive_date: format(new Date(), 'yyyy-MM-dd') });
      toast.success('Incentive added successfully');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalPaid = incentives.reduce((s, i) => s + Number(i.amount), 0);
  const fmt = (v: number) => `₹${v.toLocaleString('en-IN')}`;

  // Employee-wise summary
  const empSummary: Record<string, { name: string; total: number; count: number }> = {};
  incentives.forEach(i => {
    if (!empSummary[i.employee_id]) empSummary[i.employee_id] = { name: i.employee_profile?.full_name || 'Unknown', total: 0, count: 0 };
    empSummary[i.employee_id].total += Number(i.amount);
    empSummary[i.employee_id].count++;
  });

  const isEmployee = !isOwner;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Incentives</h1>
          <p className="text-muted-foreground mt-1">{isOwner ? 'Manage employee incentives' : 'Your incentive history'}</p>
        </div>
        {isOwner && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-md">
            <Plus size={18} /> Add Incentive
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <MetricCard title="Total Incentives Paid" value={fmt(totalPaid)} icon={<IndianRupee size={22} />} gradient="warning" index={0} />
        <MetricCard title="Total Entries" value={String(incentives.length)} icon={<Gift size={22} />} gradient="primary" index={1} />
      </div>

      {/* Employee-wise Summary (owner only) */}
      {isOwner && Object.keys(empSummary).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Employee-wise Summary</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Employee</th>
                  <th className="pb-2 font-medium text-center">Entries</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(empSummary).sort((a, b) => b[1].total - a[1].total).map(([id, s]) => (
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

      {/* Incentive History */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-lg font-semibold text-foreground mb-3">History</h2>
        {isLoading ? (
          <div className="glass-card p-12 text-center"><p className="text-muted-foreground">Loading...</p></div>
        ) : incentives.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Gift size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No incentives recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {incentives.map((inc, i) => (
                <motion.div key={inc.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="glass-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center text-warning shrink-0">
                        <Gift size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-1"><User size={13} /> {inc.employee_profile?.full_name || 'Unknown'}</p>
                        {inc.reason && <p className="text-xs text-muted-foreground mt-0.5">{inc.reason}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(inc.incentive_date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-foreground flex items-center gap-0.5 shrink-0"><IndianRupee size={16} />{Number(inc.amount).toLocaleString('en-IN')}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Incentive</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select required value={form.employee_id} onValueChange={v => setForm(f => ({ ...f, employee_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount (₹) *</Label><Input required type="number" min="1" step="1" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" /></div>
            <div><Label>Reason</Label><Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Performance bonus, extra work..." rows={2} /></div>
            <div><Label>Date</Label><Input type="date" value={form.incentive_date} onChange={e => setForm(f => ({ ...f, incentive_date: e.target.value }))} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={createMutation.isPending || !form.employee_id || !form.amount}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {createMutation.isPending ? 'Saving...' : 'Add Incentive'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Incentives;
