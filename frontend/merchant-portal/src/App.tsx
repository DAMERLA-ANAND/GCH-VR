import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import AdminRules from './pages/AdminRules';
import AdminAppeals from './pages/AdminAppeals';
import DisputesDashboard from './pages/DisputesDashboard';
import DisputeReview from './pages/DisputeReview';
import AdminPortal from './pages/AdminPortal';
import LoginPage from './pages/LoginPage';

const Analytics = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold text-white">Platform Analytics</h1>
    <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700 mt-4 text-xs text-slate-300">
      Dispute resolution throughput, Gemini AI confidence distributions, and chargeback metrics.
    </div>
  </div>
);

function App() {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('drp_merchant_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('drp_merchant_user');
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900/80 backdrop-blur-xl p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/30">
                M
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">Merchant Portal</span>
            </div>

            {user && (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Active Account</span>
                <p className="font-medium text-white text-xs truncate mt-0.5">{user.display_name}</p>
                <span className="text-[10px] font-mono text-indigo-400 font-bold">{user.role}</span>
              </div>
            )}

            <nav className="flex flex-col gap-2 text-xs font-semibold text-slate-300">
              <Link to="/" className="p-2.5 rounded-xl hover:bg-slate-800 hover:text-indigo-300 transition">
                📊 Dispute Dashboard
              </Link>
              <Link to="/admin" className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition">
                ⚡ Admin Command Portal
              </Link>
              <Link to="/admin/rules" className="p-2.5 rounded-xl hover:bg-slate-800 hover:text-indigo-300 transition">
                ⚙️ Rule Authoring Console
              </Link>
              <Link to="/admin/appeals" className="p-2.5 rounded-xl hover:bg-slate-800 hover:text-indigo-300 transition">
                ⚖️ Appeals Review Queue
              </Link>
              <Link to="/analytics" className="p-2.5 rounded-xl hover:bg-slate-800 hover:text-indigo-300 transition">
                📈 Platform Analytics
              </Link>
            </nav>
          </div>

          <div className="border-t border-slate-800 pt-4">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full text-xs py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 font-semibold transition"
              >
                Sign Out
              </button>
            ) : (
              <Link
                to="/login"
                className="block text-center text-xs py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow"
              >
                Sign In
              </Link>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<DisputesDashboard />} />
            <Route path="/login" element={<LoginPage onLogin={(u) => setUser(u)} />} />
            <Route path="/admin" element={<AdminPortal />} />
            <Route path="/dispute/:disputeId" element={<DisputeReview />} />
            <Route path="/admin/rules" element={<AdminRules />} />
            <Route path="/admin/appeals" element={<AdminAppeals />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
