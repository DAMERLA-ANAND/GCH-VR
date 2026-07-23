import { useEffect, useState } from 'react';
import { fetchReviewQueue, decideReview } from '../api/client';

export default function AdminAppeals() {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState<any | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await fetchReviewQueue();
      setAppeals(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleDecision = async (outcome: 'UPHELD' | 'OVERTURNED') => {
    if (!selectedAppeal) return;
    try {
      await decideReview(selectedAppeal.id, outcome, reviewNotes || `Operator review completed: ${outcome}`);
      setActionNotice(`Appeal ${selectedAppeal.id.substring(0, 8)} set to ${outcome}!`);
      setSelectedAppeal(null);
      setReviewNotes('');
      loadQueue();
    } catch (err) {
      console.error(err);
      setActionNotice('Failed to submit decision.');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Appeals Review Queue</h1>
        <p className="text-slate-400 text-xs mt-1">Review appealed verdicts and execute operator overrides or AI simulations</p>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-medium">
          {actionNotice}
        </div>
      )}

      {/* Queue Table */}
      <div className="glass-panel bg-slate-800/40 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-700/80 bg-slate-800/80 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Pending Appeals Queue</span>
          <span className="text-xs text-slate-400">Total: {appeals.length}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading appeal queue...</div>
        ) : appeals.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No pending appeals in queue.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider">
                <th className="p-4 font-semibold">Dispute ID</th>
                <th className="p-4 font-semibold">Reason</th>
                <th className="p-4 font-semibold">Filed Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs">
              {appeals.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-mono font-bold text-indigo-300">#{item.dispute_id.substring(0, 8)}</td>
                  <td className="p-4 italic text-slate-300">"{item.reason}"</td>
                  <td className="p-4 text-slate-400">{new Date(item.filed_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full font-bold bg-amber-500/10 border border-amber-500/20 text-amber-300">
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedAppeal(item)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-md font-semibold transition"
                    >
                      Review Case
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Case Review Modal / Detail View */}
      {selectedAppeal && (
        <div className="bg-slate-800/60 border-2 border-indigo-500/50 p-6 rounded-2xl space-y-6 shadow-2xl relative backdrop-blur-xl">
          <div className="flex justify-between items-start border-b border-slate-700 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Case Review: Dispute #{selectedAppeal.dispute_id.substring(0, 8)}</h2>
              <p className="text-xs text-slate-400 mt-1">Appeal ID: {selectedAppeal.id}</p>
            </div>
            <button onClick={() => setSelectedAppeal(null)} className="text-xs text-slate-400 hover:text-white">&times; Close</button>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
            <p><span className="text-slate-400">Cardmember Appeal Reason:</span> <strong className="text-slate-200">"{selectedAppeal.reason}"</strong></p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reviewer Notes:</label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Enter operator notes or findings..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => handleDecision('UPHELD')}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition"
            >
              UPHOLD Original Verdict
            </button>

            <button
              onClick={() => handleDecision('OVERTURNED')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition"
            >
              OVERTURN Verdict (Release Funds)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
