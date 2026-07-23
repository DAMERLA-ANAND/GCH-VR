import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Placeholder Pages
const TransactionList = () => <div className="p-8"><h1 className="text-2xl font-bold text-brand-primary">Transaction History</h1><div className="glass-panel p-4 mt-4">Select a charge to dispute.</div></div>;
const DisputeForm = () => <div className="p-8"><h1 className="text-2xl font-bold text-brand-primary">File a Dispute</h1><div className="glass-panel p-4 mt-4">Form goes here.</div></div>;
const DisputeDetail = () => <div className="p-8"><h1 className="text-2xl font-bold text-brand-primary">Dispute Status</h1><div className="glass-panel p-4 mt-4">Timeline and Verdict.</div></div>;
const AppealForm = () => <div className="p-8"><h1 className="text-2xl font-bold text-brand-primary">Submit Appeal</h1><div className="glass-panel p-4 mt-4">Appeal form goes here.</div></div>;

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white">
        <nav className="p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md">
          <div className="max-w-7xl mx-auto flex gap-4">
            <span className="font-bold text-brand-primary">Cardmember Web</span>
            <Link to="/" className="hover:text-brand-accent transition-colors">History</Link>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<TransactionList />} />
            <Route path="/dispute/new/:transactionId" element={<DisputeForm />} />
            <Route path="/dispute/:disputeId" element={<DisputeDetail />} />
            <Route path="/dispute/:disputeId/appeal" element={<AppealForm />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
