import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

import AdminRules from './pages/AdminRules';
import AdminAppeals from './pages/AdminAppeals';
import DisputesDashboard from './pages/DisputesDashboard';
import DisputeReview from './pages/DisputeReview';

const Analytics = () => <div className="p-8"><h1 className="text-2xl font-bold text-brand-primary">Analytics</h1><div className="glass-panel p-4 mt-4">Charts and metrics.</div></div>;

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-white flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-700 bg-slate-800/50 backdrop-blur-md p-4 flex flex-col gap-4">
          <span className="font-bold text-brand-primary text-xl mb-4">Merchant Portal</span>
          <Link to="/" className="hover:text-brand-accent transition-colors">Dashboard</Link>
          <Link to="/admin/rules" className="hover:text-brand-accent transition-colors">Rule Engine</Link>
          <Link to="/admin/appeals" className="hover:text-brand-accent transition-colors">Appeals Queue</Link>
          <Link to="/analytics" className="hover:text-brand-accent transition-colors">Analytics</Link>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<DisputesDashboard />} />
            <Route path="/dispute/:disputeId" element={<DisputeReview />} />
            <Route path="/admin/rules" element={<AdminRules />} />
            <Route path="/admin/appeals" element={<AdminAppeals />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
