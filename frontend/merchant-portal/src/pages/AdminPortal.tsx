import { useEffect, useState } from 'react';
import {
  fetchMerchantDisputes,
  fetchAdminCategories,
  createCategory,
  deleteCategory,
  advanceDisputeStatus,
  fetchAdminTelemetry,
  fetchDisputeDetail,
} from '../api/client';

export default function AdminPortal() {
  const [categories, setCategories] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Category creation state
  const [catCode, setCatCode] = useState('');
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  // Inspector & State Override state
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [selectedDisputeDetail, setSelectedDisputeDetail] = useState<any | null>(null);
  const [overrideStatus, setOverrideStatus] = useState('UNDER_REVIEW');
  const [overrideOutcome, setOverrideOutcome] = useState('CARDMEMBER_WIN');
  const [overrideReason, setOverrideReason] = useState('Manual verdict issued by Admin platform override.');
  const [submittingOverride, setSubmittingOverride] = useState(false);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [catsRes, disputesRes, telemRes] = await Promise.all([
        fetchAdminCategories(),
        fetchMerchantDisputes(),
        fetchAdminTelemetry(),
      ]);
      setCategories(catsRes.categories || []);
      setDisputes(disputesRes.items || []);
      setTelemetry(telemRes.audit_events || []);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catCode.trim() || !catName.trim()) return;
    try {
      setCreatingCat(true);
      await createCategory(catCode, catName, catDesc);
      setNotice(`Dynamic category '${catCode.toUpperCase()}' created in database!`);
      setCatCode('');
      setCatName('');
      setCatDesc('');
      loadAdminData();
    } catch (err) {
      console.error(err);
      setNotice('Failed to create category.');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleDeleteCategory = async (code: string) => {
    try {
      await deleteCategory(code);
      setNotice(`Category '${code}' deactivated.`);
      loadAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInspectDispute = async (id: string) => {
    setSelectedDisputeId(id);
    try {
      const detail = await fetchDisputeDetail(id);
      setSelectedDisputeDetail(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleForceAdvanceStatus = async () => {
    if (!selectedDisputeId) return;
    try {
      setSubmittingOverride(true);
      await advanceDisputeStatus(selectedDisputeId, overrideStatus, overrideOutcome, overrideReason);
      setNotice(`Dispute #${selectedDisputeId.substring(0, 8)} status advanced to ${overrideStatus}!`);
      handleInspectDispute(selectedDisputeId);
      loadAdminData();
    } catch (err) {
      console.error(err);
      setNotice('Failed to advance dispute status.');
    } finally {
      setSubmittingOverride(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Loading Admin Command Portal...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-700/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">Platform Admin Portal</h1>
            <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Superuser Mode
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-1">
            Dynamic DB Category Management • Gemini 2.5 Flash AI Inspector • Manual State Overrides
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-4 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs rounded-xl font-medium">
          {notice}
        </div>
      )}

      {/* Grid: Category Builder & State Override Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* DYNAMIC CATEGORY CREATOR */}
        <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-6 shadow-xl">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>⚡ Dynamic DB Category Creator</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Add custom dispute categories live into the database schema.</p>
          </div>

          <form onSubmit={handleCreateCategory} className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category Code (Unique Identifier)</label>
              <input
                type="text"
                placeholder="e.g. DAMAGED_GOODS, INCORRECT_AMOUNT"
                value={catCode}
                onChange={(e) => setCatCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Display Name</label>
              <input
                type="text"
                placeholder="e.g. Damaged or Defective Items"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</label>
              <textarea
                rows={2}
                placeholder="Describe arbitration criteria for this dispute category..."
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={creatingCat}
              className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg transition disabled:opacity-50"
            >
              {creatingCat ? 'Saving to Database...' : 'Create Dynamic Category'}
            </button>
          </form>

          {/* Active Categories List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Active Database Categories ({categories.length}):</span>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {categories.map((cat) => (
                <div key={cat.code} className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono text-indigo-300 font-bold">{cat.code}</span>
                    <p className="text-slate-300 font-medium">{cat.display_name}</p>
                  </div>
                  {cat.is_active && (
                    <button
                      onClick={() => handleDeleteCategory(cat.code)}
                      className="text-[10px] text-red-400 hover:underline px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* STATE OVERRIDE & AI REASONING INSPECTOR */}
        <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-6 shadow-xl">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🧠 Gemini AI Reasoning Inspector & Override</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Inspect Gemini AI evaluation summaries & force dispute status progression.</p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Select Dispute to Inspect:</label>
            <select
              value={selectedDisputeId || ''}
              onChange={(e) => handleInspectDispute(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">-- Choose a dispute --</option>
              {disputes.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.id.substring(0, 8)} - {d.category} (${d.amount.toFixed(2)}) [{d.status}]
                </option>
              ))}
            </select>
          </div>

          {selectedDisputeDetail && (
            <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
              {/* Verdict & Gemini AI Reasoning Summary */}
              {selectedDisputeDetail.verdict ? (
                <div className="bg-indigo-950/30 border border-indigo-500/30 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-indigo-300">Gemini 2.5 Flash Verdict:</span>
                    <span className="font-mono text-emerald-400 font-bold">{selectedDisputeDetail.verdict.outcome}</span>
                  </div>
                  <p className="text-slate-200">{selectedDisputeDetail.verdict.explanation}</p>
                  <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-800">
                    <span>Confidence: {(selectedDisputeDetail.verdict.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">No verdict issued yet for this dispute.</p>
              )}

              {/* Force Advance Status Controls */}
              <div className="pt-2 space-y-3">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px] block">Admin Manual Status Override:</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Target Status</label>
                    <select
                      value={overrideStatus}
                      onChange={(e) => setOverrideStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="FILED">FILED</option>
                      <option value="EVIDENCE_COLLECTION">EVIDENCE_COLLECTION</option>
                      <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                      <option value="VERDICT_ISSUED">VERDICT_ISSUED</option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Manual Verdict Outcome</label>
                    <select
                      value={overrideOutcome}
                      onChange={(e) => setOverrideOutcome(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="CARDMEMBER_WIN">CARDMEMBER_WIN</option>
                      <option value="MERCHANT_WIN">MERCHANT_WIN</option>
                    </select>
                  </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Override Reason Note</label>
                  <input
                    type="text"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

                <button
                  onClick={handleForceAdvanceStatus}
                  disabled={submittingOverride}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-2.5 rounded-xl shadow-lg transition disabled:opacity-50"
                >
                  {submittingOverride ? 'Updating Status...' : 'Force Advance Status & Trigger AI Verdict'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LIVE AUDIT TELEMETRY STREAM */}
      <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-4 shadow-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Live System Audit & Telemetry Log Stream</h2>
        <div className="max-h-60 overflow-y-auto space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px]">
          {telemetry.map((log, idx) => (
            <div key={idx} className="text-slate-300 border-b border-slate-900 pb-1">
              <span className="text-indigo-400">[{new Date(log.timestamp || Date.now()).toLocaleTimeString()}]</span>{' '}
              <strong className="text-emerald-400">{log.action}</strong> • Actor: {log.actor_id || log.actor_type}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
