import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  fetchDisputeDetail,
  fetchTimeline,
  fetchMediatedRequests,
  fetchDisputeEvidence,
  respondMediatedRequest,
  uploadEvidence,
  API_BASE,
} from '../api/client';
import type {
  DisputeDetail as DisputeDetailType,
  TimelineEvent,
  MediatedRequest,
} from '../api/client';

// Interactive PDF / Image / Document Viewer component
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

      <div className="p-4 space-y-3">
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

// ISSUE #2 FIX: Humanizer helper to make audit timeline readable for commoners
function formatHumanTimelineEvent(evt: TimelineEvent, dispute: DisputeDetailType | null) {
  const cardmemberId = dispute?.cardmember_id || '00000000-0000-0000-0000-000000000001';
  const merchantId = dispute?.merchant_id || '00000000-0000-0000-0000-000000000002';

  let actorName = 'Automated AI System';
  if (evt.actor === cardmemberId || evt.actor === '00000000-0000-0000-0000-000000000001') {
    actorName = 'You (Cardmember)';
  } else if (evt.actor === merchantId || evt.actor === '00000000-0000-0000-0000-000000000002') {
    actorName = 'Merchant (TechStore)';
  } else if (evt.actor === '00000000-0000-0000-0000-000000000003') {
    actorName = 'Platform Reviewer';
  } else if (evt.actor && evt.actor !== 'SYSTEM') {
    actorName = `Actor (${evt.actor.substring(0, 8)})`;
  }

  let title = evt.action || 'Activity Logged';
  let icon = '📌';
  let description = '';

  switch (evt.action) {
    case 'DISPUTE_FILED':
      title = 'Dispute Claim Opened';
      icon = '📋';
      description = `Dispute opened for ${evt.detail?.category || dispute?.category || 'claim'} (Disputed Amount: $${(evt.detail?.amount || dispute?.amount || 0).toFixed(2)}).`;
      break;
    case 'EVIDENCE_SUBMITTED':
      title = 'Evidence Document Attached';
      icon = '📄';
      description = `${evt.detail?.evidence_type || 'Evidence file'} attached for dispute verification.`;
      break;
    case 'MEDIATED_REQUEST_SENT':
      title = 'Merchant Requested Clarification';
      icon = '💬';
      description = `Merchant note: "${evt.detail?.message || 'Requested clarification proof.'}"`;
      break;
    case 'MEDIATED_REQUEST_RESPONDED':
      title = 'Clarification Response Submitted';
      icon = '✉️';
      description = `Response sent to merchant: "${evt.detail?.response_text || 'Submitted response.'}"`;
      break;
    case 'VERDICT_ISSUED':
      title = 'Arbitration Verdict Issued';
      icon = '⚖️';
      description = `Verdict outcome: ${evt.detail?.outcome === 'CARDMEMBER_WIN' ? 'Favored Cardmember' : 'Favored Merchant'} (${((evt.detail?.confidence || 0) * 100).toFixed(0)}% confidence).`;
      break;
    case 'APPEAL_FILED':
      title = 'Dispute Appeal Submitted';
      icon = '🔄';
      description = `Appeal filed: "${evt.detail?.reason || 'Re-evaluating dispute facts.'}"`;
      break;
    case 'APPEAL_RESOLVED':
      title = 'Appeal Review Completed';
      icon = '✅';
      description = `Appeal decision: ${evt.detail?.appeal_outcome || 'Resolved'}. ${evt.detail?.review_notes || ''}`;
      break;
    default:
      if (evt.detail && typeof evt.detail === 'object') {
        description = Object.entries(evt.detail)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(' • ');
      }
  }

  // Handle invalid/epoch timestamp fallback
  let formattedDate = 'Just now';
  if (evt.timestamp) {
    const d = new Date(evt.timestamp);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1975) {
      formattedDate = d.toLocaleString();
    } else if (dispute?.filed_at) {
      formattedDate = new Date(dispute.filed_at).toLocaleString();
    }
  }

  return { title, icon, actorName, description, formattedDate };
}

export default function DisputeDetail() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const [dispute, setDispute] = useState<DisputeDetailType | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [mediatedRequests, setMediatedRequests] = useState<MediatedRequest[]>([]);
  const [evidenceList, setEvidenceList] = useState<any[]>([]);
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

      const [timeRes, medRes, evRes] = await Promise.all([
        fetchTimeline(disputeId),
        fetchMediatedRequests(disputeId),
        fetchDisputeEvidence(disputeId).catch(() => ({ items: [] })),
      ]);

      // Filter out duplicate audit events missing valid timestamps or details
      const cleanedTimeline = (timeRes.events || []).filter(
        (evt: any) => evt.action && (evt.timestamp || evt.detail)
      );

      setTimeline(cleanedTimeline);
      setMediatedRequests(medRes.items || []);
      setEvidenceList(evRes.items || []);
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
      {/* Back button & Header */}
      <div>
        <Link to="/" className="text-xs text-indigo-400 hover:underline mb-2 inline-block">&larr; Back to Transactions</Link>
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
                    <span className="text-xs font-bold text-amber-300 font-mono">
                      {req.request_type === 'REQUEST_PHOTO_PACKAGING' ? 'Photo of Package Condition' : req.request_type}
                    </span>
                    <p className="text-sm text-slate-200 mt-1">{req.message}</p>
                  </div>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
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
                  <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 text-xs text-slate-300 space-y-1">
                    <span className="text-[11px] text-emerald-300 font-bold block">Your Clarification Response:</span>
                    <p>{req.response_text}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submitted Evidence Documents with Chrome PDF Viewer */}
      {evidenceList.length > 0 && (
        <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Submitted Evidence Documents</h3>
            <span className="text-xs text-slate-400">{evidenceList.length} document(s)</span>
          </div>
          <div className="space-y-4">
            {evidenceList.map((item) => (
              <EvidenceDocumentViewer key={item.id} item={item} />
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

      {/* ISSUE #2 FIX: Human-Readable Commoner-Side Activity Timeline */}
      <div className="bg-slate-800/60 backdrop-blur-lg border border-slate-700/80 p-6 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Audit & Activity Timeline</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Chronological record of actions taken by you, the merchant, and the platform.</p>
          </div>
          <span className="text-xs text-indigo-400 font-mono font-semibold bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            {timeline.length} Event(s)
          </span>
        </div>

        {timeline.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">No activity timeline recorded yet.</p>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-700">
            {timeline.map((evt, idx) => {
              const formatted = formatHumanTimelineEvent(evt, dispute);
              return (
                <div key={idx} className="flex gap-4 relative z-10 items-start">
                  <div className="w-8 h-8 rounded-full bg-slate-900 border border-indigo-500/60 flex items-center justify-center text-sm shadow">
                    {formatted.icon}
                  </div>
                  <div className="flex-1 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs space-y-1.5 shadow">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-indigo-200">{formatted.title}</span>
                      <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-mono">
                        {formatted.formattedDate}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span>By: <strong className="text-slate-200 font-medium">{formatted.actorName}</strong></span>
                    </div>

                    {formatted.description && (
                      <p className="text-slate-300 text-xs font-sans leading-relaxed pt-1 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                        {formatted.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
