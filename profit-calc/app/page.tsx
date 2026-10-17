"use client";

import { useState, useEffect } from "react";

// ... (Keep your TypeScript types: PackResult, Result)

export default function Home() {
  const [productName, setProductName] = useState("");
  const [numPacks, setNumPacks] = useState("");
  const [sellingPricePerKg, setSellingPricePerKg] = useState("");
  
  // Start with an empty array (no packs by default)
  const [packDetails, setPackDetails] = useState<{ kg: string; cost: string }[]>([]);
  
  const [result, setResult] = useState<any>(null); // Use your Result type here
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamically update pack fields when numPacks changes
  useEffect(() => {
    const count = parseInt(numPacks) || 0;
    
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
          
          <Input 
            label="Product Name" 
            value={productName} 
            onChange={(e) => setProductName(e.target.value)} 
            placeholder="e.g. Rice" 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Number of Packs" 
              type="number" 
              min="1" 
              value={numPacks} 
              onChange={(e) => setNumPacks(e.target.value)} 
              placeholder="e.g. 5"
            />
            <Input 
              label="Selling Price per Kg" 
              type="number" 
              value={sellingPricePerKg} 
              onChange={(e) => setSellingPricePerKg(e.target.value)} 
              placeholder="600" 
            />
          </div>

          {/* ONLY show this section if the user has typed a number > 0 */}
          {packDetails.length > 0 && (
            <div className="border-t pt-4 animate-in fade-in duration-300">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">
                Pack Details
              </h3>
              <div className="space-y-3">
                {packDetails.map((pack, index) => (
                  <div key={index} className="flex gap-4 items-end bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <span className="font-medium text-gray-600 mb-2 w-16">
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
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || packDetails.length === 0} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Calculating..." : "Calculate Profit"}
          </button>
          
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
        </form>

        {/* ... (Keep your Results UI the same) ... */}
        {/* You can copy the results rendering code from the previous message here */}
        
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