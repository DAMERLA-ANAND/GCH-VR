import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMerchantDisputes, seedDemoData } from '../api/client';

export default function DisputesDashboard() {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetchMerchantDisputes(undefined, categoryFilter || undefined);
      if (res.items.length === 0) {
        await seedDemoData();
        const reloaded = await fetchMerchantDisputes(undefined, categoryFilter || undefined);
        setDisputes(reloaded.items);
      } else {
        setDisputes(res.items);
      }
    } catch (err) {
      console.error('Failed to load merchant disputes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [categoryFilter]);

  const pendingDisputes = disputes.filter(d => d.status === 'FILED' || d.status === 'EVIDENCE_COLLECTION');
  const resolvedDisputes = disputes.filter(d => d.status === 'VERDICT_ISSUED' || d.status === 'CLOSED');

  const getRemainingTime = (deadlineStr: string) => {
    const diff = new Date(deadlineStr).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Disputes Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Merchant Account: TechStore Merchant • Active Monitoring</p>
        </div>

        <div className="flex gap-3">
          <select
            value={categoryFilter || ''}
            onChange={(e) => setCategoryFilter(e.target.value || null)}
            className="bg-slate-800 border border-slate-700 text-xs px-3 py-2 rounded-lg text-slate-200 focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="NON_DELIVERY">Non-Delivery</option>
            <option value="UNAUTHORIZED_CHARGE">Unauthorized Charge</option>
          </select>

          <button
            onClick={loadData}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-lg font-medium transition shadow-lg shadow-indigo-500/20"
          >
            Refresh Dashboard
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Evidence Card */}
        <div className="glass-panel p-6 border-t-4 border-amber-500 bg-slate-800/40 rounded-2xl border border-slate-700/80 shadow-xl space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Pending Evidence Window</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold">Action Req</span>
          </div>
          {pendingDisputes.length > 0 ? (
            <div>
              <p className="text-4xl font-mono font-bold text-amber-400">
                {getRemainingTime(pendingDisputes[0].evidence_deadline)}
              </p>
              <p className="text-xs text-slate-300 mt-2 font-medium">
                Dispute #{pendingDisputes[0].id.substring(0, 8)} (${pendingDisputes[0].amount})
              </p>
              <Link
                to={`/dispute/${pendingDisputes[0].id}`}
                className="mt-4 block text-center bg-slate-700/80 hover:bg-slate-700 text-xs font-semibold py-2 rounded-lg text-white transition"
              >
                Respond & Upload Proof &rarr;
              </Link>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No disputes awaiting merchant evidence.</p>
          )}
        </div>

        {/* Total Active Cases Card */}
        <div className="glass-panel p-6 border-t-4 border-indigo-500 bg-slate-800/40 rounded-2xl border border-slate-700/80 shadow-xl space-y-3">
          <h2 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Total Active Cases</h2>
          <p className="text-4xl font-mono font-bold text-indigo-400">{disputes.length}</p>
          <p className="text-xs text-slate-400">Across {categoryFilter || 'all'} dispute categories</p>
        </div>

        {/* Recently Resolved Card */}
        <div className="glass-panel p-6 border-t-4 border-emerald-500 bg-slate-800/40 rounded-2xl border border-slate-700/80 shadow-xl space-y-3">
          <h2 className="font-bold text-slate-200 text-sm uppercase tracking-wider">Recently Resolved</h2>
          <div className="space-y-2">
            {resolvedDisputes.slice(0, 3).map((d) => (
              <div key={d.id} className="flex justify-between items-center text-xs pb-2 border-b border-slate-700/50">
                <span className="font-mono text-slate-300">#{d.id.substring(0, 8)}</span>
                <span className={`font-bold ${d.verdict?.outcome === 'MERCHANT_WIN' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {d.verdict?.outcome === 'MERCHANT_WIN' ? 'Won' : 'Lost'}
                </span>
              </div>
            ))}
            {resolvedDisputes.length === 0 && (
              <p className="text-xs text-slate-400">No resolved disputes yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Disputes Table */}
      <div className="glass-panel bg-slate-800/40 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-700/80 bg-slate-800/80 flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Incoming Dispute Claims</span>
          <span className="text-xs text-slate-400">Showing {disputes.length} records</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading dispute claims...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider">
                <th className="p-4 font-semibold">Dispute ID</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Filed Date</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 text-xs">
              {disputes.map((dispute) => (
                <tr key={dispute.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-4 font-mono font-bold text-indigo-300">#{dispute.id.substring(0, 8)}</td>
                  <td className="p-4"><span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono">{dispute.category}</span></td>
                  <td className="p-4 font-mono font-bold text-white">${dispute.amount.toFixed(2)}</td>
                  <td className="p-4 text-slate-400">{new Date(dispute.filed_at).toLocaleDateString()}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 rounded-full font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      {dispute.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      to={`/dispute/${dispute.id}`}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md font-semibold transition"
                    >
                      Review Claim
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
