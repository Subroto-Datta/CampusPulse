import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { HiOutlineAcademicCap, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export default function Sessions() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [sessions, setSessions] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [formData, setFormData] = useState({ faculty_id: '', course_id: 'c0000000-0000-0000-0000-000000000001', division: 'A', session_date: new Date().toISOString().slice(0, 10), start_time: '10:00', end_time: '11:00' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadData();
    if (isAdmin) loadFaculties();
  }, [isAdmin]);

  const loadData = () => {
    setLoading(true);
    const endpoint = isAdmin ? '/admin/sessions' : '/faculty/today-sessions';
    api.get(endpoint)
      .then(({ data }) => setSessions(data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const loadFaculties = () => {
    api.get('/faculty')
      .then(({ data }) => setFaculties(data.data || []))
      .catch(console.error);
  };

  const openModal = (session = null) => {
    if (session) {
      setEditingSession(session.id);
      setFormData({
        faculty_id: session.faculty_id,
        course_id: session.course_id,
        division: session.division,
        session_date: session.session_date,
        start_time: session.start_time,
        end_time: session.end_time
      });
    } else {
      setEditingSession(null);
      setFormData({ faculty_id: faculties[0]?.id || '', course_id: 'c0000000-0000-0000-0000-000000000001', division: 'A', session_date: new Date().toISOString().slice(0, 10), start_time: '10:00', end_time: '11:00' });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingSession) {
        await api.put(`/admin/sessions/${editingSession}`, formData);
      } else {
        await api.post('/admin/sessions', formData);
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    try {
      await api.delete(`/admin/sessions/${id}`);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{isAdmin ? 'All Sessions' : 'My Sessions'}</h1>
          <p className="text-gray-400 text-sm mt-1">{isAdmin ? 'Manage all lecture sessions across campus' : 'Today\'s lecture schedule'}</p>
        </div>
        {isAdmin && (
          <button onClick={() => openModal()} className="btn-primary flex items-center gap-2">
            <HiOutlinePlus className="w-5 h-5" /> Create Session
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="glass-panel text-center py-12">
          <HiOutlineAcademicCap className="w-16 h-16 text-surface-border mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No sessions scheduled.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((s, i) => (
            <div key={s.id} className="glass-panel p-5 animate-slide-up" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-primary">
                <div className="flex items-center gap-4 pl-4">
                  <div className="w-12 h-12 rounded-xl bg-surface border border-surface-border flex items-center justify-center text-text font-bold text-sm">
                    {s.course_code?.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text text-base">{s.course_name}</h3>
                    <p className="text-sm text-text-muted mt-0.5">
                      {s.course_code} • Div {s.division} • {s.session_date}
                    </p>
                    <p className="text-sm text-text-muted">
                      {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)} {isAdmin && `• Faculty: ${s.faculty_name}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.is_completed ? (
                    <Link to={`/sessions/${s.id}/attendance`} className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Completed
                    </Link>
                  ) : (
                    <Link to={`/sessions/${s.id}/attendance`} className="btn-primary text-sm py-2 px-5">
                      Take Attendance
                    </Link>
                  )}
                  {isAdmin && (
                    <div className="flex items-center gap-2 ml-2">
                      <button onClick={() => openModal(s)} className="p-2 text-gray-400 hover:text-white hover:bg-surface-hover rounded-lg transition-colors">
                        <HiOutlinePencil className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                        <HiOutlineTrash className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Create/Edit Modal */}
      {isAdmin && createPortal(
        <AnimatePresence>
          {showModal && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            >
              <motion.form 
                initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                onSubmit={handleSubmit} 
                className="bg-surface border border-surface-border p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-lg space-y-5 rounded-2xl relative"
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  {editingSession ? 'Edit Session' : 'Create Session'}
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Assign Faculty</label>
                    <select required value={formData.faculty_id} onChange={e => setFormData({...formData, faculty_id: e.target.value})} className="input-field">
                      <option value="">Select Faculty...</option>
                      {faculties.map(f => <option key={f.id} value={f.id}>{f.full_name} ({f.department_name || f.department || f.employee_id || 'Faculty'})</option>)}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Course ID</label>
                    <input required type="text" value={formData.course_id} onChange={e => setFormData({...formData, course_id: e.target.value})} className="input-field" placeholder="e.g. c0000000..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Division</label>
                    <input required type="text" value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} className="input-field" placeholder="e.g. A" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Session Date</label>
                    <input required type="date" value={formData.session_date} onChange={e => setFormData({...formData, session_date: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Start Time</label>
                    <input required type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">End Time</label>
                    <input required type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="input-field" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={formLoading} className="btn-primary">
                    {formLoading ? 'Saving...' : 'Save Session'}
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
