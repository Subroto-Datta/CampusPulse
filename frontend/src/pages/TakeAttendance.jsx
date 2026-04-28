import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Search, Check, X, Loader2, AlertCircle, Undo2, LogOut, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';
import { cn } from '../utils/cn';

export default function TakeAttendance() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessionInfo, setSessionInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [absentIds, setAbsentIds] = useState(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState('');
  const [history, setHistory] = useState([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  
  const searchInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.get(`/faculty/session/${sessionId}/students`)
      .then(({ data }) => {
        const d = data.data;
        setSessionInfo({ session_id: d.session_id, division: d.division, is_completed: d.is_completed });
        setStudents(d.students || []);
        const alreadyAbsent = (d.students || [])
          .filter(s => s.attendance_status === 'ABSENT_CONFIRMED' || s.attendance_status === 'BUNK_SUSPECTED')
          .map(s => s.student_id);
        setAbsentIds(new Set(alreadyAbsent));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Focus search on '/'
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Undo on Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history]);

  const toggleAbsent = (studentId) => {
    setAbsentIds((prev) => {
      const next = new Set(prev);
      const action = next.has(studentId) ? 'remove' : 'add';
      if (action === 'remove') next.delete(studentId);
      else next.add(studentId);
      setHistory(h => [...h, { studentId, action }]);
      return next;
    });
  };

  const handleUndo = useCallback(() => {
    setHistory(h => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      setAbsentIds(prev => {
        const next = new Set(prev);
        if (last.action === 'add') next.delete(last.studentId);
        else next.add(last.studentId);
        return next;
      });
      return h.slice(0, -1);
    });
  }, []);

  const confirmSubmit = () => {
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      await api.post('/faculty/attendance/submit', {
        session_id: sessionId,
        absent_student_ids: [...absentIds],
      });
      setToast('Attendance logged successfully!');
      setTimeout(() => navigate('/sessions'), 1500);
    } catch (err) {
      setToast(err.response?.data?.message || 'Submit failed. Please try again.');
      setTimeout(() => setToast(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOcrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    const formData = new FormData();
    formData.append('document', file);
    try {
      const { data } = await api.post(`/attendance/upload/${sessionId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const payload = data.data;
      // Update local state with the results from the file
      setAbsentIds(new Set(payload.absent_student_ids));
      setToast(`${payload.processed_method} loaded: ${payload.present_student_ids.length} Present, ${payload.absent_student_ids.length} Absent. Review before submitting.`);
      setTimeout(() => setToast(''), 4000);

    } catch (err) {
      setToast(err.response?.data?.message || 'File processing failed.');

      setTimeout(() => setToast(''), 3000);
    } finally {
      setOcrLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const exportSessionCSV = () => {
    if (!students.length) return;
    const csvData = students.map(s => ({
      'Student Name': s.full_name,
      'GR Number': s.gr_number,
      'Roll Number': s.roll_number,
      'Semester': s.semester || 'N/A',
      'Division': s.division || sessionInfo?.division || 'N/A',
      'Status': absentIds.has(s.student_id) ? 'Absent' : 'Present'
    }));
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Session_Attendance_${sessionInfo?.session_id || sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.full_name?.toLowerCase().includes(q) ||
      s.roll_number?.toLowerCase().includes(q) ||
      s.gr_number?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-24 left-1/2 z-50 px-6 py-3 rounded-full bg-emerald-500 text-white shadow-xl font-medium flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-semibold text-text tracking-tight">
              {sessionInfo?.is_completed ? 'Edit Session Attendance' : 'Session Attendance'}
            </h1>
            <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold rounded-full">
              DIV {sessionInfo?.division}
            </span>
          </div>
          <p className="text-text-muted text-sm">
            Tap a student to mark <span className="text-red-400 font-medium px-1 bg-red-500/10 rounded">absent</span>. Press <kbd className="px-1.5 py-0.5 rounded bg-surface border border-surface-border font-mono text-[10px]">Ctrl+Z</kbd> to undo.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl min-w-[100px]">
            <span className="text-2xl font-bold text-emerald-500">{students.length - absentIds.size}</span>
            <span className="text-[10px] uppercase font-bold text-emerald-500/70 tracking-wider">Present</span>
          </div>
          <div className="flex flex-col items-center justify-center px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl min-w-[100px]">
            <span className="text-2xl font-bold text-red-500">{absentIds.size}</span>
            <span className="text-[10px] uppercase font-bold text-red-500/70 tracking-wider">Absent</span>
          </div>
        </motion.div>
      </div>

      {/* Toolbar (Sticky) */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} 
        className="sticky top-[72px] lg:top-4 z-40 max-w-xl flex flex-wrap sm:flex-nowrap gap-2 bg-background/80 backdrop-blur-md py-2 rounded-xl"
      >
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Filter by name, roll... (Press '/')"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-12 h-12 text-base shadow-sm"
          />
        </div>
        
        {/* Hidden File Input */}
        <input type="file" ref={fileInputRef} hidden onChange={handleOcrUpload} accept="image/*,.pdf,.csv,.xlsx,.xls" />


        
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={ocrLoading}
          className="px-4 bg-surface border border-surface-border rounded-xl text-text hover:text-primary hover:border-primary/50 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
          title="Upload Attendance Sheet"
        >
          {ocrLoading ? <Loader2 className="w-5 h-5 animate-spin text-primary" /> : <Upload className="w-5 h-5" />}
          <span className="hidden sm:inline text-sm">{ocrLoading ? 'Scanning...' : 'Upload Sheet'}</span>
        </button>

        <button 
          onClick={handleUndo}
          disabled={history.length === 0}
          className="px-4 bg-surface border border-surface-border rounded-xl text-text-muted hover:text-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          title="Undo Last Action"
        >
          <Undo2 className="w-5 h-5" />
        </button>

        <button 
          onClick={exportSessionCSV}
          disabled={students.length === 0}
          className="px-4 bg-surface border border-surface-border rounded-xl text-text hover:text-accent-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
          title="Export CSV"
        >
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline text-sm">Export</span>
        </button>
      </motion.div>

      {/* Grid */}
      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence>
          {filtered.length === 0 && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-12 text-center text-text-muted flex flex-col items-center">
               <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
               <p>No students match your search.</p>
             </motion.div>
          )}
          {filtered.map((s, i) => {
            const isAbsent = absentIds.has(s.student_id);
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={s.student_id}
                className={cn(
                  "relative flex flex-col gap-3 p-4 rounded-2xl border text-left transition-all duration-200 group overflow-hidden",
                  isAbsent
                    ? "bg-red-500/5 border-red-500/30 ring-1 ring-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]"
                    : "bg-surface border-surface-border hover:border-border-muted hover:shadow-md"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    isAbsent ? "bg-red-500/20 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {isAbsent ? <X className="w-6 h-6" /> : <Check className="w-6 h-6" />}
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-semibold truncate transition-colors", isAbsent ? "text-red-400" : "text-text")}>
                      {s.full_name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      <span className="font-medium text-text-muted/80">Roll {s.roll_number}</span> • {s.gr_number}
                    </p>
                    <div className="mt-1 flex gap-2">
                       <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-border/50 text-text-muted">SEM {s.semester || 'N/A'}</span>
                       <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface-border/50 text-text-muted">DIV {s.division || sessionInfo?.division}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <button 
                    onClick={() => { if (isAbsent) toggleAbsent(s.student_id); }}
                    className={cn(
                      "py-2 px-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors",
                      !isAbsent ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20" : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                    )}
                  >
                    <Check className="w-4 h-4" /> Present
                  </button>
                  <button 
                    onClick={() => { if (!isAbsent) toggleAbsent(s.student_id); }}
                    className={cn(
                      "py-2 px-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors",
                      isAbsent ? "bg-red-500 text-white shadow-md shadow-red-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    )}
                  >
                    <X className="w-4 h-4" /> Absent
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="glass-panel p-6 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold text-text mb-2">Confirm Submission</h2>
              <p className="text-text-muted mb-6">
                You are about to log attendance. 
                <span className="text-red-400 font-bold px-1">{absentIds.size}</span> students will be marked absent. This will trigger the resolution engine.
              </p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowConfirm(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSubmit} className="btn-primary">
                  {sessionInfo?.is_completed ? 'Update Attendance' : 'Confirm & Submit'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Submit Action */}
      <motion.div 
        initial={{ y: 100 }} animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 lg:left-[260px] p-4 bg-background/80 backdrop-blur-xl border-t border-surface-border flex justify-end z-30"
      >
        <button
          onClick={confirmSubmit}
          disabled={submitting}
          className="btn-primary px-8 py-3.5 text-base shadow-2xl shadow-primary/20 min-w-[200px]"
        >
          {submitting ? (
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          ) : (
            <span className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              {sessionInfo?.is_completed ? 'Update Roster' : 'Review & Submit'}
            </span>
          )}
        </button>
      </motion.div>
    </div>
  );
}
