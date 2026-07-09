"use client";

import { useState } from "react";
import { Button } from "./ui/button";

interface ManualPolicyFormProps {
  onSuccess?: (policy: any) => void;
  onClose?: () => void;
}

export function ManualPolicyForm({ onSuccess, onClose }: ManualPolicyFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    // MANDATORY
    client_name: "",
    policy_number: "",
    company: "",
    product_name: "",
    start_date: "",
    renewal_date: "",
    // OPTIONAL
    client_phone: "",
    client_email: "",
    client_address: "",
    policy_type: "",
    sum_insured: "",
    premium: "",
    mode: "",
    age: "",
    date_of_birth: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate mandatory fields
      if (
        !form.client_name ||
        !form.policy_number ||
        !form.company ||
        !form.product_name ||
        !form.start_date ||
        !form.renewal_date
      ) {
        throw new Error("Please fill all required fields marked with *");
      }

      // Validate dates
      if (new Date(form.renewal_date) <= new Date(form.start_date)) {
        throw new Error("Renewal date must be after start date");
      }

      // Parse optional numeric fields
      const payload = {
        client_name: form.client_name,
        policy_number: form.policy_number,
        company: form.company,
        product_name: form.product_name,
        start_date: form.start_date,
        renewal_date: form.renewal_date,
        client_phone: form.client_phone || null,
        client_email: form.client_email || null,
        client_address: form.client_address || null,
        policy_type: form.policy_type || null,
        sum_insured: form.sum_insured ? parseInt(form.sum_insured) : null,
        premium: form.premium ? parseInt(form.premium) : null,
        mode: form.mode || null,
        age: form.age ? parseInt(form.age) : null,
        date_of_birth: form.date_of_birth || null,
      };

      const response = await fetch("/api/policies/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to create policy");
      }

      const data = await response.json();
      setSuccess(true);
      onSuccess?.(data.policy);

      // Reset form
      setTimeout(() => {
        setForm({
          client_name: "",
          policy_number: "",
          company: "",
          product_name: "",
          start_date: "",
          renewal_date: "",
          client_phone: "",
          client_email: "",
          client_address: "",
          policy_type: "",
          sum_insured: "",
          premium: "",
          mode: "",
          age: "",
          date_of_birth: "",
        });
        setSuccess(false);
        onClose?.();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800 font-medium">✓ Policy created successfully!</p>
        <p className="text-sm text-green-700 mt-1">Redirecting...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* MANDATORY SECTION */}
      <div className="border-b pb-6">
        <h3 className="text-lg font-semibold mb-4">Required Information *</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Client Name *</label>
            <input
              type="text"
              name="client_name"
              value={form.client_name}
              onChange={handleChange}
              placeholder="Full name of insured"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Policy Number *</label>
            <input
              type="text"
              name="policy_number"
              value={form.policy_number}
              onChange={handleChange}
              placeholder="e.g., 21060034249500001817"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Company/Insurer *</label>
            <input
              type="text"
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="e.g., The New India Assurance Co. Ltd."
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Product Name *</label>
            <input
              type="text"
              name="product_name"
              value={form.product_name}
              onChange={handleChange}
              placeholder="e.g., New India Mediclaim Policy"
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Start Date *</label>
            <input
              type="date"
              name="start_date"
              value={form.start_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Renewal Date *</label>
            <input
              type="date"
              name="renewal_date"
              value={form.renewal_date}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
              required
            />
          </div>
        </div>
      </div>

      {/* OPTIONAL SECTION */}
      <div className="border-b pb-6">
        <h3 className="text-lg font-semibold mb-4">Additional Information (Optional)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              name="client_phone"
              value={form.client_phone}
              onChange={handleChange}
              placeholder="10-digit mobile"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              name="client_email"
              value={form.client_email}
              onChange={handleChange}
              placeholder="email@example.com"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              name="client_address"
              value={form.client_address}
              onChange={handleChange}
              placeholder="Full address"
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Policy Type (Code)</label>
            <input
              type="text"
              name="policy_type"
              value={form.policy_type}
              onChange={handleChange}
              placeholder="e.g., UK, NP, SH"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Premium Mode</label>
            <select
              name="mode"
              value={form.mode}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Select...</option>
              <option value="Mly">Monthly (Mly)</option>
              <option value="QLY">Quarterly (QLY)</option>
              <option value="HLY">Half-Yearly (HLY)</option>
              <option value="YLY">Yearly (YLY)</option>
              <option value="SGL">Single (SGL)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Sum Insured</label>
            <input
              type="number"
              name="sum_insured"
              value={form.sum_insured}
              onChange={handleChange}
              placeholder="e.g., 500000"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Premium</label>
            <input
              type="number"
              name="premium"
              value={form.premium}
              onChange={handleChange}
              placeholder="e.g., 22941"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Age</label>
            <input
              type="number"
              name="age"
              value={form.age}
              onChange={handleChange}
              placeholder="Age in years"
              min="0"
              max="120"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex gap-3">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? "Creating..." : "Create Policy"}
        </Button>
        {onClose && (
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>

      <p className="text-xs text-muted text-center">
        * Indicates required field. Other fields can be added later.
      </p>
    </form>
  );
}
