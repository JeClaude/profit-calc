"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useRouter } from "next/navigation";

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
  const { token, logout } = useAuth();
  const router = useRouter();

  const [productName, setProductName] = useState("");
  const [sellingPricePerKg, setSellingPricePerKg] = useState("");
  
  // Start with exactly 1 pack
  const [packDetails, setPackDetails] = useState<{ kg: string; cost: string }[]>([
    { kg: "", cost: "" }
  ]);
  
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Protect the route: If no token, kick them to login
  useEffect(() => {
    if (!token) {
      router.push("/login");
    }
  }, [token, router]);

  // Prevent UI flash if not authenticated
  if (!token) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-black">Checking authentication...</div>;
  }

  // Add a new empty pack
  const addPack = () => {
    setPackDetails([...packDetails, { kg: "", cost: "" }]);
  };

  // Remove a pack by index
  const removePack = (index: number) => {
    if (packDetails.length > 1) {
      const updated = packDetails.filter((_, i) => i !== index);
      setPackDetails(updated);
    }
  };

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
    setSaveStatus(null);

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

  // Save to MongoDB Database
  const saveCalculation = async () => {
    if (!result) return;
    setSaveStatus("Saving...");
    try {
      const res = await fetch("/api/save-calculation", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          product_name: result.product_name,
          packs: result.packs_breakdown.map((p) => ({ kg: p.kg, cost: p.cost })),
          selling_price_per_kg: result.summary.selling_price_per_kg,
          result_data: result
        }),
      });
      
      if (!res.ok) throw new Error("Failed to save");
      
      setSaveStatus("✅ Saved to History!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus("❌ Error saving data");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Export to Excel/CSV
  const downloadCSV = () => {
    if (!result) return;

    let csvContent = `Product Name,${result.product_name}\n\n`;
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
    link.setAttribute("download", `${result.product_name.replace(/\s+/g, '_')}_Profit_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const money = (n: number) => new Intl.NumberFormat("en-RW").format(n);

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex justify-center pb-20 text-black">
      <div className="w-full max-w-3xl">
        
        {/* Header with Logout & History Link */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-black">💰 Profit Calculator</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push("/history")} 
              className="text-blue-600 font-bold hover:underline"
            >
              View History
            </button>
            <button onClick={logout} className="text-red-600 font-bold hover:underline">
              Logout
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-6">
          
          <Input 
            label="Product Name" 
            value={productName} 
            onChange={(e) => setProductName(e.target.value)} 
            placeholder="e.g. Rice" 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b pb-6">
            <Input 
              label="Selling Price per Kg" 
              type="number" 
              value={sellingPricePerKg} 
              onChange={(e) => setSellingPricePerKg(e.target.value)} 
              placeholder="600" 
            />
          </div>

          {/* Pack Details Section */}
          <div>
            <h3 className="text-lg font-bold text-black mb-3">Pack Details</h3>
            <div className="space-y-3">
              {packDetails.map((pack, index) => (
                <div key={index} className="flex gap-4 items-end bg-gray-50 p-3 rounded-lg border border-gray-300">
                  <span className="font-bold text-black mb-2 w-16">
                    Pack {index + 1}
                  </span>
                  <div className="flex-1">
                    <Input 
                      label="Weight (kg)" 
                      type="number" 
                      value={pack.kg} 
                      onChange={(e) => handlePackChange(index, "kg", e.target.value)} 
                      placeholder="30" 
                    />
                  </div>
                  <div className="flex-1">
                    <Input 
                      label="Cost" 
                      type="number" 
                      value={pack.cost} 
                      onChange={(e) => handlePackChange(index, "cost", e.target.value)} 
                      placeholder="15000" 
                    />
                  </div>
                  
                  {/* Show Remove button only if there is more than 1 pack */}
                  {packDetails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePack(index)}
                      className="mb-1 bg-red-100 text-red-600 hover:bg-red-200 font-bold px-3 py-2 rounded-lg transition"
                      title="Remove this pack"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Pack Button */}
            <button
              type="button"
              onClick={addPack}
              className="mt-4 w-full border-2 border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 font-bold py-3 rounded-lg transition"
            >
              + Add Another Pack
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Calculating..." : "Calculate Profit"}
          </button>
          
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium">{error}</div>}
        </form>

        {/* Results Section */}
        {result && (
          <div className="mt-8 space-y-6">
            
            {/* General Summary */}
            <div className="bg-white rounded-xl shadow p-6 space-y-4">
              <div className="flex flex-wrap justify-between items-center border-b pb-2 gap-2">
                <h2 className="text-xl font-bold text-black">General Summary</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={saveCalculation}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition"
                  >
                    {saveStatus ? saveStatus : "💾 Save Calculation"}
                  </button>
                  <button 
                    onClick={downloadCSV}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2 px-4 rounded-lg transition"
                  >
                    ⬇️ Download Excel
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Total Weight" value={`${money(result.summary.total_kg)} kg`} />
                <Stat label="Total Cost" value={money(result.summary.total_cost)} />
                <Stat label="Avg Cost/kg" value={money(result.summary.cost_per_kg)} />
                <Stat label="Selling Price/kg" value={money(result.summary.selling_price_per_kg)} />
              </div>
              
              {/* Profit/Loss Box */}
              <div className={`p-4 rounded-lg mt-4 border ${result.profit.is_loss ? "bg-red-50 border-red-300" : "bg-green-50 border-green-300"}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-lg font-bold ${result.profit.is_loss ? "text-red-700" : "text-green-700"}`}>
                    {result.profit.is_loss ? "📉 Total Loss" : "📈 Total Profit"}
                  </span>
                  <span className={`text-2xl font-black ${result.profit.is_loss ? "text-red-700" : "text-green-700"}`}>
                    {money(result.profit.total_profit)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1 font-medium text-gray-800">
                  <span>Profit per Kg: {money(result.profit.profit_per_kg)}</span>
                  <span>Margin: {result.profit.profit_margin_percent}%</span>
                </div>
              </div>
            </div>

            {/* Individual Pack Breakdown */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold text-black mb-4 border-b pb-2">Pack Breakdown</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-black">
                  <thead className="bg-gray-200 text-black font-bold">
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
        )}
        
      </div>
    </main>
  );
}

// Reusable Input Component
function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="w-full">
      <label className="block text-sm font-bold text-black mb-1">{label}</label>
      <input
        {...props}
        required
        className="w-full border border-gray-400 rounded-lg px-3 py-2 text-black font-medium placeholder:text-gray-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
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