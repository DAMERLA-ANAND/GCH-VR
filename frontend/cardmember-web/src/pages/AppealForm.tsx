import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitAppeal } from '../api/client';

export default function AppealForm() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();

  const [reason, setReason] = useState('');
  const [simulateAi, setSimulateAi] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || !disputeId) return;

    try {
      setSubmitting(true);
      setError('');
      const res = await submitAppeal(disputeId, reason, simulateAi);
      setResult(res);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to submit appeal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="text-xs text-indigo-400 hover:underline">&larr; Back to Dispute Detail</button>

      <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-700/80 p-8 rounded-2xl shadow-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white">File Dispute Appeal</h1>
          <p className="text-slate-400 text-xs mt-1">Dispute Ref: <span className="font-mono text-indigo-300">{disputeId}</span></p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs">
            {error}
          </div>
        )}

        {result ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl">
              Appeal submitted successfully! Status: <strong className="font-mono">{result.status}</strong>
            </div>

            {result.simulated_outcome && (
              <div className="bg-slate-900/80 p-5 rounded-xl border border-indigo-500/40 space-y-3">
                <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">⚡ Gemini 2.5 Flash Review Simulator Outcome</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">Outcome:</span>
                  <span className={`px-2.5 py-0.5 text-xs font-bold font-mono rounded ${
                    result.simulated_outcome.appeal_outcome === 'OVERTURNED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {result.simulated_outcome.appeal_outcome}
                  </span>
                </div>
                <p className="text-xs text-slate-300 italic">"{result.simulated_outcome.review_notes}"</p>
              </div>
            )}

            <button
              onClick={() => navigate(`/dispute/${disputeId}`)}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition"
            >
              Return to Dispute Status
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Reason for Appeal</label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain why the verdict should be overturned (e.g. Carrier tracking zip code mismatch, proof of address)..."
                className="w-full bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/80 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Simulate Gemini AI Reviewer</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Auto-adjudicate appeal using Gemini 2.5 Flash for prototype demo.</p>
              </div>
              <input
                type="checkbox"
                checked={simulateAi}
                onChange={(e) => setSimulateAi(e.target.checked)}
                className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-red-600/30 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting Appeal...' : 'Submit Official Appeal'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
