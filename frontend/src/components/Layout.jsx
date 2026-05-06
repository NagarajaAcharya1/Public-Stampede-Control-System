import { useState, useContext, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Activity, LayoutDashboard, AlertTriangle, Settings, LogOut, Sun, Moon, Menu } from 'lucide-react';

export default function Layout() {
  const { user, logout, updateProfile } = useContext(AuthContext);
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ newUsername: '', newPassword: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const location = useLocation();

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', path: '/dashboard/analytics', icon: Activity },
    { name: 'Alerts', path: '/dashboard/alerts', icon: AlertTriangle },
  ];

  if (user?.role === 'Admin') {
    navItems.push({ name: 'Settings', path: '/dashboard/settings', icon: Settings });
  }

  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    const res = await updateProfile(user.username, profileForm.newUsername || undefined, profileForm.newPassword || undefined);
    if (res.success) {
      setProfileMsg('Profile updated successfully!');
      setTimeout(() => { setIsProfileModalOpen(false); setProfileMsg(''); }, 1500);
    } else {
      setProfileMsg(`Error: ${res.message}`);
    }
  };

  return (
    <div className={`min-h-screen flex transition-colors duration-300 dark:bg-[#000] bg-gray-50 text-slate-900 dark:text-gray-100`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-[#0a0a0a] border-r border-gray-200 dark:border-[#333] transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out md:relative flex-shrink-0`}>
        <div className="flex items-center px-6 h-16 border-b border-gray-200 dark:border-[#333]">
          <Activity className="w-5 h-5 dark:text-white text-black mr-3" />
          <h1 className="text-lg font-bold tracking-tight">CrowdPulse</h1>
        </div>
        <div className="p-4 flex flex-col h-[calc(100vh-4rem)] justify-between">
          <nav className="space-y-1 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md transition-colors duration-200 text-sm font-medium ${
                    isActive 
                      ? 'bg-gray-100 dark:bg-[#222] text-black dark:text-white' 
                      : 'text-gray-500 dark:text-[#888] hover:bg-gray-50 dark:hover:bg-[#111] hover:text-black dark:hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-4 h-4 mr-3 opacity-70" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mb-2">
            <button 
              onClick={() => { setProfileForm({ newUsername: user?.username, newPassword: '' }); setIsProfileModalOpen(true); }}
              className="w-full flex items-center px-3 py-2 rounded-md border border-gray-200 dark:border-[#222] hover:border-gray-300 dark:hover:border-[#444] bg-gray-50 dark:bg-[#111] transition-colors mb-2 text-left"
            >
              <div className="w-8 h-8 rounded-md bg-white dark:bg-[#222] border border-gray-200 dark:border-[#333] flex items-center justify-center text-black dark:text-white font-bold mr-3 text-xs shrink-0">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold truncate dark:text-white text-black">{user?.username}</p>
                <p className="text-[10px] text-gray-500">{user?.role} · Edit</p>
              </div>
            </button>
            <button 
              onClick={logout}
              className="flex w-full items-center px-3 py-2 rounded-md text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4 mr-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white/80 dark:bg-[#000]/80 backdrop-blur-md flex items-center justify-between px-8 z-40 sticky top-0 border-b border-gray-200 dark:border-[#333]">
          <div className="flex items-center">
            <button 
              className="md:hidden mr-4 p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-[#111] text-gray-500"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center text-sm font-medium text-gray-500">
               <span className="opacity-0 md:opacity-100 hidden md:inline">Dashboard</span>
               <span className="mx-2 hidden md:inline">/</span>
               <span className="text-black dark:text-white capitalize">{location.pathname.replace('/dashboard', '').replace('/', '') || 'Overview'}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleDarkMode} className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-[#222] text-gray-500 transition-colors border border-transparent dark:hover:border-[#333]">
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {/* Status indicator */}
            <div className="flex items-center px-2 py-1 rounded-md bg-green-50 dark:bg-[#051F10] text-green-600 dark:text-green-500 text-[10px] uppercase tracking-wider font-bold border border-green-200 dark:border-green-900 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Live
            </div>
          </div>
        </header>

        {/* Main scrollable area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto w-full p-8 hero-gradient">
          <div className="max-w-[1200px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Profile Edit Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 text-left" onClick={() => setIsProfileModalOpen(false)}>
          <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-[#333] rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-[#333]">
              <h2 className="text-lg font-bold dark:text-white">Edit Profile</h2>
            </div>
            <form onSubmit={handleProfileUpdate} className="p-6 space-y-4 text-sm">
              {profileMsg && <div className="text-emerald-500 mb-2 font-medium">{profileMsg}</div>}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Username</label>
                <input type="text" value={profileForm.newUsername} onChange={e => setProfileForm({...profileForm, newUsername: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-[#333] rounded-lg bg-white dark:bg-[#111] dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">New Password (optional)</label>
                <input type="password" placeholder="Leave blank to keep current" value={profileForm.newPassword} onChange={e => setProfileForm({...profileForm, newPassword: e.target.value})} className="w-full px-3 py-2 border border-gray-200 dark:border-[#333] rounded-lg bg-white dark:bg-[#111] dark:text-white" />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-2 px-4 border border-gray-200 dark:border-[#333] rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-[#111] transition-colors">Cancel</button>
                <button type="submit" className="flex-1 py-2 px-4 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:scale-[1.02] transition-transform">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
