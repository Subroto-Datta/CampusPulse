import { useState, useEffect } from 'react';
import api from '../services/api';
import { HiOutlineExclamation, HiOutlineCheckCircle } from 'react-icons/hi';

const ALERT_COLORS = {
  ENTERED_BUT_ABSENT: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', label: 'Campus Entry but Absent' },
  PRESENT_NO_GATE_LOG: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', label: 'Present without Gate Log' },
  REPEATED_LATE: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Repeated Late Arrival' },
  BELOW_75_ATTENDANCE: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Below 75% Attendance' },
};

export default function Attendance() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('unresolved');

  useEffect(() => { loadAlerts(); }, [filter]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const params = filter === 'all' ? {} : { resolved: filter === 'resolved' };
      const { data } = await api.get('/attendance/alerts', { params });
      setAlerts(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-white">Attendance Alerts</h1>
        <p className="text-gray-400 text-sm mt-1">Anomalies detected by the resolution engine</p>
      </div>

      <div className="flex gap-2">
        {['unresolved', 'resolved', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30' : 'btn-ghost'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-10 h-10 border-4 border-accent-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-card text-center py-12">
          <HiOutlineCheckCircle className="w-16 h-16 text-emerald-500/40 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No alerts found</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {alerts.map((alert) => {
            const config = ALERT_COLORS[alert.alert_type] || ALERT_COLORS.ENTERED_BUT_ABSENT;
            return (
              <div key={alert.id} className={`rounded-xl p-4 ${config.bg} border ${config.border} flex items-start gap-4`}>
                <HiOutlineExclamation className={`w-6 h-6 ${config.text} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-sm font-semibold ${config.text}`}>{config.label}</span>
                    {alert.is_resolved && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium">{alert.student_name}</p>
                  <p className="text-sm text-gray-400">GR: {alert.gr_number} • Roll: {alert.roll_number}</p>
                  {alert.message && <p className="text-xs text-gray-500 mt-1">{alert.message}</p>}
                  <p className="text-[10px] text-gray-600 mt-2">
                    {new Date(alert.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
