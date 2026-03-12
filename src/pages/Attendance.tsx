import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, differenceInMinutes, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  Clock, LogIn, LogOut, Coffee, MapPin, Calendar, User, Loader2, ChevronLeft, ChevronRight, FileText, Download
} from 'lucide-react';
import { Attendance as AttendanceType } from '@/types';

const Attendance = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.role === 'owner';
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Get owner's plan to check if location is required
  const ownerId = isOwner ? user?.id : user?.owner_id;
  const { data: ownerPlan } = useQuery({
    queryKey: ['owner-plan', ownerId],
    queryFn: async () => {
      const { data } = await supabase
        .from('owner_plans')
        .select('*')
        .eq('owner_id', ownerId!)
        .single();
      return data;
    },
    enabled: !!ownerId,
  });

  const locationRequired = ownerPlan?.location_attendance ?? false;

  // Get today's attendance record
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: todayAttendance, isLoading: loadingToday } = useQuery({
    queryKey: ['attendance-today', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', user?.id)
        .eq('date', today)
        .single();
      return data as AttendanceType | null;
    },
    enabled: !!user,
  });

  // Get current active break
  const { data: activeBreak } = useQuery({
    queryKey: ['active-break', todayAttendance?.id],
    queryFn: async () => {
      if (!todayAttendance) return null;
      const { data } = await supabase
        .from('attendance_breaks')
        .select('*')
        .eq('attendance_id', todayAttendance.id)
        .is('break_end', null)
        .single();
      return data;
    },
    enabled: !!todayAttendance,
  });

  // Get attendance history
  const monthStart = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');
  
  const { data: attendanceHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['attendance-history', isOwner ? 'all' : user?.id, monthStart],
    queryFn: async () => {
      let query = supabase
        .from('attendance')
        .select('*, profile:profiles!attendance_profile_id_fkey(id, full_name, email)')
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .order('date', { ascending: false });

      if (!isOwner) {
        query = query.eq('profile_id', user?.id);
      } else {
        query = query.eq('owner_id', user?.id);
      }

      const { data } = await query;
      return (data || []) as (AttendanceType & { profile: { id: string; full_name: string; email: string } })[];
    },
    enabled: !!user,
  });

  // Get location and IP
  const getLocationAndIP = async () => {
    let ip = '';
    let lat: number | undefined;
    let lng: number | undefined;
    let locationName = '';

    try {
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipRes.json();
      ip = ipData.ip;
    } catch (e) {
      console.log('Could not get IP');
    }

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        
        // Reverse geocode
        try {
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const geoData = await geoRes.json();
          locationName = geoData.display_name?.split(',').slice(0, 3).join(', ') || '';
        } catch (e) {
          console.log('Could not get location name');
        }
      } catch (e) {
        console.log('Location permission denied');
      }
    }

    return { ip, lat, lng, locationName };
  };

  // Check In mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      const { ip, lat, lng, locationName } = await getLocationAndIP();

      if (lat === undefined || lng === undefined) {
        throw new Error('Location access is required to check in. Please enable location permissions and try again.');
      }
      
      // Find owner_id for this employee
      let ownerId = user?.id;
      if (user?.role === 'employee' && user?.owner_id) {
        ownerId = user.owner_id;
      }

      const { data, error } = await supabase.from('attendance').insert({
        profile_id: user?.id,
        owner_id: ownerId,
        date: today,
        check_in: new Date().toISOString(),
        status: 'checked_in',
        ip_address: ip,
        location_lat: lat,
        location_lng: lng,
        location_name: locationName,
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Checked in successfully!');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Check Out mutation
  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!todayAttendance) return;

      const checkOutTime = new Date();
      const checkInTime = parseISO(todayAttendance.check_in || checkOutTime.toISOString());
      const totalMinutes = differenceInMinutes(checkOutTime, checkInTime);
      const totalHours = Math.max(0, (totalMinutes - (todayAttendance.total_break_minutes || 0)) / 60);

      const { error } = await supabase
        .from('attendance')
        .update({
          check_out: checkOutTime.toISOString(),
          total_hours: Math.round(totalHours * 100) / 100,
          status: 'checked_out',
          notes: notes || todayAttendance.notes,
        })
        .eq('id', todayAttendance.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Checked out successfully!');
      setNotes('');
      setShowNotesModal(false);
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-history'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Start Break mutation
  const startBreakMutation = useMutation({
    mutationFn: async () => {
      if (!todayAttendance) return;

      await supabase.from('attendance_breaks').insert({
        attendance_id: todayAttendance.id,
        break_start: new Date().toISOString(),
      });

      await supabase.from('attendance').update({ status: 'on_break' }).eq('id', todayAttendance.id);
    },
    onSuccess: () => {
      toast.success('Break started');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['active-break'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // End Break mutation
  const endBreakMutation = useMutation({
    mutationFn: async () => {
      if (!todayAttendance || !activeBreak) return;

      const breakEnd = new Date();
      const breakStart = parseISO(activeBreak.break_start);
      const duration = differenceInMinutes(breakEnd, breakStart);

      await supabase.from('attendance_breaks').update({
        break_end: breakEnd.toISOString(),
        duration_minutes: duration,
      }).eq('id', activeBreak.id);

      const newTotalBreak = (todayAttendance.total_break_minutes || 0) + duration;
      await supabase.from('attendance').update({
        status: 'checked_in',
        total_break_minutes: newTotalBreak,
      }).eq('id', todayAttendance.id);
    },
    onSuccess: () => {
      toast.success('Break ended');
      queryClient.invalidateQueries({ queryKey: ['attendance-today'] });
      queryClient.invalidateQueries({ queryKey: ['active-break'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const isCheckedIn = todayAttendance && todayAttendance.status !== 'checked_out';
  const isOnBreak = todayAttendance?.status === 'on_break';
  const isCheckedOut = todayAttendance?.status === 'checked_out';

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    return format(parseISO(dateStr), 'hh:mm a');
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  const exportCSV = () => {
    if (attendanceHistory.length === 0) {
      toast.error('No records to export');
      return;
    }
    const headers = ['Date', 'Employee', 'Email', 'Check In', 'Check Out', 'Total Hours', 'Break (min)', 'Status', 'Location', 'Notes'];
    const rows = attendanceHistory.map((r: any) => [
      r.date,
      r.profile?.full_name || user?.full_name || '',
      r.profile?.email || user?.email || '',
      r.check_in ? format(parseISO(r.check_in), 'hh:mm a') : '',
      r.check_out ? format(parseISO(r.check_out), 'hh:mm a') : '',
      Number(r.total_hours || 0).toFixed(2),
      String(r.total_break_minutes || 0),
      r.status,
      r.location_name || '',
      (r.notes || '').replace(/,/g, ';'),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${format(selectedMonth, 'yyyy-MM')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground mt-1">Track your work hours and breaks</p>
      </motion.div>

      {/* Today's Status Card */}
      {!isOwner && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl metric-gradient flex items-center justify-center text-primary-foreground">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Today — {format(new Date(), 'EEEE, MMM d')}</h2>
              <p className="text-xs text-muted-foreground">
                {isCheckedOut ? 'Day completed' : isOnBreak ? 'Currently on break' : isCheckedIn ? 'Currently working' : 'Not checked in yet'}
              </p>
            </div>
          </div>

          {loadingToday ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
          ) : (
            <>
              {/* Time Info */}
              {todayAttendance && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 rounded-xl bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Check In</p>
                    <p className="text-lg font-semibold text-foreground">{formatTime(todayAttendance.check_in)}</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Check Out</p>
                    <p className="text-lg font-semibold text-foreground">{formatTime(todayAttendance.check_out)}</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-muted">
                    <p className="text-xs text-muted-foreground mb-1">Total Hours</p>
                    <p className="text-lg font-semibold text-foreground">{formatHours(todayAttendance.total_hours || 0)}</p>
                  </div>
                </div>
              )}

              {/* Location Info */}
              {todayAttendance?.location_name && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 p-2 rounded-lg bg-muted/50">
                  <MapPin size={14} />
                  <span>{todayAttendance.location_name}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                {!isCheckedIn && !isCheckedOut && (
                  <button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl metric-gradient text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                    {checkInMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
                    Check In
                  </button>
                )}

                {isCheckedIn && !isCheckedOut && !isOnBreak && (
                  <>
                    <button onClick={() => startBreakMutation.mutate()} disabled={startBreakMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30 font-medium hover:bg-amber-500/20 transition-colors disabled:opacity-50">
                      {startBreakMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Coffee size={18} />}
                      Start Break
                    </button>
                    <button onClick={() => setShowNotesModal(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/30 font-medium hover:bg-destructive/20 transition-colors">
                      <LogOut size={18} />
                      Check Out
                    </button>
                  </>
                )}

                {isOnBreak && (
                  <button onClick={() => endBreakMutation.mutate()} disabled={endBreakMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-success/10 text-success border border-success/30 font-medium hover:bg-success/20 transition-colors disabled:opacity-50">
                    {endBreakMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Coffee size={18} />}
                    End Break
                  </button>
                )}

                {isCheckedOut && (
                  <div className="w-full text-center py-4 rounded-xl bg-success/10 text-success font-medium">
                    ✓ Day completed — {formatHours(todayAttendance?.total_hours || 0)} worked
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* History Section */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Calendar size={18} /> {isOwner ? 'Team Attendance' : 'Your History'}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} title="Export CSV"
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary">
              <Download size={16} />
            </button>
            <button onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
              className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium min-w-[120px] text-center">{format(selectedMonth, 'MMMM yyyy')}</span>
            <button onClick={() => setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
              className="p-2 rounded-lg hover:bg-muted transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {loadingHistory ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
        ) : attendanceHistory.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock size={32} className="mx-auto mb-2 opacity-50" />
            <p>No attendance records for this month</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendanceHistory.map((record) => (
              <div key={record.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl bg-muted">
                <div className="flex items-center gap-3 flex-1">
                  {isOwner && record.profile && (
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                      {record.profile.full_name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isOwner && record.profile && (
                        <span className="font-medium text-foreground">{record.profile.full_name}</span>
                      )}
                      <span className="text-sm text-muted-foreground">{format(parseISO(record.date), 'EEE, MMM d')}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        record.status === 'checked_out' ? 'bg-success/10 text-success' :
                        record.status === 'on_break' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {record.status === 'checked_out' ? 'Completed' : record.status === 'on_break' ? 'On Break' : 'Working'}
                      </span>
                    </div>
                    {record.location_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {record.location_name}
                      </p>
                    )}
                    {record.notes && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <FileText size={12} /> {record.notes}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">In</p>
                    <p className="font-medium text-foreground">{formatTime(record.check_in)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Out</p>
                    <p className="font-medium text-foreground">{formatTime(record.check_out)}</p>
                  </div>
                  <div className="text-center min-w-[60px]">
                    <p className="text-xs text-muted-foreground">Hours</p>
                    <p className="font-semibold text-primary">{formatHours(record.total_hours || 0)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Notes Modal for Checkout */}
      <AnimatePresence>
        {showNotesModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowNotesModal(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 w-full max-w-md">
              <h3 className="font-semibold text-lg text-foreground mb-4">Add Notes (Optional)</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes or remarks for today..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring mb-4"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowNotesModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button onClick={() => checkOutMutation.mutate()} disabled={checkOutMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                  {checkOutMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  Check Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Attendance;
