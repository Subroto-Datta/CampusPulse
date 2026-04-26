import { useState, useEffect } from 'react';
import api from '../services/api';
import { HiOutlineFingerPrint, HiOutlinePlus, HiOutlineBan, HiOutlineEye, HiOutlineEyeOff } from 'react-icons/hi';

export default function RfidMapping() {
  const [mappings, setMappings] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rfidUid, setRfidUid] = useState('');
  const [studentId, setStudentId] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [visibleUids, setVisibleUids] = useState(new Set());

  useEffect(() => { 
    loadMappings();
    loadStudents();
  }, []);

  async function loadMappings() {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/rfid/mappings');
      setMappings(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function loadStudents() {
    try {
      const { data } = await api.get('/students', { params: { limit: 1000 } });
      setStudents(data.data.students || []);
    } catch (err) { console.error(err); }
  }

  const toggleVisibility = (id) => {
    setVisibleUids(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const censorUid = (uid) => {
    if (!uid) return '';
    if (uid.length <= 4) return '••••';
    return '••••' + uid.slice(-4);
  };

  async function handleMap(e) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await api.post('/admin/rfid/map', { rfid_uid: rfidUid, student_id: studentId });
      setRfidUid('');
      setStudentId('');
      setShowForm(false);
      loadMappings();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to map RFID');
    } finally { setFormLoading(false); }
  }

  async function handleRevoke(id) {
    if (!confirm('Revoke this RFID card?')) return;
    try {
      await api.patch(`/admin/rfid/${id}/revoke`);
      loadMappings();
    } catch (err) { alert(err.response?.data?.message || 'Failed'); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">RFID Card Mapping</h1>
          <p className="text-gray-400 text-sm mt-1">Map RFID cards to students for gate entry</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary inline-flex items-center gap-2">
          <HiOutlinePlus className="w-5 h-5" />
          Map New Card
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleMap} className="glass-card space-y-4">
          <h3 className="font-semibold text-white">Map RFID Card</h3>
          {formError && (
            <div className="px-4 py-2 rounded-lg bg-danger-500/10 text-danger-400 text-sm">{formError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="RFID UID (e.g. RFID-XXXX)"
              value={rfidUid}
              onChange={(e) => setRfidUid(e.target.value)}
              className="input-field"
              required
            />
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="input-field bg-surface text-text"
              required
            >
              <option value="" disabled>Select Student</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.gr_number})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={formLoading} className="btn-primary text-sm">
              {formLoading ? 'Mapping...' : 'Map Card'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left px-6 py-4 text-gray-400 font-medium">RFID UID</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Student</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">GR Number</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Status</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Issued</th>
                <th className="text-left px-6 py-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="text-center py-12">
                  <div className="w-8 h-8 border-3 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : mappings.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-12">
                  <HiOutlineFingerPrint className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500">No RFID cards mapped</p>
                </td></tr>
              ) : (
                mappings.map((m) => {
                  const isVisible = visibleUids.has(m.id);
                  return (
                    <tr key={m.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-mono text-accent-400 flex items-center gap-2">
                        <span>{isVisible ? m.rfid_uid : censorUid(m.rfid_uid)}</span>
                        <button type="button" onClick={() => toggleVisibility(m.id)} className="text-gray-400 hover:text-white transition-colors">
                          {isVisible ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-white">{m.student_name}</td>
                      <td className="px-6 py-4 text-gray-300 font-mono">{m.gr_number}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${m.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-danger-500/20 text-danger-400'}`}>
                          {m.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{new Date(m.issued_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        {m.is_active && (
                          <button onClick={() => handleRevoke(m.id)} className="text-danger-400 hover:text-danger-300 transition-colors" title="Revoke">
                            <HiOutlineBan className="w-5 h-5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
