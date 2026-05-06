import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Activity, LayoutGrid, Loader2 } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [role, setRole] = useState('Operator');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    
    if (isLogin) {
      const res = await login(username, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setError(res.message);
        setLoading(false);
      }
    } else {
      const res = await register(username, password, role);
      if (res.success) {
        setSuccessMsg('Account created successfully! You can now log in.');
        setIsLogin(true);
        setLoading(false);
      } else {
        setError(res.message);
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-black font-sans selection:bg-blue-500/30">
      <div className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none z-0">
         <div className="w-[800px] h-[600px] bg-blue-500/10 dark:bg-blue-500/5 blur-[120px] rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
      </div>
      
      <div className="flex w-full max-w-sm flex-col z-10 px-6 py-10 relative">
        <div className="mb-10 flex flex-col items-center">
          <div className="w-12 h-12 bg-black dark:bg-white rounded-xl shadow-xl flex items-center justify-center mb-6 ring-1 ring-black/5 dark:ring-white/10">
            <Activity className="w-6 h-6 text-white dark:text-black" />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2 tracking-tight">
             {isLogin ? 'Access CrowdPulse' : 'Join CrowdPulse'}
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
             {isLogin ? 'Enter your credentials to continue' : 'Create an operator account'}
          </p>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm mb-6 border border-red-100 dark:border-red-900 flex items-center font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 p-3 rounded-lg text-sm mb-6 border border-emerald-100 dark:border-emerald-900 flex items-center font-medium">
            {successMsg}
          </div>
        )}

        <div className="bg-white dark:bg-[#0a0a0a] rounded-2xl shadow-xl border border-gray-100 dark:border-[#222] p-6 lg:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm font-medium placeholder:text-gray-400"
                placeholder={isLogin ? "admin" : "new_user"}
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-black text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm font-medium placeholder:text-gray-400"
                placeholder="••••••••"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-black text-gray-900 dark:text-white text-sm font-medium">
                   <option value="Operator">Operator</option>
                   <option value="Admin">Admin</option>
                </select>
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black dark:bg-white text-white dark:text-black font-medium py-2.5 px-4 rounded-lg transition-all hover:scale-[1.02] hover:shadow-lg flex justify-center items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Log in →' : 'Register')}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
        
        {isLogin && (
          <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center space-x-2">
            <span>Demo Credentials: admin / password</span>
          </div>
        )}
      </div>
    </div>
  );
}
