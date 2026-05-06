import { useState, useEffect } from 'react';
import axios from 'axios';
import { socket } from '../services/socket';
import { UserCheck, UserMinus, Users, AlertTriangle, Activity, TrendingUp } from 'lucide-react';

const API = 'http://localhost:5000';

const STATUS_STYLES = {
  Low:      { bar: 'bg-emerald-500', text: 'text-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', ring: 'ring-emerald-500/30' },
  Medium:   { bar: 'bg-yellow-400',  text: 'text-yellow-400',  badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',   ring: 'ring-yellow-500/30'  },
  High:     { bar: 'bg-orange-500',  text: 'text-orange-400',  badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',   ring: 'ring-orange-500/30'  },
  Critical: { bar: 'bg-red-500',     text: 'text-red-400',     badge: 'bg-red-500/10 text-red-400 border-red-500/20',            ring: 'ring-red-500/30'     },
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEntered: 0, totalExited: 0, currentStrength: 0,
    capacity: 0, densityStatus: 'Low', activeAlerts: 0
  });
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadStats();
    loadAlerts();
    socket.connect();
    socket.on('zone-update', loadStats);
    socket.on('new-alert', (alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 8));
      loadStats();
    });
    return () => {
      socket.off('zone-update', loadStats);
      socket.off('new-alert');
    };
  }, []);

  const loadStats = async () => {
    try { const res = await axios.get(`${API}/api/stats`); setStats(res.data); }
    catch (err) { console.error(err.message); }
  };

  const loadAlerts = async () => {
    try { const res = await axios.get(`${API}/api/alerts`); setAlerts(res.data.slice(0, 8)); }
    catch (err) { console.error(err.message); }
  };

  const pct = stats.capacity > 0 ? Math.min(100, Math.round((stats.currentStrength / stats.capacity) * 100)) : 0;
  const s = STATUS_STYLES[stats.densityStatus] || STATUS_STYLES.Low;
  const isCritical = stats.densityStatus === 'Critical' || stats.densityStatus === 'High';

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-black">Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">Real-time crowd monitoring dashboard</p>
        </div>
        <span className={`inline-flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full border ${s.badge}`}>
          <Activity className="w-3 h-3" />
          {stats.densityStatus} Density
        </span>
      </div>

      {/* Critical Banner */}
      {isCritical && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
          <AlertTriangle className="w-5 h-5 shrink-0 animate-pulse" />
          <div>
            <p className="font-bold text-sm">Overcrowding Detected — {stats.densityStatus} Density</p>
            <p className="text-xs opacity-75 mt-0.5">{stats.currentStrength} people inside · {pct}% of capacity</p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Entered"
          value={stats.totalEntered}
          icon={<UserCheck className="w-4 h-4 text-emerald-500" />}
          valueClass="text-emerald-500"
          sub="Since session start"
        />
        <StatCard
          label="Total Exited"
          value={stats.totalExited}
          icon={<UserMinus className="w-4 h-4 text-blue-400" />}
          valueClass="text-blue-400"
          sub="Since session start"
        />
        <StatCard
          label="Inside Now"
          value={stats.currentStrength}
          icon={<Users className={`w-4 h-4 ${s.text}`} />}
          valueClass={s.text}
          sub={`${pct}% of capacity`}
        />
        <StatCard
          label="Active Alerts"
          value={stats.activeAlerts}
          icon={<AlertTriangle className="w-4 h-4 text-orange-400" />}
          valueClass="text-orange-400"
          sub="Unresolved events"
        />
      </div>

      {/* Capacity + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Capacity Gauge */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#222] rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold dark:text-white text-sm">Capacity Usage</h2>
            <span className={`text-xs font-bold ${s.text}`}>{pct}%</span>
          </div>

          {/* Circular gauge */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-gray-100 dark:text-[#222]" />
                <circle
                  cx="60" cy="60" r="50" fill="none" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                  strokeLinecap="round"
                  className={`transition-all duration-700 ${s.bar.replace('bg-', 'stroke-')}`}
                  style={{ stroke: pct >= 80 ? '#ef4444' : pct >= 60 ? '#f97316' : pct >= 40 ? '#facc15' : '#10b981' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${s.text}`}>{pct}%</span>
                <span className="text-xs text-gray-400 mt-0.5">{stats.densityStatus}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Current</span>
              <span className="font-semibold dark:text-white text-black">{stats.currentStrength.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Capacity</span>
              <span className="font-semibold dark:text-white text-black">{stats.capacity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Available</span>
              <span className="font-semibold text-emerald-500">{Math.max(0, stats.capacity - stats.currentStrength).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="lg:col-span-3 bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#222] rounded-2xl p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold dark:text-white text-sm">Recent Alerts</h2>
            {stats.activeAlerts > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{stats.activeAlerts} active</span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-gray-400 opacity-40">
              <TrendingUp className="w-8 h-8 mb-2" />
              <p className="text-sm">All clear — no alerts</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
              {alerts.map((alert) => (
                <div key={alert._id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-[#111] border border-gray-100 dark:border-[#222]">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${alert.status === 'Active' ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-gray-200 text-gray-800 truncate">{alert.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold uppercase ${alert.status === 'Active' ? 'text-red-400' : 'text-gray-400'}`}>{alert.status}</span>
                      <span className="text-[10px] text-gray-400">{new Date(alert.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

function StatCard({ label, value, icon, valueClass, sub }) {
  return (
    <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#222] rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <p className={`text-4xl font-bold ${valueClass}`}>{value.toLocaleString()}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}
