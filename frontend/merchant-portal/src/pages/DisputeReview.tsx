import React from 'react';
export default function DisputeReview() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-brand-primary">Dispute Review: #DSP-88219</h1>
      
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">Mediated Information Request Center</h2>
        
        <div className="glass-panel p-6 max-w-2xl relative overflow-hidden">
             {/* Decorative background element */}
             <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none"></div>

             <div className="bg-slate-900/50 p-4 rounded-lg mb-6 border border-slate-700">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Select Request Template:</h3>
                
                <label className="flex items-start gap-3 p-3 rounded hover:bg-slate-800/50 cursor-pointer transition border border-brand-primary/30 bg-brand-primary/5 mb-2">
                    <input type="radio" name="template" defaultChecked className="mt-1 accent-brand-primary" />
                    <div>
                        <p className="font-medium">Request Photo of Received Package Condition</p>
                        <p className="text-xs text-slate-400 mt-1">Ask the cardmember to provide visual evidence of the package upon receipt.</p>
                    </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 rounded hover:bg-slate-800/50 cursor-pointer transition border border-transparent mb-2">
                    <input type="radio" name="template" className="mt-1" />
                    <div>
                        <p className="font-medium">Request Clarification of Delivery Location</p>
                    </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 rounded hover:bg-slate-800/50 cursor-pointer transition border border-transparent">
                    <input type="radio" name="template" className="mt-1" />
                    <div>
                        <p className="font-medium">Request Communication Log with Local Carrier</p>
                    </div>
                </label>
             </div>
             
             <div className="mb-6">
                 <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Additional Note (Platform Monitored):</label>
                 <textarea 
                    className="w-full bg-slate-900/50 border border-slate-700 rounded p-3 text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition" 
                    rows={3}
                    defaultValue="Please upload a photo showing the shipping label attached to the outer box."
                 ></textarea>
                 <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    All communication is monitored by platform AI for compliance.
                 </p>
             </div>
             
             <div className="flex justify-end">
                <button className="bg-gradient-to-r from-brand-primary to-brand-accent px-6 py-2 rounded font-medium shadow-lg hover:shadow-brand-primary/20 transition-all hover:-translate-y-0.5">Send Mediated Request</button>
             </div>
        </div>
      </div>
    </div>
  )
}
