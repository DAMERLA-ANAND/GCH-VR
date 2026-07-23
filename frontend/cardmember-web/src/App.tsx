import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import TransactionHistory from './pages/TransactionHistory';
import DisputeWizard from './pages/DisputeWizard';
import DisputeDetail from './pages/DisputeDetail';
import AppealForm from './pages/AppealForm';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Navigation */}
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

            <div className="flex items-center gap-3">
              <span className="text-xs bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full font-mono font-medium">
                Cardmember Portal
              </span>
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                AC
              </div>
            </div>
          </div>
        </header>

        {/* Main View */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<TransactionHistory />} />
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
