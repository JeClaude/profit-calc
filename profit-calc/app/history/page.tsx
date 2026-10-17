"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

type HistoryItem = {
  _id: string;
  created_at: string;
  product_name: string;
  selling_price_per_kg: number;
  result_data?: { // Make this optional just in case
    summary?: {
      total_kg: number;
      total_cost: number;
    };
    profit?: {
      total_profit: number;
      is_loss: boolean;
    };
  };
};

export default function HistoryPage() {
  const { token } = useAuth();
  const router = useRouter();
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/history", {
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

    fetchHistory();
  }, [token, router]);

  const money = (n: number) => new Intl.NumberFormat("en-RW").format(n);

  const formatDate = (dateString: string) => {
    if (!dateString) return "Unknown Date";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };

  if (!token || loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-black">Loading history...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex justify-center pb-20 text-black">
      <div className="w-full max-w-4xl">
        
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">📜 Saved History</h1>
          <button 
            onClick={() => router.push("/")} 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition"
          >
            ⬅ Back to Calculator
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 font-medium">{error}</div>}

        {history.length === 0 && !error ? (
          <div className="bg-white p-10 rounded-xl shadow text-center text-gray-500 font-medium">
            You haven't saved any calculations yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {history.map((item) => {
              // Safely extract data with fallbacks
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