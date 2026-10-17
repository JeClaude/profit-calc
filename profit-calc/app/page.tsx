"use client";

import { useState, useEffect } from "react";

// Types based on our new backend response
type PackResult = {
  pack_number: number;
  kg: number;
  cost: number;
  cost_per_kg: number;
  revenue: number;
  profit: number;
  profit_margin_percent: number;
};

type Result = {
  product_name: string;
  summary: {
    total_kg: number;
    total_cost: number;
    cost_per_kg: number;
    selling_price_per_kg: number;
    total_revenue: number;
  };
  profit: {
    profit_per_kg: number;
    total_profit: number;
    profit_margin_percent: number;
    is_loss: boolean;
  };
  packs_breakdown: PackResult[];
};

export default function Home() {
  const [productName, setProductName] = useState("");
  const [numPacks, setNumPacks] = useState<string>("1");
  const [sellingPricePerKg, setSellingPricePerKg] = useState("");
  
  // Array to hold the details of each pack
  const [packDetails, setPackDetails] = useState([{ kg: "", cost: "" }]);
  
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamically update pack fields when numPacks changes
  useEffect(() => {
    const count = parseInt(numPacks) || 1;
    setPackDetails((prev) => {
      const newPacks = [...prev];
      if (count > newPacks.length) {
        // Add new empty packs
        for (let i = newPacks.length; i < count; i++) {
          newPacks.push({ kg: "", cost: "" });
        }
      } else if (count < newPacks.length) {
        // Remove extra packs
        newPacks.length = count;
      }
      return newPacks;
    });
  }, [numPacks]);

  const handlePackChange = (index: number, field: "kg" | "cost", value: string) => {
    const updated = [...packDetails];
    updated[index][field] = value;
    setPackDetails(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: productName,
          packs: packDetails.map(p => ({
            kg: Number(p.kg),
            cost: Number(p.cost)
          })),
          selling_price_per_kg: Number(sellingPricePerKg),
        }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate");
    } finally {
      setLoading(false);
    }
  };

  const money = (n: number) => new Intl.NumberFormat("en-RW").format(n);

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex justify-center pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">💰 Profit Calculator</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-6">
          <Input label="Product Name" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Rice" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Number of Packs" type="number" min="1" value={numPacks} onChange={(e) => setNumPacks(e.target.value)} />
            <Input label="Selling Price per Kg" type="number" value={sellingPricePerKg} onChange={(e) => setSellingPricePerKg(e.target.value)} placeholder="600" />
          </div>

          {/* Dynamic Pack Details */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Pack Details</h3>
            <div className="space-y-3">
              {packDetails.map((pack, index) => (
                <div key={index} className="flex gap-4 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <span className="font-medium text-gray-600 mb-2 w-16">Pack {index + 1}</span>
                  <div className="flex-1">
                    <Input label="Weight (kg)" type="number" value={pack.kg} onChange={(e) => handlePackChange(index, "kg", e.target.value)} placeholder="30" />
                  </div>
                  <div className="flex-1">
                    <Input label="Cost" type="number" value={pack.cost} onChange={(e) => handlePackChange(index, "cost", e.target.value)} placeholder="15000" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50">
            {loading ? "Calculating..." : "Calculate Profit"}
          </button>
          
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        </form>

        {result && (
          <div className="mt-8 space-y-6">
            {/* General Summary */}
            <div className="bg-white rounded-xl shadow p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2">General Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Total Weight" value={`${money(result.summary.total_kg)} kg`} />
                <Stat label="Total Cost" value={money(result.summary.total_cost)} />
                <Stat label="Avg Cost/kg" value={money(result.summary.cost_per_kg)} />
                <Stat label="Selling Price/kg" value={money(result.summary.selling_price_per_kg)} />
              </div>
              
              <div className={`p-4 rounded-lg mt-4 ${result.profit.is_loss ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">{result.profit.is_loss ? "📉 Total Loss" : "📈 Total Profit"}</span>
                  <span className={`text-2xl font-bold ${result.profit.is_loss ? "text-red-600" : "text-green-600"}`}>
                    {money(result.profit.total_profit)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1 text-gray-600">
                  <span>Profit per Kg: {money(result.profit.profit_per_kg)}</span>
                  <span>Margin: {result.profit.profit_margin_percent}%</span>
                </div>
              </div>
            </div>

            {/* Individual Pack Breakdown */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Pack Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 text-gray-700">
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
                    {result.packs_breakdown.map((pack) => (
                      <tr key={pack.pack_number} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">Pack {pack.pack_number}</td>
                        <td className="p-3">{pack.kg} kg</td>
                        <td className="p-3">{money(pack.cost)}</td>
                        <td className="p-3">{money(pack.cost_per_kg)}</td>
                        <td className="p-3">{money(pack.revenue)}</td>
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
        )}
      </div>
    </main>
  );
}

// Reusable Input Component
function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        {...props}
        required
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

// Reusable Stat Component
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-semibold text-gray-800">{value}</div>
    </div>
  );
}