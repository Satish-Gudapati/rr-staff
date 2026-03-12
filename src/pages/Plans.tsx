import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Crown, Check, Zap, MapPin, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    period: '/month',
    description: 'Get started with basic features',
    features: [
      { text: 'Up to 2 employees', included: true },
      { text: 'Unlimited tasks & sales', included: true },
      { text: 'Basic attendance (no location)', included: true },
      { text: 'Incentive management', included: true },
      { text: 'CSV exports', included: true },
      { text: 'Location-based attendance', included: false },
      { text: 'Unlimited employees', included: false },
    ],
    maxEmployees: 2,
    locationAttendance: false,
    amount: 0,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '₹299',
    period: '/month',
    description: 'Everything enabled for your business',
    features: [
      { text: 'Unlimited employees', included: true },
      { text: 'Unlimited tasks & sales', included: true },
      { text: 'Location-based attendance', included: true },
      { text: 'Incentive management', included: true },
      { text: 'CSV exports', included: true },
      { text: 'Priority support', included: true },
      { text: 'Advanced reports', included: true },
    ],
    maxEmployees: 999,
    locationAttendance: true,
    amount: 299,
  },
];

const Plans = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: currentPlan, isLoading } = useQuery({
    queryKey: ['owner-plan', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('owner_plans')
        .select('*')
        .eq('owner_id', user?.id!)
        .single();
      return data;
    },
    enabled: !!user && user.role === 'owner',
  });

  const upgradeMutation = useMutation({
    mutationFn: async (plan: typeof PLANS[0]) => {
      const { error } = await supabase
        .from('owner_plans')
        .update({
          plan: plan.id,
          max_employees: plan.maxEmployees,
          location_attendance: plan.locationAttendance,
          amount: plan.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('owner_id', user?.id!);
      if (error) throw error;
    },
    onSuccess: (_, plan) => {
      toast.success(`Switched to ${plan.name} plan!`);
      queryClient.invalidateQueries({ queryKey: ['owner-plan'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (user?.role !== 'owner') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Only owners can manage plans.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Plans & Pricing</h1>
        <p className="text-muted-foreground mt-1">Choose the right plan for your business</p>
      </motion.div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {PLANS.map((plan, idx) => {
            const isCurrent = currentPlan?.plan === plan.id;
            const isPremium = plan.id === 'premium';

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`glass-card p-6 relative overflow-hidden ${
                  isPremium ? 'ring-2 ring-primary' : ''
                }`}
              >
                {isPremium && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      <Crown size={12} /> Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {isPremium ? (
                      <Zap size={20} className="text-primary" />
                    ) : (
                      <Users size={20} className="text-muted-foreground" />
                    )}
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      <Check
                        size={16}
                        className={feature.included ? 'text-primary shrink-0' : 'text-muted-foreground/30 shrink-0'}
                      />
                      <span className={feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="w-full py-3 rounded-xl bg-muted text-center text-sm font-medium text-muted-foreground">
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => upgradeMutation.mutate(plan)}
                    disabled={upgradeMutation.isPending}
                    className={`w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
                      isPremium
                        ? 'metric-gradient text-primary-foreground hover:opacity-90'
                        : 'border border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    {upgradeMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                    {isPremium ? 'Upgrade to Premium' : 'Switch to Free'}
                  </button>
                )}

                {isCurrent && (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-primary">
                    <Check size={14} />
                    <span>Active</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Plan Details */}
      {currentPlan && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="font-semibold text-foreground mb-4">Current Plan Details</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-xl bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Plan</p>
              <p className="text-sm font-semibold text-foreground capitalize">{currentPlan.plan}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Max Employees</p>
              <p className="text-sm font-semibold text-foreground">
                {currentPlan.max_employees >= 999 ? 'Unlimited' : currentPlan.max_employees}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Location Attendance</p>
              <p className="text-sm font-semibold text-foreground">
                {currentPlan.location_attendance ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Monthly Cost</p>
              <p className="text-sm font-semibold text-foreground">₹{currentPlan.amount}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Plans;
