import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../utils/cn';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@campuspulse.edu', icon: '👑' },
  { label: 'Faculty', email: 'faculty1@campuspulse.edu', icon: '👩‍🏫' },
  { label: 'Student', email: 'student1@campuspulse.edu', icon: '🎓' },
  { label: 'Guard', email: 'guard@campuspulse.edu', icon: '🛡️' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword('Password123!');
    setError('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden p-4">
      {/* Dynamic Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-hero-glow rounded-full blur-[100px] animate-spin-slow" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface border border-surface-border shadow-2xl mb-6 relative group"
          >
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:bg-primary/30 transition-colors" />
            <Sparkles className="w-8 h-8 text-primary relative z-10" />
          </motion.div>
          <h1 className="text-3xl font-semibold text-text tracking-tight mb-2">Welcome to CampusPulse</h1>
          <p className="text-text-muted">Enter your credentials to continue</p>
        </div>

        <motion.div 
          className="glass-panel p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-text-muted pl-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder="name@campuspulse.edu"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between pl-1 pr-1">
                <label className="text-sm font-medium text-text-muted">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-base pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-surface-border">
            <p className="text-xs text-text-muted text-center mb-4 uppercase tracking-wider font-medium">Quick Demo Access</p>
            <div className="grid grid-cols-2 gap-3">
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={acc.email}
                  onClick={() => fillDemo(acc)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-surface-border text-sm text-text-muted hover:text-text hover:border-surface-border/80 transition-all"
                >
                  <span className="text-lg">{acc.icon}</span>
                  <span className="font-medium">{acc.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
