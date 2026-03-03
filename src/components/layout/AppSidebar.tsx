import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Tag,
  BarChart3,
  LogOut,
  ChevronLeft,
  Menu,
  IndianRupee,
  Gift,
} from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const AppSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const isOwner = user.role === 'owner';
  const hasPermission = (perm: string) => isOwner || user.permissions?.some(p => p.name === perm);

  const navItems = [
    ...(hasPermission('can_view_dashboard')
      ? [{ label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: isOwner ? '/owner-dashboard' : '/dashboard' }]
      : []),
    ...(hasPermission('can_add_sales') || hasPermission('can_view_sales') || hasPermission('can_view_own_sales') || isOwner
      ? [{ label: 'Sales', icon: <IndianRupee size={20} />, path: '/sales' }]
      : []),
    ...(hasPermission('can_view_tasks') || hasPermission('can_manage_tasks')
      ? [{ label: 'Tasks', icon: <ClipboardList size={20} />, path: '/tasks' }]
      : []),
    ...(hasPermission('can_manage_employees')
      ? [
          { label: 'Employees', icon: <Users size={20} />, path: '/employees' },
          { label: 'Roles', icon: <Tag size={20} />, path: '/roles' },
        ]
      : []),
    ...(hasPermission('can_view_own_incentives') || hasPermission('can_manage_incentives') || isOwner
      ? [{ label: 'Incentives', icon: <Gift size={20} />, path: '/incentives' }]
      : []),
    ...(hasPermission('can_view_reports')
      ? [{ label: 'Reports', icon: <BarChart3 size={20} />, path: '/reports' }]
      : []),
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-6 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg metric-gradient flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
          RR
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
              className="font-semibold text-foreground whitespace-nowrap overflow-hidden">
              RR Staff
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button key={item.path} onClick={() => handleNav(item.path)}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium',
                isActive ? 'bg-primary text-primary-foreground shadow-md' : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground')}>
              {item.icon}
              <AnimatePresence>
                {!collapsed && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <div className={cn('flex items-center gap-3 px-3 py-2', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold shrink-0">
            {user.full_name.split(' ').map(n => n[0]).join('')}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.full_name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
            </div>
          )}
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setMobileOpen(true)} className="fixed top-4 left-4 z-50 lg:hidden glass-card p-2 rounded-lg">
        <Menu size={20} />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileOpen && (
          <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 z-50 h-screen w-[260px] glass-sidebar bg-sidebar lg:hidden">
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>

      <motion.aside animate={{ width: collapsed ? 72 : 260 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="hidden lg:flex flex-col h-screen sticky top-0 glass-sidebar bg-sidebar shrink-0">
        {sidebarContent}
        <button onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center shadow-sm hover:bg-accent transition-colors">
          <ChevronLeft size={14} className={cn('transition-transform', collapsed && 'rotate-180')} />
        </button>
      </motion.aside>
    </>
  );
};

export default AppSidebar;
