import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchDisputeDetail,
  fetchTimeline,
  fetchMediatedRequests,
  respondMediatedRequest,
  uploadEvidence,
} from '../api/client';
import type {
  DisputeDetail as DisputeDetailType,
  TimelineEvent,
  MediatedRequest,
} from '../api/client';


export default function DisputeDetail() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const [dispute, setDispute] = useState<DisputeDetailType | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [mediatedRequests, setMediatedRequests] = useState<MediatedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responseText, setResponseText] = useState('');
  const [activeMediatedId, setActiveMediatedId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState('PHOTO');
  const [actionMsg, setActionMsg] = useState('');

  const loadAll = async () => {
    if (!disputeId) return;
    try {
      setLoading(true);
      const detail = await fetchDisputeDetail(disputeId);
      setDispute(detail);

      const timeRes = await fetchTimeline(disputeId);
      setTimeline(timeRes.events || []);

      const medRes = await fetchMediatedRequests(disputeId);
      setMediatedRequests(medRes.items || []);
    } catch (err) {
      console.error('Failed to load dispute details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [disputeId]);

  const handleRespondMediated = async (requestId: string) => {
    if (!responseText.trim() || !disputeId) return;
    try {
      await respondMediatedRequest(disputeId, requestId, responseText);
      setResponseText('');
      setActiveMediatedId(null);
      setActionMsg('Mediated response submitted successfully!');
      loadAll();
    } catch (err) {
      console.error(err);
      setActionMsg('Failed to submit response.');
    }
  };

  const handleUploadAdditionalEvidence = async () => {
    if (!uploadFile || !disputeId) return;
    try {
      await uploadEvidence(disputeId, uploadFile, evidenceType);
      setUploadFile(null);
      setActionMsg('Additional evidence uploaded!');
      loadAll();
    } catch (err) {
      console.error(err);
      setActionMsg('Evidence upload failed.');
    }
  };

  if (loading || !dispute) {
    return <div className="p-12 text-center text-slate-400">Loading dispute status and details...</div>;
  }

  const isVerdictIssued = dispute.status === 'VERDICT_ISSUED' || dispute.status === 'CLOSED' || dispute.status === 'APPEALED';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start border-b border-slate-700/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white">Dispute #{dispute.id.substring(0, 8)}</h1>
            <span className="px-3 py-1 text-xs font-mono font-bold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {dispute.status}
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-2">
            Filed: {new Date(dispute.filed_at).toLocaleString()} • Category: <strong className="text-slate-200">{dispute.category}</strong>
          </p>
        </div>
        <div className="text-right">
          <span className="text-3xl font-bold font-mono text-emerald-400">${dispute.amount.toFixed(2)}</span>
          <p className="text-xs text-slate-400 mt-1">Transaction Ref: {dispute.transaction_ref}</p>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl">
          {actionMsg}
        </div>
      )}

      {/* State Progress Tracker */}
      <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-700/80 p-6 rounded-2xl shadow-xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Lifecycle State Progression</h3>
        <div className="flex items-center justify-between relative">
          {['FILED', 'EVIDENCE_COLLECTION', 'UNDER_REVIEW', 'VERDICT_ISSUED', 'CLOSED'].map((step, idx) => {
            const currentIdx = ['FILED', 'EVIDENCE_COLLECTION', 'UNDER_REVIEW', 'VERDICT_ISSUED', 'CLOSED'].indexOf(dispute.status);
            const isCompleted = idx <= (currentIdx === -1 ? 3 : currentIdx);
            return (
              <div key={step} className="flex flex-col items-center relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold border transition ${
                  isCompleted ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-900 border-slate-700 text-slate-500'
                }`}>
                  {idx + 1}
                </div>
                <span className={`text-[10px] mt-2 font-medium tracking-tight ${isCompleted ? 'text-indigo-300' : 'text-slate-500'}`}>
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verdict Card (If Available) */}
      {dispute.verdict && (
        <div className={`p-6 rounded-2xl border backdrop-blur-lg shadow-2xl relative overflow-hidden ${
          dispute.verdict.outcome === 'CARDMEMBER_WIN'
            ? 'bg-emerald-950/20 border-emerald-500/40'
            : 'bg-red-950/20 border-red-500/40'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{dispute.verdict.outcome === 'CARDMEMBER_WIN' ? '🎉 Verdict: Cardmember Favored' : '⚖️ Verdict: Merchant Favored'}</span>
            </h2>
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-300">
              Confidence: {(dispute.verdict.confidence * 100).toFixed(0)}% ({dispute.verdict.issued_by})
            </span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/40 p-4 rounded-xl border border-slate-800 font-sans">
            "{dispute.verdict.explanation}"
          </p>

          {dispute.verdict.outcome === 'MERCHANT_WIN' && dispute.status !== 'APPEALED' && dispute.status !== 'CLOSED' && (
            <div className="mt-5 flex justify-end">
              <Link
                to={`/dispute/${dispute.id}/appeal`}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition"
              >
                File an Appeal
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Mediated Requests Section */}
      {mediatedRequests.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 p-6 rounded-2xl">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <span>💬 Platform Mediated Evidence Requests</span>
          </h3>
          <div className="space-y-4">
            {mediatedRequests.map((req) => (
              <div key={req.id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-amber-300 font-mono">{req.request_type}</span>
                    <p className="text-sm text-slate-200 mt-1">{req.message}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    req.status === 'RESPONDED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {req.status}
                  </span>
                </div>

                {req.status === 'PENDING' && (
                  <div className="pt-2">
                    {activeMediatedId === req.id ? (
                      <div className="space-y-3">
                        <textarea
                          rows={3}
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Type your response to the merchant's clarification request..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setActiveMediatedId(null)}
                            className="text-xs px-3 py-1.5 rounded-lg text-slate-400 hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleRespondMediated(req.id)}
                            className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs px-4 py-1.5 rounded-lg shadow"
                          >
                            Submit Response
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setActiveMediatedId(req.id)}
                        className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs px-3 py-1.5 rounded-lg text-slate-200 transition"
                      >
                        Respond to Request
                      </button>
                    )}
                  </div>
                )}

                {req.response_text && (
                  <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 text-xs text-slate-300">
                    <strong>Your Response:</strong> {req.response_text}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attach Extra Evidence Widget */}
      {!isVerdictIssued && (
        <div className="bg-slate-800/40 border border-slate-700/60 p-6 rounded-2xl space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Upload Additional Evidence</h3>
          <div className="flex gap-4 items-center">
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none"
            >
              <option value="PHOTO">Photo Proof</option>
              <option value="RECEIPT">Receipt / Invoice</option>
              <option value="CHAT_LOG">Communication Log</option>
              <option value="OTHER">Other</option>
            </select>

            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
            />

            <button
              onClick={handleUploadAdditionalEvidence}
              disabled={!uploadFile}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2 rounded-xl transition"
            >
              Upload File
            </button>
          </div>
        </div>
      )}

      {/* Audit Timeline */}
      <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-700/80 p-6 rounded-2xl">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Audit & Activity Timeline</h3>
        <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-700">
          {timeline.map((evt, idx) => (
            <div key={idx} className="flex gap-4 relative z-10 items-start">
              <div className="w-7 h-7 rounded-full bg-slate-900 border border-indigo-500/50 flex items-center justify-center text-[10px] font-mono font-bold text-indigo-400 shadow">
                {idx + 1}
              </div>
              <div className="flex-1 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold font-mono text-indigo-300">{evt.action}</span>
                  <span className="text-[10px] text-slate-500">{new Date(evt.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-1">Actor: {evt.actor}</p>
                {evt.detail && (
                  <pre className="mt-2 bg-slate-950 p-2 rounded text-[10px] font-mono text-slate-400 overflow-x-auto">
                    {JSON.stringify(evt.detail, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
