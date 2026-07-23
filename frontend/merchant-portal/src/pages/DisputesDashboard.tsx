import React from 'react';
export default function DisputesDashboard() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-primary">Disputes Dashboard</h1>
          <button className="bg-brand-primary px-4 py-2 rounded text-sm hover:bg-indigo-600 transition">Filter by Category</button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 border-t-4 border-status-warning">
            <h2 className="font-bold text-lg mb-2">Pending Evidence</h2>
            <p className="text-4xl font-mono mb-4 text-status-warning">72<span className="text-sm text-slate-400">h</span> 14<span className="text-sm text-slate-400">m</span></p>
            <p className="text-sm text-slate-300">Action Required: Upload proof of delivery for #DSP-9912</p>
            <button className="mt-4 bg-slate-800 w-full py-2 rounded hover:bg-slate-700 transition text-sm">View Dispute</button>
        </div>
        <div className="glass-panel p-6 border-t-4 border-status-danger">
            <h2 className="font-bold text-lg mb-2">Needs Response</h2>
            <p className="text-4xl font-mono mb-4 text-status-danger">12<span className="text-sm text-slate-400">h</span> 00<span className="text-sm text-slate-400">m</span></p>
            <p className="text-sm text-slate-300">Cardmember requested clarification on charge.</p>
            <button className="mt-4 bg-slate-800 w-full py-2 rounded hover:bg-slate-700 transition text-sm">Respond</button>
        </div>
        <div className="glass-panel p-6 border-t-4 border-status-success">
            <h2 className="font-bold text-lg mb-2">Recently Resolved</h2>
            <div className="mt-4">
                <div className="flex justify-between text-sm mb-2 pb-2 border-b border-slate-700">
                    <span className="text-slate-300">#DSP-8811</span>
                    <span className="text-status-success">Won</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-slate-300">#DSP-7722</span>
                    <span className="text-status-danger">Lost</span>
                </div>
            </div>
            <button className="mt-4 text-brand-primary hover:text-brand-accent transition text-sm w-full text-center">View All</button>
        </div>
      </div>
    </div>
  )
}
