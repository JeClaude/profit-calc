"use client";

import { useState } from "react";

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
    profit_per_pack: number;
    total_profit: number;
    profit_margin_percent: number;
    is_loss: boolean;
  };
};

export default function Home() {
  const [form, setForm] = useState({
    product_name: "",
    packs: "",
    cost_per_pack: "",
    kg_per_pack: "",
    selling_price_per_kg: "",
  });

  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_name: form.product_name,
        packs: Number(form.packs),
        cost_per_pack: Number(form.cost_per_pack),
        kg_per_pack: Number(form.kg_per_pack),
        selling_price_per_kg: Number(form.selling_price_per_kg),
      }),
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const money = (n: number) =>
    new Intl.NumberFormat("en-RW").format(n);

  return (
    <main className="min-h-screen bg-gray-50 p-6 flex justify-center">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          💰 Profit Calculator
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow p-6 space-y-4"
        >
          <Input
            label="Product Name"
            name="product_name"
            value={form.product_name}
            onChange={handleChange}
            placeholder="e.g. Rice"
            type="text"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Number of Packs"
              name="packs"
              value={form.packs}
              onChange={handleChange}
              type="number"
              placeholder="5"
            />
            <Input
              label="Cost per Pack"
              name="cost_per_pack"
              value={form.cost_per_pack}
              onChange={handleChange}
              type="number"
              placeholder="15000"
            />
            <Input
              label="Kg per Pack"
              name="kg_per_pack"
              value={form.kg_per_pack}
              onChange={handleChange}
              type="number"
              placeholder="30"
            />
            <Input
              label="Selling Price per Kg"
              name="selling_price_per_kg"
              value={form.selling_price_per_kg}
              onChange={handleChange}
              type="number"
              placeholder="600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? "Calculating..." : "Calculate Profit"}
          </button>
        </form>

        {result && (
          <div className="mt-6 bg-white rounded-xl shadow p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-800">
              Results for {result.product_name}
            </h2>

            <Section title="📦 Purchase Summary">
              <Row label="Total Weight" value={`${money(result.summary.total_kg)} kg`} />
              <Row label="Total Cost" value={`${money(result.summary.total_cost)}`} />
              <Row label="Cost per Kg" value={`${money(result.summary.cost_per_kg)}`} />
            </Section>

            <Section title="🏷️ Selling">
              <Row
                label="Selling Price per Kg"
                value={`${money(result.summary.selling_price_per_kg)}`}
              />
              <Row
                label="Total Revenue (if all sold)"
                value={`${money(result.summary.total_revenue)}`}
              />
            </Section>

            <Section
              title={result.profit.is_loss ? "📉 Loss" : "📈 Profit"}
              highlight={result.profit.is_loss ? "red" : "green"}
            >
              <Row
                label="Profit per Kg"
                value={`${money(result.profit.profit_per_kg)}`}
              />
              <Row
                label="Profit per Pack"
                value={`${money(result.profit.profit_per_pack)}`}
              />
              <Row
                label="Total Profit"
                value={`${money(result.profit.total_profit)}`}
                bold
              />
              <Row
                label="Profit Margin"
                value={`${result.profit.profit_margin_percent}%`}
              />
            </Section>
          </div>
        )}
      </div>
    </main>
  );
}

function Input({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        {...props}
        required
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Section({
  title,
  children,
  highlight,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: "green" | "red";
}) {
  const bg =
    highlight === "green"
      ? "bg-green-50 border-green-200"
      : highlight === "red"
      ? "bg-red-50 border-red-200"
      : "bg-gray-50 border-gray-200";

  return (
    <div className={`border rounded-lg p-4 ${bg}`}>
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className={bold ? "font-bold text-gray-900" : "text-gray-800"}>
        {value}
      </span>
    </div>
  );
}