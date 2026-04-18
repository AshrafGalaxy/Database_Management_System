"use client";
import { useState, useEffect } from "react";
import { CalendarRange, Activity, ArrowRight, ArrowDownRight, ArrowUpRight, Ban } from "lucide-react";

interface AnalyticsPanelProps {
  accountNumber: string;
}

export default function AnalyticsPanel({ accountNumber }: AnalyticsPanelProps) {
  const [statement, setStatement] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set default Last 30 Days
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    
    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
    
    fetchAnalytics();
  }, [accountNumber]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchStatement();
    }
  }, [accountNumber, startDate, endDate]);

  const fetchStatement = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/statement/${accountNumber}?start_date=${startDate}&end_date=${endDate}`);
      const data = await res.json();
      if (data.statement) {
        setStatement(data.statement);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/analytics/${accountNumber}`);
      const data = await res.json();
      if (data.analytics) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Cash Flow Visualizer */}
      <div className="glass-card p-6 shadow-xl animate-in slide-in-from-bottom-2">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Monthly Cash Flow</h2>
        </div>

        {analytics.length === 0 ? (
          <p className="text-slate-400 text-sm">No cash flow data available for this account.</p>
        ) : (
          <div className="flex items-end gap-6 h-64 mt-4 overflow-x-auto pb-4 custom-scrollbar">
            {analytics.map((monthData, idx) => {
              // Calculate proportions for native tailwind bars
              const maxVal = Math.max(...analytics.map(d => Math.max(parseFloat(d.money_in), parseFloat(d.money_out))));
              const scale = maxVal > 0 ? 200 / maxVal : 0; // 200px max height
              
              const hIn = parseFloat(monthData.money_in) * scale;
              const hOut = parseFloat(monthData.money_out) * scale;

              return (
                <div key={idx} className="flex flex-col items-center gap-2 min-w-[80px]">
                  <div className="flex gap-2 items-end h-[200px]">
                    {/* Money In Bar */}
                    <div className="w-8 bg-brand-emerald/80 rounded-t-sm relative group transition-all hover:bg-brand-emerald" style={{ height: `${hIn}px` }}>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs text-white px-2 py-1 rounded whitespace-nowrap transition-opacity text-[10px]">
                        +₹{parseFloat(monthData.money_in).toLocaleString('en-IN')}
                      </div>
                    </div>
                    {/* Money Out Bar */}
                    <div className="w-8 bg-red-500/80 rounded-t-sm relative group transition-all hover:bg-red-500" style={{ height: `${hOut}px` }}>
                       <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-xs text-white px-2 py-1 rounded whitespace-nowrap transition-opacity text-[10px]">
                        -₹{parseFloat(monthData.money_out).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{monthData.month_label}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Advanced Statement Ledger */}
      <div className="glass-card p-6 shadow-xl animate-in slide-in-from-bottom-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Account Statement</h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)}
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300"
            />
            <span className="text-slate-500">to</span>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300"
            />
          </div>
        </div>

        {loading ? (
           <div className="text-center py-8"><span className="text-slate-500">Generating dynamic ledger...</span></div>
        ) : statement.length === 0 ? (
           <div className="text-center py-8"><span className="text-slate-500">No transactions found in this range.</span></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300 uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Debit (-)</th>
                  <th className="px-4 py-3 text-right">Credit (+)</th>
                  <th className="px-4 py-3 text-right text-indigo-300">Running Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/20">
                {statement.map(tx => {
                  const isCredit = tx.transaction_type === 'deposit' || tx.transaction_type === 'transfer_in';
                  const isFailed = tx.status === 'Failed';
                  return (
                    <tr key={tx.transaction_id} className={`hover:bg-slate-800/30 transition ${isFailed ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {new Date(tx.transaction_date).toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-slate-200">
                           {isFailed ? <Ban className="w-3 h-3 text-red-500" /> : isCredit ? <ArrowDownRight className="w-3 h-3 text-emerald-500"/> : <ArrowUpRight className="w-3 h-3 text-red-400"/>}
                           <span>{tx.description}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium uppercase mt-0.5 block">{tx.transaction_channel} {isFailed && '(FAILED)'}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-red-400">
                        {(!isCredit && !isFailed) ? `₹${parseFloat(tx.amount).toLocaleString('en-IN', {minimumFractionDigits:2})}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400">
                        {(isCredit && !isFailed) ? `₹${parseFloat(tx.amount).toLocaleString('en-IN', {minimumFractionDigits:2})}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-indigo-300 font-bold bg-indigo-500/5">
                        ₹{parseFloat(tx.dynamic_running_balance || '0').toLocaleString('en-IN', {minimumFractionDigits:2})}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
