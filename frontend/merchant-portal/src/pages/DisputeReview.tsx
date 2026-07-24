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

// Helper component to render PDF files, Images, or Text evidence interactively
function EvidenceDocumentViewer({ item }: { item: any }) {
  const isPdf =
    item.mime_type === 'application/pdf' ||
    (item.gcs_uri && item.gcs_uri.toLowerCase().endsWith('.pdf')) ||
    (item.evidence_type && item.evidence_type.includes('PDF')) ||
    (item.ocr_text && item.ocr_text.startsWith('%PDF'));

  const isImage =
    (item.mime_type && item.mime_type.startsWith('image/')) ||
    (item.gcs_uri && /\.(png|jpg|jpeg|gif|webp)$/i.test(item.gcs_uri));

  const hasContentUrl = Boolean(item.content_url);
  const pdfUrl = hasContentUrl ? `${API_BASE}${item.content_url}` : null;

  return (
    <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg">
      {/* Evidence Header */}
      <div className="flex justify-between items-center bg-slate-800/90 px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-base">{isPdf ? '📄' : isImage ? '🖼️' : '📝'}</span>
          <span className="font-semibold text-xs text-indigo-300 font-mono">{item.evidence_type}</span>
          <span className="text-[10px] text-slate-400">({item.side})</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{new Date(item.created_at).toLocaleString()}</span>
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 text-[11px] rounded-lg font-medium transition flex items-center gap-1"
            >
              <span>Open PDF ↗</span>
            </a>
          )}
        </div>
      </div>

      {/* Embedded Viewers */}
      <div className="p-4 space-y-3">
        {/* PDF Embedded Chrome Viewer */}
        {isPdf ? (
          <div className="space-y-3">
            {pdfUrl ? (
              <div className="rounded-lg overflow-hidden border border-slate-700 bg-slate-950">
                <div className="flex justify-between items-center px-3 py-1.5 bg-slate-900 text-[11px] text-slate-400 border-b border-slate-800">
                  <span>Interactive Chrome PDF Viewer</span>
                  <span>{item.gcs_uri ? item.gcs_uri.split('/').pop() : 'document.pdf'}</span>
                </div>
                <iframe
                  src={`${pdfUrl}#toolbar=1`}
                  className="w-full h-[450px] border-0"
                  title="PDF Evidence Viewer"
                />
              </div>
            ) : (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <span>📄 PDF Document Preview</span>
                </div>
                {item.ocr_text && !item.ocr_text.startsWith('%PDF') ? (
                  <p className="text-slate-300 whitespace-pre-wrap font-sans">{item.ocr_text}</p>
                ) : (
                  <p className="text-slate-400 italic">PDF Evidence attached (gcs_uri: {item.gcs_uri})</p>
                )}
              </div>
            )}
          </div>
        ) : isImage && pdfUrl ? (
          <div className="flex justify-center bg-slate-950 p-2 rounded-lg border border-slate-800">
            <img
              src={pdfUrl}
              alt={`Evidence ${item.evidence_type}`}
              className="max-h-96 max-w-full rounded object-contain"
            />
          </div>
        ) : (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300">
            <p className="whitespace-pre-wrap font-sans leading-relaxed">{item.ocr_text || 'No text preview available.'}</p>
          </div>
        )}

        {/* Extracted Fields Summary (If available) */}
        {item.extracted_fields && Object.keys(item.extracted_fields).length > 0 && (
          <div className="bg-indigo-950/30 border border-indigo-500/20 p-3 rounded-lg text-[11px] space-y-1">
            <span className="font-bold text-indigo-300 uppercase tracking-wider text-[10px]">AI OCR Extracted Details:</span>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
              {Object.entries(item.extracted_fields).map(([k, v]) => (
                <div key={k} className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 capitalize">{k.replace(/_/g, ' ')}:</span>{' '}
                  <strong className="text-slate-200">{String(v)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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

  // Expandable response state for Issue #3
  const [expandedRequests, setExpandedRequests] = useState<Record<string, boolean>>({});

  const toggleExpandResponse = (id: string) => {
    setExpandedRequests((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

  const cardmemberEvidence = evidence.filter((item) => item.side === 'CARDMEMBER');

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

      {/* ISSUE #1 FIX: Embedded Chrome PDF Viewer Evidence Section */}
      <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Evidence Submitted by Cardmember</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Interactive PDF and document viewers for cardmember evidence files.</p>
          </div>
          <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-full border border-slate-700 font-mono">
            {cardmemberEvidence.length} file(s)
          </span>
        </div>

        {cardmemberEvidence.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 italic text-center border border-dashed border-slate-700/60 rounded-xl">
            No cardmember evidence has been submitted yet.
          </p>
        ) : (
          <div className="space-y-4">
            {cardmemberEvidence.map((item) => (
              <EvidenceDocumentViewer key={item.id} item={item} />
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
              <label className="block text-[11px] text-slate-400 mb-1">File Document (PDF / Image)</label>
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

      {/* ISSUE #3 FIX: Interactive, Expandable Cardmember Responses */}
      <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Cardmember Clarification Responses</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Click any response card to expand full clarification details & evidence attachments.</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            {mediatedRequests.filter((r) => r.response_text).length} Responded
          </span>
        </div>

        {mediatedRequests.filter((request) => request.response_text).length === 0 ? (
          <p className="text-xs text-slate-400 py-4 italic text-center border border-dashed border-slate-700/60 rounded-xl">
            No cardmember response has been submitted yet.
          </p>
        ) : (
          <div className="space-y-3">
            {mediatedRequests
              .filter((request) => request.response_text)
              .map((request) => {
                const isExpanded = Boolean(expandedRequests[request.id]);
                const requestTitle =
                  request.request_type === 'REQUEST_PHOTO_PACKAGING'
                    ? 'Photo of Received Package Condition'
                    : request.request_type === 'REQUEST_DELIVERY_CLARIFICATION'
                    ? 'Clarification of Delivery Location'
                    : request.request_type;

                return (
                  <div
                    key={request.id}
                    className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                      isExpanded
                        ? 'bg-slate-900 border-indigo-500/60 shadow-xl'
                        : 'bg-slate-900/60 border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer'
                    }`}
                  >
                    {/* Clickable Header */}
                    <div
                      onClick={() => toggleExpandResponse(request.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 text-xs">
                          💬
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-white">{requestTitle}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              RESPONDED
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 line-clamp-1">
                            "{request.response_text}"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {request.responded_at && (
                          <span className="text-[11px] text-slate-500 hidden sm:inline">
                            {new Date(request.responded_at).toLocaleString()}
                          </span>
                        )}
                        <button
                          type="button"
                          className="px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition"
                        >
                          {isExpanded ? 'Collapse ▴' : 'Expand Details ▾'}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Detailed Drawer View */}
                    {isExpanded && (
                      <div className="border-t border-slate-800 p-5 bg-slate-950/80 space-y-4">
                        {/* Original Request Info */}
                        <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Original Merchant Request:</span>
                          <p className="text-xs text-slate-300 italic">"{request.message}"</p>
                          <span className="text-[10px] text-slate-500 block pt-1">
                            Sent Date: {new Date(request.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Full Cardmember Response */}
                        <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                              Cardmember Response Statement:
                            </span>
                            {request.responded_at && (
                              <span className="text-[10px] text-slate-400">
                                {new Date(request.responded_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-100 font-sans leading-relaxed">
                            {request.response_text}
                          </p>
                        </div>

                        {/* Related Cardmember Evidence Files */}
                        {cardmemberEvidence.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                              Attached Evidence Files ({cardmemberEvidence.length}):
                            </span>
                            <div className="space-y-3">
                              {cardmemberEvidence.map((item) => (
                                <EvidenceDocumentViewer key={item.id} item={item} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
