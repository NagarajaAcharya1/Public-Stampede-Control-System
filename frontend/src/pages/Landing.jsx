import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, Zap, BarChart } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white font-sans selection:bg-emerald-500/30">
      <nav className="fixed w-full top-0 z-50 border-b border-gray-100 dark:border-[#222] bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-black dark:bg-white rounded flex items-center justify-center">
               <Activity className="w-5 h-5 text-white dark:text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">CrowdPulse</span>
          </div>
          <div>
            <Link to="/login" className="px-4 py-2 text-sm font-medium hover:text-emerald-500 transition-colors">Sign in</Link>
            <Link to="/login" className="ml-4 px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-lg hover:scale-105 transition-transform shadow-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-16 px-6 max-w-7xl mx-auto text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/20 dark:bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none -m-10"></div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-8 leading-tight relative z-10">
          Public safety, <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">amplified.</span>
        </h1>
        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12 relative z-10">
          Advanced real-time IoT crowd monitoring system. Detect density anomalies, 
          predict stampedes before they happen, and streamline public safety zones.
        </p>
        
        <div className="flex justify-center flex-wrap gap-4 relative z-10">
          <Link to="/login" className="px-8 py-3.5 bg-black dark:bg-white text-white dark:text-black rounded-xl font-semibold shadow-xl hover:scale-[1.02] transition-transform">
             Deploy Dashboard
          </Link>
          <a href="#features" className="px-8 py-3.5 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-xl font-semibold hover:bg-gray-100 dark:hover:bg-[#222] transition-colors">
             Learn Workflow
          </a>
        </div>

        <div id="features" className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 text-left relative z-10">
          <div className="p-8 border border-gray-100 dark:border-[#222] rounded-2xl bg-white dark:bg-[#111]">
             <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
             </div>
             <h3 className="text-xl font-semibold mb-3 tracking-tight">Real-Time Sync</h3>
             <p className="text-gray-500 dark:text-gray-400">WebSockets and IoT micro-controllers instantly push foot-traffic data directly to the live dashboard.</p>
          </div>
          <div className="p-8 border border-gray-100 dark:border-[#222] rounded-2xl bg-white dark:bg-[#111]">
             <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
             </div>
             <h3 className="text-xl font-semibold mb-3 tracking-tight">Predictive Alerts</h3>
             <p className="text-gray-500 dark:text-gray-400">Intelligent density calculating mechanisms automatically alert operators at 80% maximum capacity breaches.</p>
          </div>
          <div className="p-8 border border-gray-100 dark:border-[#222] rounded-2xl bg-white dark:bg-[#111]">
             <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-6">
                <BarChart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
             </div>
             <h3 className="text-xl font-semibold mb-3 tracking-tight">Historical KPIs</h3>
             <p className="text-gray-500 dark:text-gray-400">Track and manage missing individuals while visualizing macroscopic crowd progression flows.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
