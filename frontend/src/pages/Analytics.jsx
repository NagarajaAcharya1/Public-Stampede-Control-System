import { useState, useEffect } from 'react';
import axios from 'axios';
import { socket } from '../services/socket';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Users, AlertTriangle, UserCheck } from 'lucide-react';

const API = 'http://localhost:5000';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API}/api/analytics`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    socket.connect();
    socket.on('zone-update', fetchAnalytics);
    socket.on('new-alert', fetchAnalytics);
    socket.on('alert-resolved', fetchAnalytics);
    return () => {
      socket.off('zone-update', fetchAnalytics);
      socket.off('new-alert', fetchAnalytics);
      socket.off('alert-resolved', fetchAnalytics);
    };
  }, []);

  if (loading) return <div className="text-gray-500 text-sm p-8">Loading analytics...</div>;

  const pct = data.capacity > 0 ? Math.min(100, Math.round((data.currentOccupancy / data.capacity) * 100)) : 0;
  const alertResolutionRate = data.totalAlerts > 0 ? Math.round((data.resolvedAlerts / data.totalAlerts) * 100) : 0;

  const occupancyData = [
    { name: 'Inside Now', value: data.currentOccupancy },
    { name: 'Exited', value: data.totalExited },
    { name: 'Remaining Cap.', value: Math.max(0, data.capacity - data.currentOccupancy) },
  ];

  const alertData = [
    { name: 'Active', value: data.totalAlerts - data.resolvedAlerts },
    { name: 'Resolved', value: data.resolvedAlerts },
  ];

  const statusColor = {
    Low: 'text-emerald-500', Medium: 'text-yellow-500', High: 'text-orange-500', Critical: 'text-red-500'
  }[data.densityStatus] || 'text-emerald-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight dark:text-white text-black">Analytics</h1>
        <p className="text-gray-500 text-sm mt-1">Live system statistics — updates in real-time</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Entered</span>
            <UserCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-bold text-emerald-500">{data.totalEntered.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Occupancy</span>
            <Users className={`w-4 h-4 ${statusColor}`} />
          </div>
          <p className={`text-3xl font-bold ${statusColor}`}>{pct}%</p>
          <p className="text-xs text-gray-400 mt-1">{data.densityStatus} density</p>
        </div>
        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Alert Resolution</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-3xl font-bold text-orange-500">{alertResolutionRate}%</p>
          <p className="text-xs text-gray-400 mt-1">{data.resolvedAlerts} / {data.totalAlerts} resolved</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] p-6 rounded-2xl">
          <h3 className="font-semibold dark:text-white mb-4">Crowd Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={occupancyData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="opacity-60" />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="opacity-60" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="#10b981" />
                <Cell fill="#3b82f6" />
                <Cell fill="#374151" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] p-6 rounded-2xl">
          <h3 className="font-semibold dark:text-white mb-4">Alerts Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={alertData} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="opacity-10" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="opacity-60" />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} className="opacity-60" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                <Cell fill="#ef4444" />
                <Cell fill="#10b981" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
}
