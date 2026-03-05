import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Plus, ChevronDown, ChevronRight, IndianRupee, Pencil, Trash2, Search, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Service {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface SubService {
  id: string;
  service_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  created_at: string;
}

const Services = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.role === 'owner';
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showSubDialog, setShowSubDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingSub, setEditingSub] = useState<SubService | null>(null);
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState({ name: '', description: '' });
  const [subForm, setSubForm] = useState({ name: '', description: '', price: '' });

  // Fetch services
  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as Service[];
    },
    enabled: !!user,
  });

  // Fetch sub-services
  const { data: subServices = [] } = useQuery({
    queryKey: ['sub_services', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sub_services')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as SubService[];
    },
    enabled: !!user,
  });

  // Realtime
  useEffect(() => {
    const ch1 = supabase.channel('services-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => queryClient.invalidateQueries({ queryKey: ['services'] }))
      .subscribe();
    const ch2 = supabase.channel('sub-services-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sub_services' }, () => queryClient.invalidateQueries({ queryKey: ['sub_services'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [queryClient]);

  // Service CRUD
  const serviceMutation = useMutation({
    mutationFn: async () => {
      if (editingService) {
        const { error } = await supabase.from('services').update({ name: serviceForm.name.trim(), description: serviceForm.description.trim() || null }).eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('services').insert({ owner_id: user!.id, name: serviceForm.name.trim(), description: serviceForm.description.trim() || null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setShowServiceDialog(false);
      setEditingService(null);
      setServiceForm({ name: '', description: '' });
      toast.success(editingService ? 'Service updated' : 'Service added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); toast.success('Service deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  // Sub-service CRUD
  const subMutation = useMutation({
    mutationFn: async () => {
      if (editingSub) {
        const { error } = await supabase.from('sub_services').update({ name: subForm.name.trim(), description: subForm.description.trim() || null, price: parseFloat(subForm.price) || 0 }).eq('id', editingSub.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sub_services').insert({ service_id: activeServiceId!, owner_id: user!.id, name: subForm.name.trim(), description: subForm.description.trim() || null, price: parseFloat(subForm.price) || 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub_services'] });
      setShowSubDialog(false);
      setEditingSub(null);
      setSubForm({ name: '', description: '', price: '' });
      toast.success(editingSub ? 'Sub-service updated' : 'Sub-service added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSubMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sub_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['sub_services'] }); toast.success('Sub-service deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEditService = (s: Service) => {
    setEditingService(s);
    setServiceForm({ name: s.name, description: s.description || '' });
    setShowServiceDialog(true);
  };

  const openAddSub = (serviceId: string) => {
    setActiveServiceId(serviceId);
    setEditingSub(null);
    setSubForm({ name: '', description: '', price: '' });
    setShowSubDialog(true);
  };

  const openEditSub = (sub: SubService) => {
    setActiveServiceId(sub.service_id);
    setEditingSub(sub);
    setSubForm({ name: sub.name, description: sub.description || '', price: String(sub.price) });
    setShowSubDialog(true);
  };

  const toggleExpand = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = services.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    subServices.some(sub => sub.service_id === s.id && sub.name.toLowerCase().includes(search.toLowerCase()))
  );

  const getSubsForService = (serviceId: string) => subServices.filter(s => s.service_id === serviceId);

  const totalServices = services.length;
  const totalSubs = subServices.length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Services</h1>
          <p className="text-muted-foreground mt-1">
            {isOwner ? 'Manage your services and pricing' : 'View available services and pricing'}
          </p>
        </div>
        {isOwner && (
          <button onClick={() => { setEditingService(null); setServiceForm({ name: '', description: '' }); setShowServiceDialog(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-md">
            <Plus size={18} /> Add Service
          </button>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalServices}</p>
          <p className="text-xs text-muted-foreground mt-1">Services</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalSubs}</p>
          <p className="text-xs text-muted-foreground mt-1">Sub-services</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search services..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Service List */}
      {isLoading ? (
        <div className="glass-card p-12 text-center"><p className="text-muted-foreground">Loading...</p></div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Briefcase size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{services.length === 0 ? (isOwner ? 'No services yet. Add your first service!' : 'No services available.') : 'No services match your search.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((service, i) => {
              const subs = getSubsForService(service.id);
              const isOpen = expanded[service.id];
              return (
                <motion.div key={service.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="glass-card overflow-hidden">
                  <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpand(service.id)}>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Briefcase size={18} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{service.name}</h3>
                      {service.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{service.description}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{subs.length} sub-service{subs.length !== 1 ? 's' : ''}</span>
                    {isOwner && (
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEditService(service)} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={14} /></button>
                        <button onClick={() => { if (confirm('Delete this service and all its sub-services?')) deleteServiceMutation.mutate(service.id); }}
                          className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                      </div>
                    )}
                    {isOpen ? <ChevronDown size={16} className="text-muted-foreground shrink-0" /> : <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                        className="overflow-hidden">
                        <div className="border-t border-border px-4 pb-4 pt-3 space-y-2">
                          {isOwner && (
                            <button onClick={() => openAddSub(service.id)}
                              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors mb-2">
                              <Plus size={14} /> Add Sub-service
                            </button>
                          )}
                          {subs.length === 0 ? (
                            <p className="text-xs text-muted-foreground py-2">No sub-services yet.</p>
                          ) : (
                            subs.map(sub => (
                              <div key={sub.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                <Package size={14} className="text-muted-foreground shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground">{sub.name}</p>
                                  {sub.description && <p className="text-xs text-muted-foreground mt-0.5">{sub.description}</p>}
                                </div>
                                <span className="flex items-center gap-0.5 text-sm font-semibold text-foreground shrink-0">
                                  <IndianRupee size={13} />{Number(sub.price).toLocaleString('en-IN')}
                                </span>
                                {isOwner && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button onClick={() => openEditSub(sub)} className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><Pencil size={12} /></button>
                                    <button onClick={() => { if (confirm('Delete this sub-service?')) deleteSubMutation.mutate(sub.id); }}
                                      className="p-1 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Service Dialog */}
      <Dialog open={showServiceDialog} onOpenChange={setShowServiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingService ? 'Edit Service' : 'Add Service'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); serviceMutation.mutate(); }} className="space-y-4">
            <div><Label>Service Name *</Label><Input required value={serviceForm.name} onChange={e => setServiceForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Printing, Design, Photography" /></div>
            <div><Label>Description</Label><Textarea value={serviceForm.description} onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description..." rows={3} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowServiceDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={serviceMutation.isPending || !serviceForm.name.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {serviceMutation.isPending ? 'Saving...' : editingService ? 'Update' : 'Add Service'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sub-service Dialog */}
      <Dialog open={showSubDialog} onOpenChange={setShowSubDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingSub ? 'Edit Sub-service' : 'Add Sub-service'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); subMutation.mutate(); }} className="space-y-4">
            <div><Label>Sub-service Name *</Label><Input required value={subForm.name} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. A4 Print, Logo Design" /></div>
            <div><Label>Price (₹) *</Label><Input type="number" min="0" step="0.01" required value={subForm.price} onChange={e => setSubForm(f => ({ ...f, price: e.target.value }))} placeholder="0" /></div>
            <div><Label>Description</Label><Textarea value={subForm.description} onChange={e => setSubForm(f => ({ ...f, description: e.target.value }))} placeholder="Details about this sub-service..." rows={3} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowSubDialog(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button type="submit" disabled={subMutation.isPending || !subForm.name.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {subMutation.isPending ? 'Saving...' : editingSub ? 'Update' : 'Add Sub-service'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Services;
