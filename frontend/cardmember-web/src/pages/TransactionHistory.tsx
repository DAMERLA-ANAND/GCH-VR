import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDisputes, seedDemoData } from '../api/client';
import type { DisputeSummary } from '../api/client';



interface MockTransaction {
  id: string;
  merchant: string;
  amount: number;
  date: string;
  category: string;
}

const mockTransactions: MockTransaction[] = [
  { id: 'tok_visa_txn_998877', merchant: 'TechStore Online', amount: 149.99, date: '2026-07-10', category: 'NON_DELIVERY' },
  { id: 'tok_abc123', merchant: 'Sneaker World', amount: 210.00, date: '2026-07-12', category: 'NON_DELIVERY' },
  { id: 'tok_demo_unauthorized', merchant: 'Unknown Vendor NYC', amount: 89.50, date: '2026-07-15', category: 'UNAUTHORIZED_CHARGE' },
];

export default function TransactionHistory() {
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchDisputes();
      if (data.items.length === 0) {
        await seedDemoData();
        const reloaded = await fetchDisputes();
        setDisputes(reloaded.items);
      } else {
        setDisputes(data.items);
      }
    } catch (err) {
      console.error('Failed to load disputes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Recent Transactions</h1>
          <p className="text-slate-400 text-sm mt-1">Select a charge to inspect details or file a dispute</p>
        </div>
        <button
          onClick={loadData}
          className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-md border border-slate-700 transition"
        >
          Refresh Data
        </button>
      </div>

      {/* Transactions List */}
      <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl mb-10">
        <div className="px-6 py-4 border-b border-slate-700/80 bg-slate-800/80 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Cardmember Account • ••• 4419</span>
          <span className="text-xs text-slate-400">Showing last 30 days</span>
        </div>
        <div className="divide-y divide-slate-700/50">
          {mockTransactions.map((txn) => {
            const existing = disputes.find(d => d.amount === txn.amount);
            return (
              <div key={txn.id} className="p-5 flex items-center justify-between hover:bg-slate-800/40 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg">
                    {txn.merchant.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{txn.merchant}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">{txn.date} • Ref: {txn.id}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <span className="font-mono text-lg font-bold text-white">${txn.amount.toFixed(2)}</span>
                  {existing ? (
                    <Link
                      to={`/dispute/${existing.id}`}
                      className="bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs px-3 py-1.5 rounded-full font-medium hover:bg-indigo-500/30 transition flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                      View Dispute ({existing.status})
                    </Link>
                  ) : (
                    <Link
                      to={`/dispute/new/${txn.id}?amount=${txn.amount}&category=${txn.category}`}
                      className="bg-slate-700 hover:bg-indigo-600 text-white text-xs px-3.5 py-1.5 rounded-lg transition font-medium shadow"
                    >
                      Dispute Charge
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Disputes Summary */}
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        Active Disputes ({disputes.length})
      </h2>
      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading dispute records...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {disputes.map((dispute) => (
            <Link
              key={dispute.id}
              to={`/dispute/${dispute.id}`}
              className="bg-slate-800/40 border border-slate-700/60 p-5 rounded-xl hover:border-indigo-500/50 transition group shadow-lg"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                    {dispute.category}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">Filed on {new Date(dispute.filed_at).toLocaleDateString()}</p>
                </div>
                <span className="text-lg font-bold font-mono text-emerald-400">${dispute.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center border-t border-slate-700/40 pt-3">
                <span className="text-xs font-medium text-slate-300">Status: <strong className="text-indigo-400">{dispute.status}</strong></span>
                <span className="text-xs text-indigo-400 group-hover:translate-x-1 transition-transform">Details &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
