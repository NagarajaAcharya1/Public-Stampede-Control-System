import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, UserPlus, MapPin, Clock, SearchX, CheckCircle } from 'lucide-react';

export default function MissingPersons() {
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPerson, setNewPerson] = useState({ name: '', description: '', lastSeenZone: '' });
  const [zones, setZones] = useState([]);

  useEffect(() => {
    fetchPersons();
    fetchZones();
  }, []);

  const fetchPersons = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/missing-persons');
      setPersons(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/zones');
      setZones(res.data);
    } catch (err) {}
  };

  const handleAddPerson = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/missing-persons', newPerson);
      setIsModalOpen(false);
      setNewPerson({ name: '', description: '', lastSeenZone: '' });
      fetchPersons();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkFound = async (id) => {
    try {
      const res = await axios.patch(`http://localhost:5000/api/missing-persons/${id}/found`);
      setPersons(prev => prev.map(p => p._id === id ? res.data : p));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPersons = persons.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight dark:text-white text-black">Missing Persons</h1>
          <p className="text-gray-500 text-sm mt-1">Track and manage reports of missing individuals</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-transform font-medium px-4 py-2 rounded-lg text-sm flex items-center shadow-md shadow-black/10 dark:shadow-white/10"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Report Missing Person
        </button>
      </div>

      <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-[#333] flex items-center bg-gray-50/50 dark:bg-[#111]/50">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm dark:text-white placeholder:text-gray-400"
          />
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-[#222]">
           {loading ? (
             <div className="p-8 text-center text-gray-500">Loading records...</div>
           ) : filteredPersons.length === 0 ? (
             <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
               <div className="bg-gray-100 dark:bg-[#222] p-4 rounded-full mb-4">
                 <SearchX className="w-8 h-8 opacity-50" />
               </div>
               <p className="font-medium">No records found</p>
               <p className="text-sm opacity-70 mt-1">No missing persons match your search.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {filteredPersons.map(person => (
                  <div key={person._id} className="border border-gray-200 dark:border-[#333] rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-500 transition-colors bg-gray-50/50 dark:bg-[#111]/30 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg dark:text-white">{person.name}</h3>
                      <span className={`px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${
                        person.status === 'Missing' ? 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50' : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                      }`}>
                        {person.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 flex-1 mb-4">
                      {person.description || 'No specific description provided.'}
                    </p>
                    <div className="pt-4 border-t border-gray-200 dark:border-[#333] space-y-2 mt-auto">
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="truncate">Last Seen: {person.lastSeenZone?.name || 'Unknown Location'}</span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Reported: {new Date(person.createdAt).toLocaleDateString()}</span>
                      </div>
                      {person.status === 'Missing' && (
                        <button
                          onClick={() => handleMarkFound(person._id)}
                          className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Mark as Found
                        </button>
                      )}
                    </div>
                  </div>
                ))}
             </div>
           )}
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-[#333]">
              <h2 className="text-xl font-bold dark:text-white">Report Missing Person</h2>
            </div>
            <form onSubmit={handleAddPerson} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Full Name</label>
                <input required type="text" value={newPerson.name} onChange={e => setNewPerson({...newPerson, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-[#333] rounded-lg bg-white dark:bg-[#111] text-sm dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Description / Appearance</label>
                <textarea rows="3" value={newPerson.description} onChange={e => setNewPerson({...newPerson, description: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-[#333] rounded-lg bg-white dark:bg-[#111] text-sm dark:text-white resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Last Seen Zone</label>
                <select value={newPerson.lastSeenZone} onChange={e => setNewPerson({...newPerson, lastSeenZone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-[#333] rounded-lg bg-white dark:bg-[#111] text-sm dark:text-white">
                  <option value="">Select a zone...</option>
                  {zones.map(z => (
                    <option key={z._id} value={z._id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 px-4 border border-gray-200 dark:border-[#333] rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#111] transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 px-4 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:scale-[1.02] transition-transform">Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
