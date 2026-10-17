"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

type HistoryItem = {
  _id: string;
  created_at: string;
  product_name: string;
  selling_price_per_kg: number;
  result_data?: {
    summary?: { total_kg: number; total_cost: number; };
    profit?: { total_profit: number; is_loss: boolean; };
  };
};

export default function HistoryPage() {
  const { token } = useAuth();
  const router = useRouter();
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchHistory = async (start = "", end = "") => {
    setLoading(true);
    setError(null);
    try {
      // Build the URL with query parameters
      let url = "/api/history";
      const params = new URLSearchParams();
      if (start) params.append("start_date", new Date(start).toISOString());
      if (end) params.append("end_date", new Date(end).toISOString());
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) throw new Error("Failed to fetch history");
      
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    fetchHistory(); // Initial load
  }, [token, router]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchHistory(startDate, endDate);
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    fetchHistory("", "");
  };

  const money = (n: number) => new Intl.NumberFormat("en-RW").format(n);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown Date";
    return new Date(dateString).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };

  if (!token) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-black">Redirecting...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex justify-center pb-20 text-black">
      <div className="w-full max-w-4xl">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">📜 Saved History</h1>
          <button 
            onClick={() => router.push("/")} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            ⬅ Back to Calculator
          </button>
        </div>

        {/* Filter Bar */}
        <form onSubmit={handleApplyFilter} className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-end border border-gray-200">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-700 mb-1">From (Date & Time)</label>
            <input 
              type="datetime-local" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-700 mb-1">To (Date & Time)</label>
            <input 
              type="datetime-local" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button 
              type="submit" 
              className="bg-gray-800 hover:bg-black text-white font-bold py-2 px-6 rounded-lg transition"
            >
              Filter
            </button>
            <button 
              type="button" 
              onClick={handleClearFilter}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition"
            >
              Clear
            </button>
          </div>
        </form>

        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 font-medium">{error}</div>}

        {loading ? (
          <div className="text-center font-bold text-gray-500 py-10">Loading...</div>
        ) : history.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow text-center text-gray-500 font-medium border border-gray-200">
            No calculations found for this time period.
          </div>
        ) : (
          <div className="grid gap-4">
            {history.map((item) => {
              const summary = item.result_data?.summary;
              const profit = item.result_data?.profit;
              const totalKg = summary?.total_kg || 0;
              const totalProfit = profit?.total_profit || 0;
              const isLoss = profit?.is_loss || false;

              return (
                <div key={item._id} className="bg-white rounded-xl shadow border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex justify-between items-start border-b pb-3 mb-3">
                    <div>
                      <h2 className="text-xl font-bold text-black">{item.product_name || "Unknown Product"}</h2>
                      <p className="text-sm text-gray-500">{formatDate(item.created_at)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${isLoss ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {isLoss ? "Loss" : "Profit"}: {money(totalProfit)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 block">Total Weight</span>
                      <span className="font-bold text-black">{money(totalKg)} kg</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Total Cost</span>
                      <span className="font-bold text-black">{money(summary?.total_cost || 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Selling Price/kg</span>
                      <span className="font-bold text-black">{money(item.selling_price_per_kg || 0)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Profit/kg</span>
                      <span className="font-bold text-black">
                        {totalKg > 0 ? money(totalProfit / totalKg) : "0"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}