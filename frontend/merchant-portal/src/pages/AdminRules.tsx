import React from 'react';
export default function AdminRules() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-brand-primary">Rule Authoring Console</h1>
      <p className="text-slate-400 mt-2">Visual Rule Authoring UI Specification</p>
      
      <div className="glass-panel p-6 mt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold">Category: NON_DELIVERY [v1.2]</h2>
          <div className="flex gap-2">
            <button className="bg-brand-primary px-4 py-2 rounded text-sm hover:bg-indigo-600 transition shadow-lg shadow-indigo-500/20">+ Add New Rule Condition</button>
            <button className="bg-slate-700 px-4 py-2 rounded text-sm hover:bg-slate-600 transition">Load Category Preset v</button>
            <button className="bg-status-success px-4 py-2 rounded text-sm hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20">💾 Publish</button>
          </div>
        </div>
        
        {/* Rule #1 */}
        <div className="bg-slate-800/80 p-4 rounded mb-4 border border-slate-700 hover:border-slate-500 transition duration-300">
          <h3 className="font-bold mb-3 text-slate-200">Rule #1: Tracking Status Delivered</h3>
          <div className="flex items-center gap-4 text-sm font-mono bg-slate-900/50 p-2 rounded">
            <span className="text-slate-400 font-bold">IF</span>
            <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700 text-brand-accent shadow-inner">[ merchant.evidence.TRACKING.delivery_status ]</span>
            <span className="text-slate-400">( EQUALS )</span>
            <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700 text-status-warning shadow-inner">[ DELIVERED ]</span>
          </div>
          <div className="flex items-center gap-4 text-sm font-mono bg-slate-900/50 p-2 rounded mt-2">
            <span className="text-slate-400 font-bold">AND</span>
            <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700 text-brand-accent shadow-inner">[ merchant.evidence.TRACKING.address_match ]</span>
            <span className="text-slate-400">( {">="} )</span>
            <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700 text-status-warning shadow-inner">[ 0.85 ]</span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 text-sm flex items-center justify-between">
            <div>
                <span className="text-slate-400">THEN Outcome: </span>
                <span className="text-status-danger font-bold px-2 py-1 bg-red-500/10 rounded">( MERCHANT_WIN )</span> 
            </div>
            <div>
                <span className="text-slate-400">Weight: </span>
                <span className="font-mono bg-slate-900 px-2 py-1 rounded border border-slate-700 shadow-inner">[ 0.50 ]</span>
            </div>
          </div>
        </div>
        
        {/* Rule #2 */}
        <div className="bg-slate-800/80 p-4 rounded mb-4 border border-slate-700 hover:border-slate-500 transition duration-300">
          <h3 className="font-bold mb-3 text-slate-200">Rule #2: Missing Tracking</h3>
          <div className="flex items-center gap-4 text-sm font-mono bg-slate-900/50 p-2 rounded">
            <span className="text-slate-400 font-bold">IF</span>
            <span className="bg-slate-900 px-2 py-1 rounded border border-slate-700 text-brand-accent shadow-inner">[ merchant.evidence.TRACKING ]</span>
            <span className="text-slate-400">( NOT_EXISTS )</span>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 text-sm flex items-center justify-between">
             <div>
                <span className="text-slate-400">THEN Outcome: </span>
                <span className="text-status-success font-bold px-2 py-1 bg-emerald-500/10 rounded">( CARDMEMBER_WIN )</span> 
            </div>
            <div>
                <span className="text-slate-400">Weight: </span>
                <span className="font-mono bg-slate-900 px-2 py-1 rounded border border-slate-700 shadow-inner">[ 0.60 ]</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex items-center gap-4">
             <span className="text-slate-300 text-sm">Gemini 2.5 Flash Fallback Threshold:</span>
             <span className="font-mono bg-slate-900 px-2 py-1 rounded border border-slate-700 shadow-inner text-sm">[ 0.85 ]</span>
        </div>

      </div>
    </div>
  )
}
