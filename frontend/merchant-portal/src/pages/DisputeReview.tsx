import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchDisputeDetail,
  fetchDisputeEvidence,
  fetchMediatedRequests,
  API_BASE,
  uploadMerchantEvidence,
  sendMediatedRequest,
} from '../api/client';

export default function DisputeReview() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const [dispute, setDispute] = useState<any | null>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [mediatedRequests, setMediatedRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState('TRACKING');
  const [requestTemplate, setRequestTemplate] = useState('REQUEST_PHOTO_PACKAGING');
  const [customMsg, setCustomMsg] = useState('Please upload a photo showing the shipping label attached to the outer box.');
  const [actionNotice, setActionNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadDetail = async () => {
    if (!disputeId) return;
    try {
      setLoading(true);
      const res = await fetchDisputeDetail(disputeId);
      setDispute(res);
      const [evidenceRes, mediatedRes] = await Promise.all([
        fetchDisputeEvidence(disputeId),
        fetchMediatedRequests(disputeId),
      ]);
      setEvidence(evidenceRes.items || []);
      setMediatedRequests(mediatedRes.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [disputeId]);

  const handleUploadProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !disputeId) return;
    try {
      setSubmitting(true);
      await uploadMerchantEvidence(disputeId, file, evidenceType);
      setActionNotice('Counter-evidence uploaded successfully!');
      setFile(null);
      loadDetail();
    } catch (err) {
      console.error(err);
      setActionNotice('Failed to upload evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMediated = async () => {
    if (!disputeId || !customMsg.trim()) return;
    try {
      setSubmitting(true);
      await sendMediatedRequest(disputeId, requestTemplate, customMsg);
      setActionNotice('Mediated information request sent to cardmember!');
      loadDetail();
    } catch (err) {
      console.error(err);
      setActionNotice('Failed to send mediated request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !dispute) {
    return <div className="p-12 text-center text-slate-400">Loading dispute review data...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Back button & Header */}
      <div>
        <Link to="/" className="text-xs text-indigo-400 hover:underline mb-2 inline-block">&larr; Back to Dashboard</Link>
        <div className="flex justify-between items-start border-b border-slate-700/80 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Dispute Review: #{dispute.id.substring(0, 8)}</h1>
            <p className="text-slate-400 text-xs mt-1">
              Category: <strong className="text-slate-200">{dispute.category}</strong> • Status: <span className="font-mono text-indigo-400">{dispute.status}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold font-mono text-emerald-400">${dispute.amount.toFixed(2)}</span>
            <p className="text-xs text-slate-400 mt-1">Ref: {dispute.transaction_ref}</p>
          </div>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-medium">
          {actionNotice}
        </div>
      )}

      {/* Cardmember Claim Details */}
      <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-3 shadow-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cardmember Claim Summary</h2>
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs text-slate-200">
          <p className="italic">"{dispute.description || 'No description provided.'}"</p>
          <p className="text-[11px] text-slate-400 mt-2">Filed Date: {new Date(dispute.filed_at).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Evidence Submitted by Cardmember</h2>
          <span className="text-xs text-slate-400">{evidence.filter((item) => item.side === 'CARDMEMBER').length} file(s)</span>
        </div>
        {evidence.filter((item) => item.side === 'CARDMEMBER').length === 0 ? (
          <p className="text-xs text-slate-400">No cardmember evidence has been submitted.</p>
        ) : (
          <div className="space-y-3">
            {evidence.filter((item) => item.side === 'CARDMEMBER').map((item) => (
              <div key={item.id} className="bg-slate-900/60 border border-slate-700 p-4 rounded-xl text-xs">
                <div className="flex justify-between gap-4">
                  <span className="font-mono text-indigo-300">{item.evidence_type}</span>
                  <span className="text-slate-500">{new Date(item.created_at).toLocaleString()}</span>
                </div>
                {item.mime_type?.startsWith('image/') && item.content_url ? (
                  <img
                    src={`${API_BASE}${item.content_url}`}
                    alt={`Cardmember evidence ${item.evidence_type}`}
                    className="mt-3 max-h-96 max-w-full rounded-lg border border-slate-700 object-contain"
                  />
                ) : item.ocr_text ? (
                  <p className="mt-2 text-slate-300 whitespace-pre-wrap">{item.ocr_text}</p>
                ) : null}
                <p className="mt-2 text-slate-500 font-mono break-all">{item.gcs_uri}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Counter-Evidence Form */}
      <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-4 shadow-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Submit Merchant Counter-Evidence</h2>
        <form onSubmit={handleUploadProof} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Evidence Type</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
              >
                <option value="TRACKING">Carrier Shipping Tracking PDF/Text</option>
                <option value="ORDER_CONFIRMATION">Order Authorization / Receipt</option>
                <option value="CHAT_LOG">Customer Support Chat Log</option>
                <option value="OTHER">Other Proof</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">File Document</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !file}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg transition disabled:opacity-50"
            >
              Upload Counter-Evidence
            </button>
          </div>
        </form>
      </div>

      {/* Mediated Information Request Center */}
      <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-6 shadow-xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">Mediated Information Request Center</h2>
          <p className="text-xs text-slate-400 mt-1">Send a platform-monitored clarification request directly to the cardmember.</p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 space-y-3">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Select Template:</label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 cursor-pointer hover:bg-indigo-500/10 transition">
            <input
              type="radio"
              name="template"
              checked={requestTemplate === 'REQUEST_PHOTO_PACKAGING'}
              onChange={() => {
                setRequestTemplate('REQUEST_PHOTO_PACKAGING');
                setCustomMsg('Please upload a photo showing the shipping label attached to the outer box.');
              }}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <p className="font-medium text-xs text-white">Request Photo of Received Package Condition</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Ask cardmember for visual evidence of outer box and carrier label.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/40 cursor-pointer hover:bg-slate-800/50 transition">
            <input
              type="radio"
              name="template"
              checked={requestTemplate === 'REQUEST_DELIVERY_CLARIFICATION'}
              onChange={() => {
                setRequestTemplate('REQUEST_DELIVERY_CLARIFICATION');
                setCustomMsg('Please clarify if package was delivered to front porch or side door per carrier notes.');
              }}
              className="mt-1 accent-indigo-500"
            />
            <div>
              <p className="font-medium text-xs text-white">Request Clarification of Delivery Location</p>
            </div>
          </label>
        </div>

        <div>
          <label htmlFor="mediated-note" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Note to Cardmember (Platform Monitored):</label>
          <textarea
            id="mediated-note"
            rows={3}
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSendMediated}
            disabled={submitting}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg transition disabled:opacity-50"
          >
            Send Mediated Request
          </button>
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-4 shadow-xl">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Cardmember Responses</h2>
        {mediatedRequests.filter((request) => request.response_text).length === 0 ? (
          <p className="text-xs text-slate-400">No cardmember response has been submitted.</p>
        ) : (
          <div className="space-y-3">
            {mediatedRequests.filter((request) => request.response_text).map((request) => (
              <div key={request.id} className="bg-slate-900/60 border border-emerald-500/20 p-4 rounded-xl text-xs">
                <p className="text-slate-400">Response to {request.request_type}</p>
                <p className="mt-2 text-slate-200">{request.response_text}</p>
                {request.responded_at && <p className="mt-2 text-slate-500">{new Date(request.responded_at).toLocaleString()}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
