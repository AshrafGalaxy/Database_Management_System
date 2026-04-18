"use client";
import { useEffect, useState, useCallback } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { Search, Download, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Wifi } from "lucide-react";

type Transaction = {
  transaction_id: number;
  transaction_type: string;
  transaction_channel: string;
  amount: string;
  balance_after: string;
  status: string;
  transaction_date: string;
  description: string;
};

const channelColor: Record<string, string> = {
  NEFT: "text-blue-400 bg-blue-500/10",
  RTGS: "text-amber-400 bg-amber-500/10",
  UPI: "text-purple-400 bg-purple-500/10",
  ATM: "text-orange-400 bg-orange-500/10",
  Cheque: "text-slate-400 bg-slate-500/10",
  System: "text-slate-500 bg-slate-800",
  IMPS: "text-emerald-400 bg-emerald-500/10",
};

const typeIcon: Record<string, React.ReactNode> = {
  deposit: <ArrowDownCircle className="w-4 h-4 text-emerald-400" />,
  withdrawal: <ArrowUpCircle className="w-4 h-4 text-red-400" />,
  transfer_in: <ArrowDownCircle className="w-4 h-4 text-emerald-400" />,
  transfer_out: <ArrowUpCircle className="w-4 h-4 text-red-400" />,
};

export default function TransactionsPage() {
  const { customerId, activeAccount } = useDashboard();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchTxns = useCallback(async () => {
    if (!activeAccount) return;
    setLoading(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/transactions/${activeAccount.account_number}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
      setFiltered(data.transactions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [activeAccount]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  useEffect(() => {
    let result = transactions;
    if (typeFilter !== "all") {
      result = result.filter(t => t.transaction_type.includes(typeFilter));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.transaction_channel.toLowerCase().includes(q) ||
        t.amount.includes(q)
      );
    }
    setFiltered(result);
  }, [search, typeFilter, transactions]);

  const downloadCSV = () => {
    const header = ["Date", "Description", "Channel", "Type", "Amount (₹)", "Balance After (₹)", "Status"];
    const rows = filtered.map(t => [
      new Date(t.transaction_date).toLocaleDateString("en-IN"),
      `"${t.description}"`,
      t.transaction_channel,
      t.transaction_type,
      parseFloat(t.amount).toFixed(2),
      parseFloat(t.balance_after).toFixed(2),
      t.status
    ]);
    const csv = [header, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `statement_${activeAccount?.account_number}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const isDebit = (type: string) => type === "withdrawal" || type === "transfer_out";

  return (
    <div className="min-h-screen bg-[#020617] pb-16 pt-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Transaction History</h1>
            <p className="text-slate-500 text-sm mt-1">
              {activeAccount ? `Account: ${activeAccount.account_number}` : "Select an account from the dashboard"} · {filtered.length} records
            </p>
          </div>
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm transition"
          >
            <Download className="w-4 h-4" /> Download CSV
          </button>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by description, channel..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Types</option>
            <option value="deposit">Credits Only</option>
            <option value="withdrawal">Debits Only</option>
            <option value="transfer">Transfers</option>
          </select>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-500">No transactions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/60">
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wider text-xs">Date & Time</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-semibold uppercase tracking-wider text-xs">Description</th>
                    <th className="text-center px-4 py-3 text-slate-500 font-semibold uppercase tracking-wider text-xs">Channel</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-semibold uppercase tracking-wider text-xs">Amount</th>
                    <th className="text-right px-4 py-3 text-slate-500 font-semibold uppercase tracking-wider text-xs">Balance After</th>
                    <th className="text-center px-4 py-3 text-slate-500 font-semibold uppercase tracking-wider text-xs">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr key={t.transaction_id} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition ${i % 2 === 0 ? "" : "bg-slate-900/20"}`}>
                      <td className="px-4 py-3">
                        <p className="text-slate-300 font-mono text-xs">{new Date(t.transaction_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                        <p className="text-slate-600 text-[10px]">{new Date(t.transaction_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {typeIcon[t.transaction_type] || <Wifi className="w-4 h-4 text-slate-600" />}
                          <span className="text-slate-200 text-xs">{t.description}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${channelColor[t.transaction_channel] || "text-slate-400 bg-slate-800"}`}>
                          {t.transaction_channel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold font-mono ${isDebit(t.transaction_type) ? "text-red-400" : "text-emerald-400"}`}>
                          {isDebit(t.transaction_type) ? "−" : "+"}₹{parseFloat(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-slate-400 font-mono text-xs">₹{parseFloat(t.balance_after).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          t.status === "Success" ? "bg-emerald-500/20 text-emerald-400" :
                          t.status === "Failed" ? "bg-red-500/20 text-red-400" :
                          "bg-amber-500/20 text-amber-400"
                        }`}>{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
