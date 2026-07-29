import { useState, useEffect } from 'react';
import { socket } from '../services/socket';
import apiService from '../services/apiService';
import { AlertTriangle, MapPin, Clock, CheckCircle } from 'lucide-react';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchAlerts();

    socket.connect();
    socket.on('new-alert', (alert) => {
      setAlerts(prev => [alert, ...prev]);
    });
    socket.on('alert-resolved', (updated) => {
      setAlerts(prev => prev.map(a => a._id === updated._id ? updated : a));
    });

    return () => {
      socket.off('new-alert');
      socket.off('alert-resolved');
    };
  }, []);

  const fetchAlerts = async () => {
    try {
      const data = await apiService.getAlerts();
      setAlerts(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      const updated = await apiService.resolveAlert(id);
      setAlerts(prev => prev.map(a => a._id === id ? updated : a));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredAlerts = alerts.filter(a => filter === 'All' || a.status === filter || a.severity === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-black">System Alerts</h1>
          <p className="text-gray-500 text-sm mt-1">Review critical events and threshold breaches</p>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Alerts</option>
            <option value="Active">Active Only</option>
            <option value="Critical">Critical Severity</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-[#111] border-b border-gray-200 dark:border-[#333]">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Severity</th>
                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Message</th>
                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Zone</th>
                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Timestamp</th>
                <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#222]">
              {loading ? (
                 <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Loading alerts data...</td>
                 </tr>
              ) : filteredAlerts.length === 0 ? (
                 <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No alerts found.</td>
                 </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert._id} className="hover:bg-gray-50/50 dark:hover:bg-[#111]/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        alert.status === 'Active' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20' : 'bg-gray-100 dark:bg-[#222] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-[#333]'
                      }`}>
                        {alert.status === 'Active' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>}
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold dark:text-white text-gray-900">{alert.severity}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 dark:text-gray-300">{alert.message}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-gray-500 dark:text-gray-400">
                        <MapPin className="w-4 h-4 mr-1 opacity-70" />
                        {alert.zoneId?.name || 'Unknown Zone'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1.5 opacity-70" />
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {alert.status === 'Active' && (
                        <button
                          onClick={() => handleResolve(alert._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
