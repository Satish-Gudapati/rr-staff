import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Loader2, UserPlus, LogIn } from 'lucide-react';
import { toast } from 'sonner';

type AuthMode = 'login' | 'register';
type RoleTab = 'owner' | 'employee';

const Login = () => {
  const { login, register, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<RoleTab>('owner');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  if (!isLoading && isAuthenticated && user) {
    navigate(user.role === 'owner' ? '/owner-dashboard' : '/dashboard', { replace: true });
    return null;
  }

  const handleTabSwitch = (role: RoleTab) => {
    setActiveTab(role);
    setError('');
    if (role === 'employee') setAuthMode('login');
  };

  const handleModeSwitch = (mode: AuthMode) => {
    setAuthMode(mode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (authMode === 'register') {
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
      if (!fullName.trim()) { setError('Full name is required.'); return; }
      if (!companyName.trim()) { setError('Company name is required.'); return; }
    }

    setLoading(true);
    try {
      if (authMode === 'register') {
        const result = await register(email, password, fullName, companyName);
        if (!result.success) {
          setError(result.error || 'Registration failed.');
        } else {
          toast.success('Account created! Check your email to confirm.');
        }
      } else {
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error || 'Invalid credentials.');
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isRegister = authMode === 'register';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-dots p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-2xl metric-gradient flex items-center justify-center text-primary-foreground font-bold text-2xl mx-auto mb-4 shadow-lg"
          >
            RR
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">RR Staff Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Sign in to manage your workforce</p>
        </div>

        <div className="glass-card p-8">
          <div className="flex rounded-xl bg-muted p-1 mb-4">
            {(['owner', 'employee'] as RoleTab[]).map((role) => (
              <button
                key={role}
                onClick={() => handleTabSwitch(role)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all capitalize ${
                  activeTab === role ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          {activeTab === 'owner' && (
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => handleModeSwitch('login')}
                className={`flex items-center gap-1.5 text-sm font-medium pb-1 border-b-2 transition-colors ${
                  !isRegister ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <LogIn size={14} /> Login
              </button>
              <button
                onClick={() => handleModeSwitch('register')}
                className={`flex items-center gap-1.5 text-sm font-medium pb-1 border-b-2 transition-colors ${
                  isRegister ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <UserPlus size={14} /> Register
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.form
              key={`${activeTab}-${authMode}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {isRegister && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rajesh Rathore" required
                      className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Company Name</label>
                    <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="RR Enterprises" required
                      className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required
                  className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow pr-10" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {isRegister && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required
                    className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow" />
                </div>
              )}

              {error && (
                <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-destructive">
                  {error}
                </motion.p>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-xl metric-gradient text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? (isRegister ? 'Creating account...' : 'Signing in...') : (isRegister ? 'Create Owner Account' : 'Sign In')}
              </button>
            </motion.form>
          </AnimatePresence>

          <p className="text-xs text-muted-foreground text-center mt-6">
            {activeTab === 'owner'
              ? isRegister ? 'Already have an account? Switch to Login above.' : 'New owner? Switch to Register above.'
              : 'Employees are registered by their owner.'}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
