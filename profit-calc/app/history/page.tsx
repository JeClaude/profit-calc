"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

type HistoryItem = {
  _id: string;
  created_at: string;
  product_name: string;
  selling_price_per_kg: number;
  packs?: { kg: number; cost: number }[]; // From the database
  result_data?: {
    summary?: {
      total_kg: number;
      total_cost: number;
      cost_per_kg: number;
      selling_price_per_kg: number;
      total_revenue: number;
    };
    profit?: {
      profit_per_kg: number;
      total_profit: number;
      profit_margin_percent: number;
      is_loss: boolean;
    };
    packs_breakdown?: {
      pack_number: number;
      kg: number;
      cost: number;
      cost_per_kg: number;
      revenue: number;
      profit: number;
    }[];
  };
};

export default function HistoryPage() {
  const { token } = useAuth();
  const router = useRouter();
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // State for the Modal
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const fetchHistory = async (start = "", end = "") => {
    setLoading(true);
    setError(null);
    try {
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
    fetchHistory();
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

  // Function to re-download CSV from history
  const downloadCSV = (item: HistoryItem) => {
    const result = item.result_data;
    if (!result || !result.summary || !result.profit || !result.packs_breakdown) return;

    let csvContent = `Product Name,${item.product_name}\n\n`;
    csvContent += `GENERAL SUMMARY\n`;
    csvContent += `Metric,Value\n`;
    csvContent += `Total Weight (kg),${result.summary.total_kg}\n`;
    csvContent += `Total Cost,${result.summary.total_cost}\n`;
    csvContent += `Average Cost per Kg,${result.summary.cost_per_kg}\n`;
    csvContent += `Selling Price per Kg,${result.summary.selling_price_per_kg}\n`;
    csvContent += `Total Revenue,${result.summary.total_revenue}\n`;
    csvContent += `${result.profit.is_loss ? "Total Loss" : "Total Profit"},${result.profit.total_profit}\n`;
    csvContent += `Profit per Kg,${result.profit.profit_per_kg}\n`;
    csvContent += `Margin (%),${result.profit.profit_margin_percent}%\n\n`;

    csvContent += `PACK BREAKDOWN\n`;
    csvContent += `Pack,Weight (kg),Cost,Cost/kg,Revenue,Profit\n`;
    result.packs_breakdown.forEach((pack) => {
      csvContent += `Pack ${pack.pack_number},${pack.kg},${pack.cost},${pack.cost_per_kg},${pack.revenue},${pack.profit}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${item.product_name.replace(/\s+/g, '_')}_History_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!token) return <div className="min-h-screen flex items-center justify-center font-bold text-black">Redirecting...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex justify-center pb-20 text-black">
      <div className="w-full max-w-4xl">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">📜 Saved History</h1>
          <button onClick={() => router.push("/")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition">
            ⬅ Back to Calculator
          </button>
        </div>

        {/* Filter Bar */}
        <form onSubmit={handleApplyFilter} className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-end border border-gray-200">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-700 mb-1">From (Date & Time)</label>
            <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-700 mb-1">To (Date & Time)</label>
            <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-gray-800 hover:bg-black text-white font-bold py-2 px-6 rounded-lg transition">Filter</button>
            <button type="button" onClick={handleClearFilter} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition">Clear</button>
          </div>
        </form>

        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 font-medium">{error}</div>}

        {loading ? (
          <div className="text-center font-bold text-gray-500 py-10">Loading...</div>
        ) : history.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow text-center text-gray-500 font-medium border border-gray-200">No calculations found.</div>
        ) : (
          <div className="grid gap-4">
            {history.map((item) => {
              const summary = item.result_data?.summary;
              const profit = item.result_data?.profit;
              const totalKg = summary?.total_kg || 0;
              const totalProfit = profit?.total_profit || 0;
              const isLoss = profit?.is_loss || false;

              return (
                <div 
                  key={item._id} 
                  onClick={() => setSelectedItem(item)}
                  className="bg-white rounded-xl shadow border border-gray-200 p-5 hover:shadow-lg hover:border-blue-400 cursor-pointer transition"
                >
                  <div className="flex justify-between items-start border-b pb-3 mb-3">
                    <div>
                      <h2 className="text-xl font-bold text-black">{item.product_name || "Unknown Product"}</h2>
                      <p className="text-sm text-gray-500">{formatDate(item.created_at)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${isLoss ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {isLoss ? "Loss" : "Profit"}: {money(totalProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Total Weight: <span className="font-bold text-black">{money(totalKg)} kg</span></span>
                    <span className="text-blue-600 font-bold">Click to view details →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL: Detailed View */}
      {/* ========================================== */}
      {selectedItem && selectedItem.result_data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 relative">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedItem(null)}
              className="absolute top-4 right-4 bg-gray-200 hover:bg-gray-300 text-black font-bold w-8 h-8 rounded-full flex items-center justify-center"
            >
              ✕
            </button>

            <h2 className="text-2xl font-bold text-black mb-1">{selectedItem.product_name} - Details</h2>
            <p className="text-sm text-gray-500 mb-6">{formatDate(selectedItem.created_at)}</p>

            {/* General Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4 mb-6">
              <div className="flex flex-wrap justify-between items-center border-b pb-2 gap-2">
                <h3 className="text-lg font-bold text-black">General Summary</h3>
                <button 
                  onClick={() => downloadCSV(selectedItem)}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition"
                >
                  ⬇️ Download Excel
                </button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Total Weight" value={`${money(selectedItem.result_data.summary?.total_kg || 0)} kg`} />
                <Stat label="Total Cost" value={money(selectedItem.result_data.summary?.total_cost || 0)} />
                <Stat label="Avg Cost/kg" value={money(selectedItem.result_data.summary?.cost_per_kg || 0)} />
                <Stat label="Selling Price/kg" value={money(selectedItem.result_data.summary?.selling_price_per_kg || 0)} />
              </div>
              
              <div className={`p-4 rounded-lg mt-4 border ${selectedItem.result_data.profit?.is_loss ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300"}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold ${selectedItem.result_data.profit?.is_loss ? "text-red-700" : "text-green-700"}`}>
                    {selectedItem.result_data.profit?.is_loss ? "📉 Total Loss" : "📈 Total Profit"}
                  </span>
                  <span className={`text-2xl font-black ${selectedItem.result_data.profit?.is_loss ? "text-red-700" : "text-green-700"}`}>
                    {money(selectedItem.result_data.profit?.total_profit || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1 font-medium text-gray-800">
                  <span>Profit per Kg: {money(selectedItem.result_data.profit?.profit_per_kg || 0)}</span>
                  <span>Margin: {selectedItem.result_data.profit?.profit_margin_percent || 0}%</span>
                </div>
              </div>
            </div>

            {/* Pack Breakdown */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="text-lg font-bold text-black mb-4 border-b pb-2">Pack Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-black">
                  <thead className="bg-gray-100 text-black font-bold">
                    <tr>
                      <th className="p-3 rounded-tl-lg">Pack</th>
                      <th className="p-3">Weight</th>
                      <th className="p-3">Cost</th>
                      <th className="p-3">Cost/kg</th>
                      <th className="p-3">Revenue</th>
                      <th className="p-3 rounded-tr-lg">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedItem.result_data.packs_breakdown?.map((pack) => (
                      <tr key={pack.pack_number} className="hover:bg-gray-50">
                        <td className="p-3 font-bold">Pack {pack.pack_number}</td>
                        <td className="p-3 font-medium">{pack.kg} kg</td>
                        <td className="p-3 font-medium">{money(pack.cost)}</td>
                        <td className="p-3 font-medium">{money(pack.cost_per_kg)}</td>
                        <td className="p-3 font-medium">{money(pack.revenue)}</td>
                        <td className={`p-3 font-bold ${pack.profit < 0 ? "text-red-600" : "text-green-600"}`}>
                          {money(pack.profit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}

// Reusable Stat Component
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
      <div className="text-xs font-bold text-gray-600 mb-1">{label}</div>
      <div className="font-bold text-black text-lg">{value}</div>
    </div>
  );
}