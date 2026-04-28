import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { HiOutlineSearch, HiOutlineUsers, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiX } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    full_name: '', email: '', gr_number: '', roll_number: '', division: '', semester: '', is_active: true
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [page, search]);

  async function loadStudents() {
    setLoading(true);
    try {
      const { data } = await api.get('/students', { params: { search, page, limit: 20 } });
      setStudents(data.data.students || []);
      setTotal(data.data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(s) {
    setEditingStudent(s.id);
    setFormData({
      full_name: s.full_name || '', email: s.email || '', gr_number: s.gr_number || '',
      roll_number: s.roll_number || '', division: s.division || '', semester: s.semester || '', is_active: s.is_active
    });
    setShowModal(true);
  }

  function handleAddNew() {
    setEditingStudent(null);
    setFormData({ full_name: '', email: '', gr_number: '', roll_number: '', division: '', semester: '', is_active: true });
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      loadStudents();
    } catch (err) { alert('Failed to delete'); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent}`, formData);
      } else {
        await api.post('/students', formData);
      }
      setShowModal(false);
      loadStudents();
    } catch (err) {
      alert('Failed to save student details');
    } finally {
      setFormLoading(false);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Student Management</h1>
          <p className="text-gray-400 text-sm mt-1">{total} students registered</p>
        </div>
        <button onClick={handleAddNew} className="btn-primary inline-flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" />
          Add Student
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
        <input
          type="text"
          placeholder="Search by name, GR, or roll..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input-field pl-12 pr-10"
        />
        {search && (
          <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text rounded-full hover:bg-surface-hover transition-colors">
            <HiX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Student</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">GR Number</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Roll</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Sem/Yr</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Div</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Status</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="w-8 h-8 border-3 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mx-auto mb-4">
                      <HiOutlineUsers className="w-8 h-8 text-text-muted" />
                    </div>
                    <h3 className="text-lg font-semibold text-text mb-1">No students found</h3>
                    <p className="text-text-muted text-sm mb-4">Get started by adding a new student to the system.</p>
                    <button onClick={handleAddNew} className="btn-secondary text-sm">Add First Student</button>
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                          {s.full_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{s.full_name}</p>
                          <p className="text-xs text-gray-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-mono">{s.gr_number}</td>
                    <td className="px-6 py-4 text-gray-300">{s.roll_number}</td>
                    <td className="px-6 py-4 text-gray-300">Sem {s.semester || '1'}</td>
                    <td className="px-6 py-4 text-gray-300">{s.division}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-danger-500/20 text-danger-400'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleEdit(s)} className="p-2 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors" title="Edit">
                          <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 rounded-lg text-danger-400 hover:text-danger-300 hover:bg-danger-500/10 transition-colors" title="Delete">
                          <HiOutlineTrash className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-ghost text-sm disabled:opacity-30">← Prev</button>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-ghost text-sm disabled:opacity-30">Next →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {createPortal(
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
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Full Name</label>
                  <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="input-field" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Email</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">GR Number</label>
                  <input required type="text" value={formData.gr_number} onChange={e => setFormData({...formData, gr_number: e.target.value})} className="input-field" placeholder="GR2024001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Roll Number</label>
                  <input required type="text" value={formData.roll_number} onChange={e => setFormData({...formData, roll_number: e.target.value})} className="input-field" placeholder="101" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Division</label>
                  <input required type="text" value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} className="input-field" placeholder="A" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-muted mb-1.5">Semester / Year</label>
                  <input required type="number" min="1" max="8" value={formData.semester} onChange={e => setFormData({...formData, semester: parseInt(e.target.value) || ''})} className="input-field" placeholder="3" />
                </div>
                <div className="flex items-center sm:mt-8 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 rounded border-surface-border bg-surface text-primary focus:ring-primary focus:ring-offset-background transition-colors cursor-pointer" />
                    <span className="text-sm font-medium text-text group-hover:text-primary transition-colors">Active Student</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={formLoading} className="btn-primary">
                  {formLoading ? 'Saving...' : 'Save Student'}
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
