import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import {
  LayoutDashboard, Users, UserSquare2, ShieldCheck,
  QrCode, FileText, LogOut, Menu, X, Fingerprint,
  GraduationCap, ScanLine, Sparkles, ChevronLeft, ChevronRight, BookOpen
} from 'lucide-react';


const roleConfig = {
  admin: {
    label: 'Admin',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    links: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Students', path: '/students', icon: Users },
      { label: 'Faculties', path: '/faculties', icon: UserSquare2 },
      { label: 'RFID Mapping', path: '/rfid', icon: Fingerprint },
      { label: 'Gate Logs', path: '/gate-logs', icon: ShieldCheck },
      { label: 'Sessions', path: '/sessions', icon: GraduationCap },
      { label: 'Courses', path: '/courses', icon: BookOpen },
      { label: 'Attendance', path: '/attendance', icon: UserSquare2 },

      { label: 'Reports', path: '/reports', icon: FileText },
    ],
  },
  faculty: {
    label: 'Faculty',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    links: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'My Sessions', path: '/sessions', icon: GraduationCap },
      { label: 'Reports', path: '/reports', icon: FileText },
    ],
  },
  student: {
    label: 'Student',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    links: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'QR Entry', path: '/qr-entry', icon: QrCode },
    ],
  },
  guard: {
    label: 'Guard',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    links: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Scan QR', path: '/scan-qr', icon: ScanLine },
      { label: 'Gate Logs', path: '/gate-logs', icon: ShieldCheck },
    ],
  },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user?.role || 'student';
  const config = roleConfig[role] || roleConfig.student;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-surface border-r border-surface-border">
      {/* Brand */}
      <div className="px-5 py-6 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                className="whitespace-nowrap"
              >
                <h1 className="text-base font-semibold text-text tracking-tight">CampusPulse</h1>
                <div className={cn("inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium uppercase tracking-widest mt-0.5", config.color)}>
                  {config.label}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {config.links.map((link) => {
          const Icon = link.icon;
          const active = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                active ? "bg-surface-border/50 text-text" : "text-text-muted hover:text-text hover:bg-surface-hover"
              )}
            >
              {active && (
                <motion.div layoutId="nav-indicator" className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
              )}
              <Icon className={cn("w-5 h-5 shrink-0 transition-colors", active ? "text-primary" : "group-hover:text-text")} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="whitespace-nowrap"
                  >
                    {link.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-4 mt-auto">
        <div className={cn("flex items-center gap-3 p-3 rounded-xl bg-surface-hover/50 border border-surface-border/50 mb-3 overflow-hidden", collapsed ? "justify-center" : "")}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary/80 to-purple-500/80 flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {(user?.full_name || 'U')[0].toUpperCase()}
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="min-w-0 flex-1 whitespace-nowrap"
              >
                <p className="text-sm font-medium text-text truncate">{user?.full_name}</p>
                <p className="text-xs text-text-muted truncate">{user?.email}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium text-text-muted transition-all hover:bg-red-500/10 hover:text-red-400",
            collapsed ? "justify-center" : ""
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-surface border border-surface-border text-text shadow-sm"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              className="lg:hidden fixed inset-y-0 left-0 w-72 z-50"
            >
              <NavContent />
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-6 right-4 p-1 rounded-lg text-text-muted hover:bg-surface-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 80 : 260 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
        className="hidden lg:block fixed left-0 top-0 bottom-0 z-40"
      >
        <NavContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-8 w-6 h-6 rounded-full bg-surface border border-surface-border flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-hover shadow-sm transition-colors z-50"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </motion.aside>
    </>
  );
}
