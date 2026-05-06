import { useState, useEffect } from 'react';
import axios from 'axios';
import { socket } from '../services/socket';
import { MapPin, ArrowRight, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Zones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchZones();
    
    socket.connect();
    socket.on('zone-update', (updatedZone) => {
      setZones(prev => prev.map(z => z._id === updatedZone._id ? updatedZone : z));
    });

    return () => {
      socket.off('zone-update');
    };
  }, []);

  const fetchZones = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/zones');
      setZones(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const getDensityColor = (status) => {
    switch(status) {
      case 'Critical': return 'from-red-500 to-rose-600 bg-red-500 text-white';
      case 'High': return 'from-orange-400 to-orange-500 bg-orange-500 text-white';
      case 'Medium': return 'from-yellow-400 to-yellow-500 bg-yellow-500 text-slate-900';
      case 'Low': 
      default: return 'from-emerald-400 to-emerald-500 bg-emerald-500 text-white';
    }
  };

if (loading) return <div className="animate-pulse flex gap-6 flex-wrap"><div className="h-48 w-full md:w-80 bg-gray-200 dark:bg-slate-800 rounded-2xl"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zones Monitoring</h1>
          <p className="text-gray-500 mt-1">Live feed from all access points</p>
        </div>
        <button className="flex items-center glass-panel px-4 py-2 rounded-lg text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <Settings2 className="w-4 h-4 mr-2" /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {zones.map((zone) => {
            const pct = Math.min(100, Math.round((zone.currentOccupancy / zone.capacity) * 100));
            const colorClass = getDensityColor(zone.densityStatus);
            
            return (
              <motion.div 
                key={zone._id}
                layoutId={zone._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl overflow-hidden flex flex-col group"
              >
                {/* Header Profile */}
                <div className={`p-4 bg-gradient-to-br ${colorClass.split(' ').slice(0,2).join(' ')} ${colorClass.split(' ')[3]} relative`}>
                  <div className="flex justify-between items-start z-10 relative">
                    <h3 className="font-semibold text-lg max-w-[70%] truncate">{zone.name}</h3>
                    <div className="bg-white/20 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                      {zone.densityStatus}
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold">{zone.currentOccupancy}</span>
                    <span className="opacity-80 ml-1 text-sm">/ {zone.capacity}</span>
                  </div>
                </div>

                {/* Progress Bar Area */}
                <div className="px-5 py-4 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                    <span>Occupancy Level</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ type: "spring", stiffness: 50 }}
                      className={`h-full ${colorClass.split(' ')[2]} rounded-full`}
                    />
                  </div>
                </div>

              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
