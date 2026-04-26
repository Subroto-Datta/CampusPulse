import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import {
  Users, UserCheck, Clock, AlertTriangle, GraduationCap,
  ShieldCheck, QrCode, ScanLine, ArrowRight
} from 'lucide-react';
import { cn } from '../utils/cn';

const STAT_ICONS = {
  today_entries: ShieldCheck,
  today_attendance_pct: UserCheck,
  low_attendance_students: AlertTriangle,
  bunk_alerts: Users,
  late_entries: Clock,
};

const STAT_LABELS = {
  today_entries: "Today's Gate Entries",
  today_attendance_pct: "Today's Attendance %",
  low_attendance_students: 'Low Attendance Students',
  bunk_alerts: 'Bunk Alerts',
  late_entries: 'Late Arrivals',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      if (user?.role === 'admin') {
        const { data } = await api.get('/admin/dashboard');
        setStats(data.data);
      }
      if (user?.role === 'faculty') {
        const { data } = await api.get('/faculty/today-sessions');
        setSessions(data.data || []);
      }
      if (user?.role === 'student' && user?.student_id) {
        const { data } = await api.get(`/students/${user.student_id}`);
        setStats(data.data.attendance_summary);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading && !stats && !sessions.length) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-semibold text-text tracking-tight">
          Welcome back, <span className="text-primary">{user?.full_name?.split(' ')[0]}</span>
        </h1>
        <p className="text-text-muted mt-1.5 text-sm">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </motion.div>

      {/* Admin Stats */}
      {user?.role === 'admin' && stats && (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Object.entries(stats).map(([key, value]) => {
            const Icon = STAT_ICONS[key] || Users;
            return (
              <motion.div key={key} variants={item} whileHover={{ y: -4 }} className="glass-panel p-6 group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center border border-surface-border group-hover:border-primary/50 group-hover:text-primary transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-text mb-1 tracking-tight">
                    {key === 'today_attendance_pct' ? `${value}%` : value}
                  </h3>
                  <p className="text-sm font-medium text-text-muted">{STAT_LABELS[key] || key}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Faculty: Today's Sessions */}
      {user?.role === 'faculty' && (
        <motion.div variants={container} initial="hidden" animate="show">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
            <h2 className="text-xl font-semibold text-text">Today&apos;s Lectures</h2>
            <div className="flex items-center gap-4">
              <Link to="/sessions" className="text-sm font-medium text-primary hover:text-primary-hover transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
          
          {sessions.length === 0 ? (
            <motion.div variants={item} className="glass-panel p-12 text-center">
              <GraduationCap className="w-12 h-12 text-surface-border mx-auto mb-4" />
              <p className="text-text-muted">No lectures scheduled for today.</p>
            </motion.div>
          ) : (
            <div className="grid gap-4">
              {sessions.map((s) => (
                <motion.div key={s.id} variants={item} whileHover={{ scale: 1.01 }} className="glass-panel p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border-l-4 border-l-primary">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-text font-bold text-sm">
                      {s.course_code?.slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-text text-base">{s.course_name}</h3>
                      <p className="text-sm text-text-muted mt-0.5">
                        {s.course_code} • Div {s.division} • {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <div>
                    {s.is_completed ? (
                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Completed
                      </span>
                    ) : (
                      <Link to={`/sessions/${s.id}/attendance`} className="btn-primary text-sm py-2 px-5">
                        Take Attendance
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Student: Dashboard */}
      {user?.role === 'student' && (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <motion.div variants={item} className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500"><UserCheck className="w-5 h-5" /></div>
                <h3 className="text-sm font-medium text-text-muted">Attendance %</h3>
              </div>
              <p className="text-3xl font-bold text-text">{stats?.attendance_pct || 0}%</p>
            </motion.div>
            <motion.div variants={item} className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500"><GraduationCap className="w-5 h-5" /></div>
                <h3 className="text-sm font-medium text-text-muted">Total Sessions</h3>
              </div>
              <p className="text-3xl font-bold text-text">{stats?.total_sessions || 0}</p>
            </motion.div>
            <motion.div variants={item} className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500"><Clock className="w-5 h-5" /></div>
                <h3 className="text-sm font-medium text-text-muted">Late Arrivals</h3>
              </div>
              <p className="text-3xl font-bold text-text">{stats?.late_count || 0}</p>
            </motion.div>
            <motion.div variants={item} className="glass-panel p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-500"><AlertTriangle className="w-5 h-5" /></div>
                <h3 className="text-sm font-medium text-text-muted">Absences</h3>
              </div>
              <p className="text-3xl font-bold text-text">{stats?.absent || 0}</p>
            </motion.div>
          </div>

          <Link to="/qr-entry" className="block">
            <motion.div variants={item} whileHover={{ y: -4, scale: 1.01 }} className="glass-panel p-6 border-primary/30 hover:border-primary/50 transition-colors group flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <QrCode className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text mb-1">Generate Entry QR</h3>
                  <p className="text-sm text-text-muted">Use this temporary token if you forgot your physical ID card.</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-text-muted group-hover:text-primary transition-colors hidden sm:block" />
            </motion.div>
          </Link>
        </motion.div>
      )}

      {/* Guard: Quick Actions */}
      {user?.role === 'guard' && (
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Link to="/scan-qr">
            <motion.div variants={item} whileHover={{ y: -4 }} className="glass-panel p-6 group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-4 group-hover:scale-110 transition-transform">
                <ScanLine className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-1">Scan QR Code</h3>
              <p className="text-sm text-text-muted">Validate student entry via temporary QR token.</p>
            </motion.div>
          </Link>
          <Link to="/gate-logs">
            <motion.div variants={item} whileHover={{ y: -4 }} className="glass-panel p-6 group">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-500 mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-text mb-1">Gate Logs</h3>
              <p className="text-sm text-text-muted">Review real-time physical entry records.</p>
            </motion.div>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
