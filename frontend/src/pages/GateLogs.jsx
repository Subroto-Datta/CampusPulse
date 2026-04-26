import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { ShieldCheck, Filter, Search, ChevronLeft, ChevronRight, X, Clock, Fingerprint, QrCode } from 'lucide-react';
import { cn } from '../utils/cn';

export default function GateLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [dateFilter, setDateFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  useEffect(() => { loadLogs(); }, [page, dateFilter, sourceFilter]);

  async function loadLogs() {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (dateFilter) params.date = dateFilter;
      if (sourceFilter) params.source = sourceFilter;
      const { data } = await api.get('/admin/gate-logs', { params });
      setLogs(data.data.logs || []);
      setTotal(data.data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  const totalPages = Math.ceil(total / 15);

  const getSourceIcon = (source) => {
    switch(source) {
      case 'RFID': return <Fingerprint className="w-4 h-4 text-blue-400" />;
      case 'QR': return <QrCode className="w-4 h-4 text-purple-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSourceBadge = (source) => {
    switch(source) {
      case 'RFID': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'QR': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-surface-hover text-text-muted border-surface-border';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-semibold text-text tracking-tight">Gate Logs</h1>
          <p className="text-text-muted text-sm mt-1">{total} total entries recorded</p>
        </motion.div>
        
        {/* Filters */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="input-base pl-10 py-2 text-sm w-40"
            />
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          </div>
          <select
            value={sourceFilter}
            onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
            className="input-base py-2 text-sm w-36 cursor-pointer"
          >
            <option value="">All Sources</option>
            <option value="RFID">RFID Card</option>
            <option value="QR">Digital QR</option>
          </select>
          <AnimatePresence>
            {(dateFilter || sourceFilter) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => { setDateFilter(''); setSourceFilter(''); setPage(1); }}
                className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                title="Clear Filters"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <div className="glass-panel overflow-hidden flex flex-col min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-surface-border bg-surface/50">
                <th className="px-6 py-4 font-medium text-text-muted">Time (IST)</th>
                <th className="px-6 py-4 font-medium text-text-muted">Student Details</th>
                <th className="px-6 py-4 font-medium text-text-muted">Access Method</th>
                <th className="px-6 py-4 font-medium text-text-muted text-right">Gate Location</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.tr key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan="4" className="px-6 py-12 text-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-text-muted text-sm">Fetching records...</p>
                    </td>
                  </motion.tr>
                ) : logs.length === 0 ? (
                  <motion.tr key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <td colSpan="4" className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-text-muted" />
                    </div>
                    <h3 className="text-lg font-semibold text-text mb-1">No gate logs found</h3>
                    <p className="text-text-muted text-sm">No physical entry records match the current filters.</p>
                  </td>
                </motion.tr>
                ) : (
                  logs.map((log, idx) => (
                    <motion.tr 
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-surface-border/50 hover:bg-surface-hover/30 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-text-muted">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(log.scanned_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-text group-hover:text-primary transition-colors">{log.student_name}</span>
                          <span className="text-xs text-text-muted mt-0.5">GR: {log.gr_number} • Roll: {log.roll_number}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium", getSourceBadge(log.source))}>
                          {getSourceIcon(log.source)}
                          {log.source === 'RFID' ? 'RFID Card' : 'QR Token'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-text-muted font-medium">
                        {log.gate_name || 'MAIN GATE'}
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-border bg-surface/30">
            <p className="text-sm text-text-muted">
              Showing <span className="font-medium text-text">{(page - 1) * 15 + 1}</span> to <span className="font-medium text-text">{Math.min(page * 15, total)}</span> of <span className="font-medium text-text">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(Math.max(1, page - 1))} 
                disabled={page === 1} 
                className="p-2 rounded-lg border border-surface-border bg-surface text-text-muted hover:text-text hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
              <button 
                onClick={() => setPage(Math.min(totalPages, page + 1))} 
                disabled={page === totalPages} 
                className="p-2 rounded-lg border border-surface-border bg-surface text-text-muted hover:text-text hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
