import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { HiOutlineSearch, HiOutlineBookOpen, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiX } from 'react-icons/hi';
import { motion, AnimatePresence } from 'framer-motion';

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '', code: '', credits: 3, semester: 1
  });

  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/courses');
      setCourses(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(c) {
    setEditingCourse(c.id);
    setFormData({
      name: c.name || '',
      code: c.code || '',
      credits: c.credits || 3,
      semester: c.semester || 1
    });

    setShowModal(true);
  }

  function handleAddNew() {
    setEditingCourse(null);
    setFormData({ name: '', code: '', credits: 3, semester: 1 });
    setShowModal(true);
  }


  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this course? This may affect lecture sessions.')) return;
    try {
      await api.delete(`/admin/courses/${id}`);
      loadCourses();
    } catch (err) { alert('Failed to delete'); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (editingCourse) {
        await api.put(`/admin/courses/${editingCourse}`, formData);
      } else {
        await api.post('/admin/courses', formData);
      }
      setShowModal(false);
      loadCourses();
    } catch (err) {
      alert('Failed to save course details');
    } finally {
      setFormLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const q = search.toLowerCase();
      return c.name?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q);
    });
  }, [courses, search]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Course Management</h1>
          <p className="text-gray-400 text-sm mt-1">{courses.length} courses registered</p>
        </div>
        <button onClick={handleAddNew} className="btn-primary inline-flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" />
          Add Course
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full max-w-md">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by course name or code..."
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
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Course Code</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Course Name</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium text-center">Semester</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium text-center">Credits</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Actions</th>

              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-12">
                    <div className="w-8 h-8 border-3 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-surface border border-surface-border flex items-center justify-center mx-auto mb-4">
                      <HiOutlineBookOpen className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">No courses found</h3>
                    <p className="text-gray-400 text-sm mb-4">Add a new course to use it in lecture sessions.</p>
                    <button onClick={handleAddNew} className="btn-secondary text-sm">Add First Course</button>
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-accent-400 font-semibold uppercase">
                      {c.code}
                    </td>
                    <td className="px-6 py-4 text-gray-300 font-medium">
                      {c.name}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-400">
                      {c.semester}
                    </td>
                    <td className="px-6 py-4 text-center">

                      <span className="px-2 py-1 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        {c.credits}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleEdit(c)} className="p-2 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors" title="Edit">
                          <HiOutlinePencil className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-2 rounded-lg text-danger-400 hover:text-danger-300 hover:bg-danger-500/10 transition-colors" title="Delete">
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
                className="bg-surface border border-surface-border p-8 shadow-[0_20px_60px_rgba(0,0,0,0.6)] w-full max-w-md space-y-5 rounded-2xl relative"
              >
                <h2 className="text-2xl font-bold text-white mb-2">
                  {editingCourse ? 'Edit Course' : 'Add New Course'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Course Code</label>
                    <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="input-field" placeholder="CS301" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Course Name</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-field" placeholder="Data Structures & Algorithms" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Semester</label>
                    <input type="number" min="1" max="8" value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">Credits</label>

                    <input type="number" min="1" max="10" value={formData.credits} onChange={e => setFormData({...formData, credits: e.target.value})} className="input-field" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                  <button type="submit" disabled={formLoading} className="btn-primary">
                    {formLoading ? 'Saving...' : 'Save Course'}
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
