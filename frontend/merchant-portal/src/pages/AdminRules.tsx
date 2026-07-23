import { useEffect, useState } from 'react';
import { fetchRuleSet, testRuleSet, publishRuleSet } from '../api/client';

export default function AdminRules() {
  const [category, setCategory] = useState('NON_DELIVERY');
  const [ruleSet, setRuleSet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [publishStatus, setPublishStatus] = useState('');

  const loadRules = async () => {
    try {
      setLoading(true);
      const res = await fetchRuleSet(category);
      setRuleSet(res);
      setTestResult(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [category]);

  const handleDryRunTest = async () => {
    if (!ruleSet) return;
    try {
      setTesting(true);
      const mockEvidence = [
        {
          side: 'MERCHANT',
          evidence_type: 'TRACKING',
          extracted_fields: { delivery_status: 'DELIVERED' },
          ocr_text: 'USPS Delivered July 18',
        },
      ];
      const res = await testRuleSet(category, ruleSet, mockEvidence);
      setTestResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setTesting(false);
    }
  };

  const handlePublish = async () => {
    if (!ruleSet) return;
    try {
      await publishRuleSet(category, ruleSet);
      setPublishStatus('Rule set published successfully!');
    } catch (err) {
      console.error(err);
      setPublishStatus('Publish failed.');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-700/80 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Visual Rule Authoring Console</h1>
          <p className="text-slate-400 text-xs mt-1">Configure deterministic rules & Gemini 2.5 Flash fallback thresholds</p>
        </div>

        <div className="flex gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs px-3 py-2 rounded-xl text-slate-200 focus:outline-none"
          >
            <option value="NON_DELIVERY">NON_DELIVERY</option>
            <option value="UNAUTHORIZED_CHARGE">UNAUTHORIZED_CHARGE</option>
          </select>

          <button
            onClick={handlePublish}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg transition"
          >
            💾 Publish Rule Set
          </button>
        </div>
      </div>

      {publishStatus && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-medium">
          {publishStatus}
        </div>
      )}

      {loading || !ruleSet ? (
        <div className="p-8 text-center text-slate-400">Loading rule definitions...</div>
      ) : (
        <div className="space-y-6">
          {/* Rules List */}
          <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
                Rule Definitions: {ruleSet.category} [{ruleSet.version}]
              </h2>
            </div>

            {ruleSet.rules.map((rule: any, idx: number) => (
              <div key={rule.id || idx} className="bg-slate-900/60 p-4 rounded-xl border border-slate-700/80 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xs text-indigo-300">Rule #{idx + 1}: {rule.name} ({rule.id})</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    rule.outcome === 'MERCHANT_WIN' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    THEN {rule.outcome}
                  </span>
                </div>

                <p className="text-xs text-slate-400">{rule.description}</p>

                {/* Conditions */}
                <div className="space-y-2 pt-1">
                  {rule.conditions.map((cond: any, cIdx: number) => (
                    <div key={cIdx} className="flex items-center gap-3 text-xs font-mono bg-slate-950/80 p-2 rounded-lg border border-slate-800">
                      <span className="text-indigo-400 font-bold">{cIdx === 0 ? 'IF' : 'AND'}</span>
                      <span className="text-slate-200">[{cond.field}]</span>
                      <span className="text-amber-400">({cond.operator})</span>
                      {cond.value !== undefined && <span className="text-emerald-400">[{String(cond.value)}]</span>}
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <span>Explanation Template: "{rule.explanation_template}"</span>
                  <span className="font-mono">Weight: {rule.weight}</span>
                </div>
              </div>
            ))}

            {/* Gemini Fallback Threshold Card */}
            <div className="bg-indigo-950/20 border border-indigo-500/30 p-4 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-indigo-300">Gemini 2.5 Flash Fallback Confidence Threshold:</span>
                <p className="text-slate-400 text-[11px] mt-0.5">If deterministic rule evaluation produces confidence below this value, Gemini AI reasoning evaluates the dispute.</p>
              </div>
              <span className="font-mono font-bold text-base px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-indigo-400">
                {ruleSet.gemini_fallback?.confidence_threshold || 0.85}
              </span>
            </div>
          </div>

          {/* Interactive Dry-Run Test Panel */}
          <div className="bg-slate-800/40 border border-slate-700/80 p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">⚡ Live Dry-Run Testing Harness</h2>
              <button
                onClick={handleDryRunTest}
                disabled={testing}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg transition"
              >
                {testing ? 'Executing Test...' : 'Run Dry-Run Test'}
              </button>
            </div>

            {testResult && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-3 font-mono">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span>Outcome: <strong className="text-emerald-400">{testResult.outcome}</strong></span>
                  <span>Confidence: <strong className="text-indigo-400">{(testResult.confidence * 100).toFixed(0)}%</strong></span>
                  <span>Gemini Invoked: <strong className={testResult.gemini_invoked ? 'text-amber-400' : 'text-slate-400'}>{String(testResult.gemini_invoked)}</strong></span>
                </div>
                <p className="text-slate-300 font-sans">Explanation: "{testResult.explanation}"</p>
                <div>
                  <span className="text-slate-500 text-[10px]">Rules Fired:</span>
                  <pre className="mt-1 bg-slate-900 p-2 rounded text-[10px] text-indigo-300 overflow-x-auto">
                    {JSON.stringify(testResult.rules_fired, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
