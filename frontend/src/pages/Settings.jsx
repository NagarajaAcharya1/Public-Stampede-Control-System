import { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { Settings as SettingsIcon, Save, Plus, Trash2, ShieldAlert } from 'lucide-react';

export default function Settings() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCapacity, setNewZoneCapacity] = useState('');

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const data = await apiService.getZones();
      setZones(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleAddZone = async (e) => {
    e.preventDefault();
    if (!newZoneName || !newZoneCapacity) return;
    try {
      await apiService.createZone({
        name: newZoneName,
        capacity: parseInt(newZoneCapacity, 10),
        densityStatus: 'Low',
        colorCode: 'green',
        currentOccupancy: 0
      });
      setNewZoneName('');
      setNewZoneCapacity('');
      fetchZones();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteZone = async (id) => {
    if (!confirm('Warning: Deleting a zone removes it permanently. Continue?')) return;
    try {
      await apiService.deleteZone(id);
      fetchZones();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAlerts = async () => {
    if (!confirm('Warning: This clears all alerts in the system. Continue?')) return;
    try {
      await apiService.clearAlerts();
      alert('Alerts cleared successfully!');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight dark:text-white text-black flex items-center">
          <SettingsIcon className="w-6 h-6 mr-3 text-gray-400" /> System Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">Configure zones and alert thresholds</p>
      </div>

      <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-[#333] bg-gray-50/50 dark:bg-[#111]/50">
          <h2 className="font-semibold text-lg dark:text-white flex items-center">
             Manage Deployment Zones
          </h2>
          <p className="text-gray-500 text-sm mt-1">Add or remove entry points monitored by the system</p>
        </div>
        
        <div className="p-6 space-y-6">
          <form onSubmit={handleAddZone} className="flex flex-col sm:flex-row gap-4 border-b border-gray-100 dark:border-[#222] pb-6">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Zone Name</label>
              <input type="text" placeholder="e.g. VIP Entrance" value={newZoneName} onChange={e => setNewZoneName(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-[#333] rounded-lg bg-white dark:bg-[#111] text-sm dark:text-white" />
            </div>
            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Capacity</label>
              <input type="number" placeholder="Max persons" value={newZoneCapacity} onChange={e => setNewZoneCapacity(e.target.value)} className="w-full px-3 py-2 border border-gray-200 dark:border-[#333] rounded-lg bg-white dark:bg-[#111] text-sm dark:text-white" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={!newZoneName || !newZoneCapacity} className="w-full sm:w-auto h-10 px-4 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:scale-[1.02] transition-transform disabled:opacity-50">
                <Plus className="w-4 h-4 mr-2" />
                Add Zone
              </button>
            </div>
          </form>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Active Zones</label>
            {loading ? <div className="text-sm text-gray-500">Loading...</div> : (
              <div className="space-y-3">
                {zones.map(zone => (
                  <div key={zone._id} className="flex justify-between items-center p-4 border border-gray-200 dark:border-[#333] rounded-xl bg-gray-50 dark:bg-[#111]">
                    <div>
                      <p className="font-semibold text-sm dark:text-white">{zone.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Capacity: {zone.capacity} persons</p>
                    </div>
                    <button onClick={() => handleDeleteZone(zone._id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-200 dark:hover:bg-[#222] rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl shadow-sm overflow-hidden p-6">
        <h2 className="font-semibold text-lg text-red-600 dark:text-red-400 flex items-center mb-2">
          <ShieldAlert className="w-5 h-5 mr-2" /> Danger Zone
        </h2>
        <p className="text-red-500 text-sm mb-4 opacity-80">This action will clear all live alert history from the database. It cannot be undone.</p>
        <button onClick={handleClearAlerts} className="bg-red-500 text-white font-medium px-4 py-2 rounded-lg text-sm shadow-md shadow-red-500/20 flex items-center hover:bg-red-600 transition-colors">
          <Trash2 className="w-4 h-4 mr-2" /> Clear All Alerts
        </button>
      </div>
    </div>
  );
}
