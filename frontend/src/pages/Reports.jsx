import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import Papa from 'papaparse';
import api from '../services/api';
import { HiOutlineDocumentReport, HiOutlineDownload } from 'react-icons/hi';

const TABS = [
  { key: 'daily', label: 'Daily Trend' },
  { key: 'subject', label: 'Subject-wise' },
  { key: 'low', label: 'Low Attendance' },
  { key: 'bunk', label: 'Bunk Suspects' },
  { key: 'late', label: 'Late Arrivals' },
  { key: 'overall', label: 'Overall Master' },
];


export default function Reports() {
  const [activeTab, setActiveTab] = useState('daily');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadReport(); }, [activeTab]);

  async function loadReport() {
    setLoading(true);
    const endpoints = {
      daily: '/reports/daily-trend',
      subject: '/reports/subject-wise',
      low: '/reports/low-attendance',
      bunk: '/reports/bunk-suspects',
      late: '/reports/late-arrivals',
      overall: '/reports/overall',
    };

    try {
      const { data: resp } = await api.get(endpoints[activeTab]);
      setData(resp.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function exportCsv() {
    if (!data.length) return;
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campuspulse_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Attendance insights and data exports</p>
        </div>
        <button onClick={exportCsv} disabled={!data.length} className="btn-ghost inline-flex items-center gap-2 text-accent-400 disabled:opacity-30">
          <HiOutlineDownload className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-accent-500/20 text-accent-400 border border-accent-500/30'
                : 'btn-ghost'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <div className="glass-panel text-center py-20">
          <HiOutlineDocumentReport className="w-16 h-16 text-surface-border mx-auto mb-4" />
          <p className="text-text font-medium text-lg">No data available for this report</p>
          <p className="text-text-muted text-sm mt-1">Start taking attendance to generate analytics.</p>
        </div>
      ) : (
        <div className="glass-panel p-6">
          {/* Daily Trend Chart */}
          {activeTab === 'daily' && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-6">Daily Attendance % vs Gate Entries (Last 30 days)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="session_date" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => v?.slice(5)} />
                  <YAxis yAxisId="left" tick={{ fill: '#a1a1aa', fontSize: 12 }} domain={[0, 100]} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#a1a1aa', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', color: '#f4f4f5', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    labelFormatter={(v) => `Date: ${v}`}
                  />
                  <Line yAxisId="left" type="monotone" name="Attendance %" dataKey="pct" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  <Line yAxisId="right" type="monotone" name="Gate Entries" dataKey="gate_entries" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Subject-wise Chart */}
          {activeTab === 'subject' && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-6">Subject-wise Attendance</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data} layout="vertical" barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#a1a1aa', fontSize: 12 }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="course_name" type="category" tick={{ fill: '#a1a1aa', fontSize: 12 }} width={140} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '12px', color: '#f4f4f5', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    cursor={{ fill: '#27272a' }}
                    formatter={(v) => [`${v}%`, 'Attendance']}
                  />
                  <Bar dataKey="attendance_pct" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Table views */}
          {['low', 'bunk', 'late', 'overall'].includes(activeTab) && (
            <div>
              <h3 className="text-lg font-semibold text-text mb-6">
                {activeTab === 'low' ? 'Low Attendance (<75%)' :
                 activeTab === 'bunk' ? 'Bunk Suspects (Last 7 days)' :
                 activeTab === 'late' ? 'Late Arrivals (Last 7 days)' :
                 'Overall Student Attendance Master'}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface/30">
                      <th className="px-6 py-4 font-medium text-text-muted">Student</th>
                      <th className="px-6 py-4 font-medium text-text-muted">GR Number</th>
                      <th className="px-6 py-4 font-medium text-text-muted">Roll</th>
                      {activeTab === 'overall' && <th className="px-6 py-4 font-medium text-text-muted text-center">Sessions</th>}
                      {['low', 'overall'].includes(activeTab) && <th className="px-6 py-4 font-medium text-text-muted text-right">Attendance %</th>}
                      {activeTab === 'bunk' && <th className="px-6 py-4 font-medium text-text-muted text-right">Bunk Count</th>}
                      {activeTab === 'late' && <th className="px-6 py-4 font-medium text-text-muted text-right">Late Count</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => (
                      <tr key={i} className="border-b border-surface-border/50 hover:bg-surface-hover/50 transition-colors">
                        <td className="px-6 py-4 text-text font-medium">{row.full_name}</td>
                        <td className="px-6 py-4 text-text-muted font-mono">{row.gr_number}</td>
                        <td className="px-6 py-4 text-text-muted">{row.roll_number}</td>
                        {activeTab === 'overall' && <td className="px-6 py-4 text-center text-text-muted">{row.present_count} / {row.total_sessions}</td>}
                        {['low', 'overall'].includes(activeTab) && (
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold border ${
                              parseFloat(row.attendance_pct) < 50 ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                              parseFloat(row.attendance_pct) < 75 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            }`}>
                              {row.attendance_pct}%
                            </span>
                          </td>
                        )}
                        {activeTab === 'bunk' && <td className="px-6 py-4 text-right text-red-400 font-bold">{row.bunk_count}</td>}
                        {activeTab === 'late' && <td className="px-6 py-4 text-right text-amber-500 font-bold">{row.late_count}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
