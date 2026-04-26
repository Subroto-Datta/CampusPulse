import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { HiOutlineSearch, HiOutlineAcademicCap, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiFilter, HiX } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';

export default function Faculties() {
  const [faculties, setFaculties] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  
  // Filters
  const [filterDept, setFilterDept] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterDiv, setFilterDiv] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '', email: '', department: '', year: '', division: '', subject: '', is_active: true
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadFaculties();
  }, []);

  async function loadFaculties() {
    setLoading(true);
    try {
      const { data } = await api.get('/faculty');
      setFaculties(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(f) {
    setEditingFaculty(f.id);
    setFormData({
      full_name: f.full_name || '', 
      email: f.email || '', 
      department: f.department || f.department_name || '', 
      year: f.year || '', 
      division: f.division || '', 
      subject: f.subject || '', 
      is_active: f.is_active !== false
    });
    setShowModal(true);
  }

  function handleAddNew() {
    setEditingFaculty(null);
    setFormData({ full_name: '', email: '', department: '', year: '', division: '', subject: '', is_active: true });
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this faculty member?')) return;
    try {
      await api.delete(`/faculty/${id}`);
      loadFaculties();
    } catch (err) { alert('Failed to delete'); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingFaculty) {
        await api.put(`/faculty/${editingFaculty}`, formData);
      } else {
        await api.post('/faculty', formData);
      }
      setShowModal(false);
      loadFaculties();
    } catch (err) {
      alert('Failed to save faculty details');
    } finally {
      setFormLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return faculties.filter((f) => {
      const q = search.toLowerCase();
      const matchesSearch = f.full_name?.toLowerCase().includes(q) || f.email?.toLowerCase().includes(q);
      const deptName = (f.department || f.department_name || '').toLowerCase();
      const matchesDept = filterDept ? deptName.includes(filterDept.toLowerCase()) : true;
      const matchesYear = filterYear ? String(f.year) === String(filterYear) : true;
      const matchesDiv = filterDiv ? (f.division || '').toLowerCase() === filterDiv.toLowerCase() : true;
      const matchesSubj = filterSubject ? (f.subject || '').toLowerCase().includes(filterSubject.toLowerCase()) : true;
      return matchesSearch && matchesDept && matchesYear && matchesDiv && matchesSubj;
    });
  }, [faculties, search, filterDept, filterYear, filterDiv, filterSubject]);

  // Unique values for dropdowns
  const uniqueDepts = [...new Set(faculties.map(f => f.department || f.department_name).filter(Boolean))];
  const uniqueYears = [...new Set(faculties.map(f => f.year).filter(Boolean))];
  const uniqueDivs = [...new Set(faculties.map(f => f.division).filter(Boolean))];
  const uniqueSubjects = [...new Set(faculties.map(f => f.subject).filter(Boolean))];

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Faculty Management</h1>
          <p className="text-gray-400 text-sm mt-1">{faculties.length} faculty members registered</p>
        </div>
        <button onClick={handleAddNew} className="btn-primary inline-flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" />
          Add Faculty
        </button>
      </div>

      {/* Search & Filters Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full max-w-md">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-12 pr-10 w-full"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors">
              <HiX className="w-4 h-4" />
            </button>
          )}
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)} 
          className={`btn-ghost inline-flex items-center gap-2 ${showFilters ? 'bg-white/10 text-white' : ''}`}
        >
          <HiFilter className="w-5 h-5" />
          Filters
        </button>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="glass p-4 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Department</label>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="input-field bg-surface">
              <option value="">All Departments</option>
              {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Year</label>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="input-field bg-surface">
              <option value="">All Years</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Division</label>
            <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)} className="input-field bg-surface">
              <option value="">All Divisions</option>
              {uniqueDivs.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Subject</label>
            <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="input-field bg-surface">
              <option value="">All Subjects</option>
              {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Faculty</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Department</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Year / Div</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Subject</th>
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mx-auto mb-4">
                      <HiOutlineAcademicCap className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">No faculty members found</h3>
                    <p className="text-gray-400 text-sm mb-4">Get started by adding a new faculty member to the system.</p>
                    <button onClick={handleAddNew} className="btn-secondary text-sm">Add First Faculty</button>
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {f.full_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{f.full_name}</p>
                          <p className="text-xs text-gray-500">{f.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-surface-700/50 text-gray-300">
                        {f.department || f.department_name || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {f.year || '-'} {f.division ? `/ ${f.division}` : ''}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {f.subject || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${f.is_active !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-danger-500/20 text-danger-400'}`}>
                        {f.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleEdit(f)} className="p-2 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors" title="Edit">
                          <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(f.id)} className="p-2 rounded-lg text-danger-400 hover:text-danger-300 hover:bg-danger-500/10 transition-colors" title="Delete">
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
                  {editingFaculty ? 'Edit Faculty' : 'Add New Faculty'}
                </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Full Name</label>
                  <input required type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="input-field" placeholder="Dr. Jane Smith" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input-field" placeholder="jane@campuspulse.edu" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Department</label>
                  <input type="text" placeholder="e.g. Computer Science" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Year</label>
                  <input type="text" placeholder="e.g. 2nd Year" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Division</label>
                  <input type="text" placeholder="e.g. A" value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Subject</label>
                  <input type="text" placeholder="e.g. Data Structures" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="input-field" />
                </div>
                <div className="flex items-center mt-2 sm:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-5 h-5 rounded border-surface-border bg-surface text-primary focus:ring-primary focus:ring-offset-background transition-colors cursor-pointer" />
                    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Active Faculty</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={formLoading} className="btn-primary">
                  {formLoading ? 'Saving...' : 'Save Faculty'}
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
