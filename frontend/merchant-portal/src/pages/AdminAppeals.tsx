import React from 'react';
export default function AdminAppeals() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-brand-primary">Appeals Review Queue</h1>
      <p className="text-slate-400 mt-2">Appeal Queue & AI Simulator UI Specification</p>
      
      <div className="glass-panel mt-6 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/80 border-b border-slate-700 text-sm text-slate-300 uppercase tracking-wider">
              <th className="p-4 font-semibold">Dispute ID</th>
              <th className="p-4 font-semibold">Category</th>
              <th className="p-4 font-semibold">Amount</th>
              <th className="p-4 font-semibold">Filed Reason</th>
              <th className="p-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-700/50 hover:bg-slate-800/40 transition">
              <td className="p-4 font-mono text-brand-accent">#DSP-88219</td>
              <td className="p-4">NON_DELIVERY</td>
              <td className="p-4 font-medium text-emerald-400">$149.99</td>
              <td className="p-4 italic text-slate-300">"Never got package"</td>
              <td className="p-4 text-right">
                <button className="bg-brand-primary px-3 py-1 rounded text-sm hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/20">Review Case</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* CASE REVIEW MODAL PLACEHOLDER */}
      <div className="glass-panel p-6 mt-8 border-l-4 border-brand-accent">
         <h2 className="text-lg font-bold mb-4 flex items-center gap-2">CASE REVIEW MODAL <span className="font-mono text-sm text-slate-400 font-normal">(#DSP-88219)</span></h2>
         
         <div className="bg-slate-900/50 p-4 rounded mb-6 text-sm">
             <p className="mb-2"><span className="text-slate-400">Cardmember Claim:</span> "Package was stolen or shipped to wrong address."</p>
             <p><span className="text-slate-400">Original Verdict:</span> <span className="text-status-danger font-bold">MERCHANT_WIN</span> (Confidence: 0.94)</p>
         </div>
         
         <div className="flex justify-center items-center gap-4 mb-6">
             <button className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3 rounded-full text-sm font-bold shadow-lg hover:shadow-indigo-500/50 transition-all hover:-translate-y-1">⚡ SIMULATE GEMINI 2.5 FLASH AI REVIEW</button>
             <span className="text-slate-500 text-sm font-bold">OR</span>
             <button className="bg-slate-800 px-6 py-3 rounded-full text-sm border border-slate-600 hover:bg-slate-700 transition">MANUAL OPERATOR OVERRIDE</button>
         </div>
         
         <div className="bg-indigo-950/30 border border-indigo-500/30 p-4 rounded mb-6 text-sm relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500"></div>
             <h3 className="text-indigo-300 font-bold mb-2 text-xs uppercase tracking-wider">AI Reviewer Assessment</h3>
             <p className="text-slate-300 leading-relaxed italic">"Upon secondary review, tracking proof shows delivery to Zip 90210, but cardmember registered address is Zip 90211. Address mismatch confirmed."</p>
         </div>
         
         <div className="flex justify-end">
             <div className="flex items-center gap-4 bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-sm">Action Result:</span>
                <button className="bg-status-success px-4 py-2 rounded text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition">OVERTURN VERDICT (Release Funds)</button>
             </div>
         </div>
      </div>
      
    </div>
  )
}
