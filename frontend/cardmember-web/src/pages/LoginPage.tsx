import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/client';

export default function LoginPage({ onLogin }: { onLogin?: (user: any) => void }) {
  const [username, setUsername] = useState('alice');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setSubmitting(true);
      const res = await loginUser(username, password);
      localStorage.setItem('drp_user', JSON.stringify(res));
      if (onLogin) onLogin(res);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Invalid login credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 mx-auto flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-500/30">
            D
          </div>
          <h1 className="text-2xl font-extrabold text-white">Cardmember Portal Login</h1>
          <p className="text-xs text-slate-400">Sign in to manage transactions and dispute claims</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 text-sm"
          >
            {submitting ? 'Authenticating...' : 'Sign In as Cardmember'}
          </button>
        </form>

        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <span className="font-bold text-slate-300 block">Demo Credentials:</span>
          <p>• Username: <code className="text-indigo-300 font-mono">alice</code> or <code className="text-indigo-300 font-mono">cardmember</code></p>
          <p>• Password: <code className="text-indigo-300 font-mono">password123</code></p>
        </div>
      </div>
    </div>
  );
}
