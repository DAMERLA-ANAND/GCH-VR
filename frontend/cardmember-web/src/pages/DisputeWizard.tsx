import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { fileDispute, uploadEvidence } from '../api/client';

export default function DisputeWizard() {
  const { transactionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [category, setCategory] = useState(searchParams.get('category') || 'NON_DELIVERY');
  const [amount, setAmount] = useState(parseFloat(searchParams.get('amount') || '149.99'));
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [evidenceType, setEvidenceType] = useState('RECEIPT');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!description.trim()) {
      setError('Please provide a detailed description of the dispute reason.');
      return;
    }

    try {
      setSubmitting(true);
      const dispute = await fileDispute({
        transaction_ref: transactionId || 'tok_visa_txn_998877',
        category,
        amount,
        currency: 'USD',
        description,
      });

      if (file && dispute.id) {
        await uploadEvidence(dispute.id, file, evidenceType);
      }

      navigate(`/dispute/${dispute.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.detail || 'Failed to submit dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="text-xs text-indigo-400 hover:underline mb-2">&larr; Back to Transactions</button>
        <h1 className="text-3xl font-extrabold text-white">File a Charge Dispute</h1>
        <p className="text-slate-400 text-sm mt-1">Transaction Ref: <span className="font-mono text-indigo-300">{transactionId}</span></p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-800/60 backdrop-blur-lg border border-slate-700/80 p-6 rounded-2xl shadow-2xl space-y-6">
        {/* Category Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Dispute Category</label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setCategory('NON_DELIVERY')}
              className={`p-4 rounded-xl border text-left transition ${
                category === 'NON_DELIVERY'
                  ? 'bg-indigo-500/20 border-indigo-500 text-white font-semibold shadow-lg'
                  : 'bg-slate-900/40 border-slate-700/80 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="text-lg mb-1">📦</div>
              <div className="font-medium text-sm">Non-Delivery of Goods</div>
              <div className="text-xs text-slate-400 mt-1 font-normal">Package or service ordered was not delivered.</div>
            </button>

            <button
              type="button"
              onClick={() => setCategory('UNAUTHORIZED_CHARGE')}
              className={`p-4 rounded-xl border text-left transition ${
                category === 'UNAUTHORIZED_CHARGE'
                  ? 'bg-indigo-500/20 border-indigo-500 text-white font-semibold shadow-lg'
                  : 'bg-slate-900/40 border-slate-700/80 text-slate-400 hover:border-slate-600'
              }`}
            >
              <div className="text-lg mb-1">🛡️</div>
              <div className="font-medium text-sm">Unauthorized Charge</div>
              <div className="text-xs text-slate-400 mt-1 font-normal">Card charge was not authorized by account holder.</div>
            </button>
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Disputed Amount ($ USD)</label>
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value))}
            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="dispute-description" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Description of Dispute</label>
          <textarea
            id="dispute-description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Please detail what happened (e.g. Expected delivery date, vendor communication, tracking details)..."
            className="w-full bg-slate-900/60 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            required
          />
        </div>

        {/* Optional Evidence Attachment */}
        <div className="border-t border-slate-700/60 pt-6">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Attach Initial Evidence (Optional)</label>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <select
              value={evidenceType}
              onChange={(e) => setEvidenceType(e.target.value)}
              className="bg-slate-900/60 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="RECEIPT">Receipt / Invoice</option>
              <option value="ORDER_CONFIRMATION">Order Confirmation Email</option>
              <option value="CHAT_LOG">Communication Log</option>
              <option value="PHOTO">Photo Proof</option>
              <option value="OTHER">Other Document</option>
            </select>

            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/20 file:text-indigo-300 hover:file:bg-indigo-500/30"
            />
          </div>
          {file && (
            <p className="text-xs text-emerald-400 font-mono">Selected: {file.name} ({Math.round(file.size / 1024)} KB)</p>
          )}
        </div>

        {/* Submit Action */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting Dispute...' : 'Submit Dispute'}
          </button>
        </div>
      </form>
    </div>
  );
}
