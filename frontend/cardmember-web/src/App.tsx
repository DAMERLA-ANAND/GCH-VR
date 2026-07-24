import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TransactionHistory from './pages/TransactionHistory';
import DisputeWizard from './pages/DisputeWizard';
import DisputeDetail from './pages/DisputeDetail';
import AppealForm from './pages/AppealForm';
import LoginPage from './pages/LoginPage';

function NavigationHeader({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/30">
              D
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">Dispute<span className="text-indigo-400">Hub</span></span>
          </Link>

          <nav className="flex gap-6 text-sm font-medium text-slate-400">
            <Link to="/" className="hover:text-indigo-400 transition-colors">Transactions</Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-mono font-medium">
            {user ? `${user.display_name} (${user.role})` : 'Cardmember Portal'}
          </span>
          {user ? (
            <button
              onClick={onLogout}
              className="text-xs px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
            >
              Sign Out
            </button>
          ) : (
            <Link
              to="/login"
              className="text-xs px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function App() {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('drp_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('drp_user');
    setUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <NavigationHeader user={user} onLogout={handleLogout} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<TransactionHistory />} />
            <Route path="/login" element={<LoginPage onLogin={(u) => setUser(u)} />} />
            <Route path="/dispute/new/:transactionId" element={<DisputeWizard />} />
            <Route path="/dispute/:disputeId" element={<DisputeDetail />} />
            <Route path="/dispute/:disputeId/appeal" element={<AppealForm />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
