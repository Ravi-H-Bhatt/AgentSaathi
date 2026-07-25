"use client";

import { useState } from "react";

type TableName =
  | "nia_mediclaim_individual"
  | "nia_mediclaim_floater"
  | "nia_optional_cover_i"
  | "nia_optional_cover_ii"
  | "nia_optional_cover_iii"
  | "nia_topup_mediclaim";

const EXAMPLE_DATA = {
  nia_mediclaim_individual: `[
  {"zone": "zone1", "age_min": 11, "age_max": 11, "sum_insured": 100000, "premium": 3599},
  {"zone": "zone1", "age_min": 11, "age_max": 11, "sum_insured": 200000, "premium": 4937}
]`,
  nia_mediclaim_floater: `[
  {"zone": "zone1", "age_min": 1, "age_max": 1, "sum_insured": 200000, "premium": 2334},
  {"zone": "zone1", "age_min": 1, "age_max": 1, "sum_insured": 300000, "premium": 2720}
]`,
  nia_optional_cover_i: `[
  {"sum_insured": 400000, "age_band": "<35", "premium": 650},
  {"sum_insured": 400000, "age_band": "36-45", "premium": 690}
]`,
  nia_optional_cover_ii: `[
  {"sum_insured": 500000, "premium": 5000},
  {"sum_insured": 600000, "premium": 6000}
]`,
  nia_optional_cover_iii: `[
  {"sum_insured": 800000, "age_band": ">65", "premium": 3893},
  {"sum_insured": 1000000, "age_band": ">65", "premium": 4866}
]`,
  nia_topup_mediclaim: `[
  {"threshold": 100000, "sum_insured": 500000, "member_type": "primary", "age_band": "21-25", "premium": 1200},
  {"threshold": 100000, "sum_insured": 500000, "member_type": "additional", "age_band": "21-25", "premium": 800}
]`,
};

export default function PremiumDataManager() {
  const [selectedTable, setSelectedTable] = useState<TableName>("nia_mediclaim_individual");
  const [jsonData, setJsonData] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handleUpload = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // Parse JSON to validate
      const data = JSON.parse(jsonData);

      if (!Array.isArray(data)) {
        throw new Error("Data must be a JSON array");
      }

      const res = await fetch("/api/premium/upload-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: selectedTable,
          data,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setMessage({
        type: "success",
        text: `Successfully uploaded ${result.recordsUpserted} records to ${selectedTable}`,
      });
      setJsonData("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Failed to upload data",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setJsonData(EXAMPLE_DATA[selectedTable]);
  };

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">How to use:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Select the table you want to update</li>
          <li>Paste your premium data in JSON format (or click "Load Example")</li>
          <li>Click "Upload Data" to insert/update records</li>
        </ol>
        <p className="text-sm text-blue-700 mt-2">
          <strong>Note:</strong> Data with duplicate keys will be updated (upserted).
        </p>
      </div>

      {/* Table Selection */}
      <div className="bg-white rounded-lg shadow p-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Table
        </label>
        <select
          value={selectedTable}
          onChange={(e) => {
            setSelectedTable(e.target.value as TableName);
            setJsonData("");
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="nia_mediclaim_individual">
            Individual Mediclaim (zone, age_min, age_max, sum_insured, premium)
          </option>
          <option value="nia_mediclaim_floater">
            Floater Mediclaim (zone, age_min, age_max, sum_insured, premium)
          </option>
          <option value="nia_optional_cover_i">
            Optional Cover I (sum_insured, age_band, premium)
          </option>
          <option value="nia_optional_cover_ii">
            Optional Cover II (sum_insured, premium)
          </option>
          <option value="nia_optional_cover_iii">
            Optional Cover III (sum_insured, age_band, premium)
          </option>
          <option value="nia_topup_mediclaim">
            Top-Up Mediclaim (threshold, sum_insured, member_type, age_band, premium)
          </option>
        </select>
      </div>

      {/* JSON Data Input */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium text-gray-700">
            JSON Data
          </label>
          <button
            type="button"
            onClick={loadExample}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Load Example
          </button>
        </div>
        <textarea
          value={jsonData}
          onChange={(e) => setJsonData(e.target.value)}
          rows={15}
          className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder='[{"zone": "zone1", "age_min": 11, "age_max": 11, "sum_insured": 100000, "premium": 3599}]'
        />
      </div>

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={loading || !jsonData.trim()}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        {loading ? "Uploading..." : "Upload Data"}
      </button>

      {/* Message Display */}
      {message && (
        <div
          className={`rounded-lg p-4 ${
            message.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <p className="font-medium">
            {message.type === "success" ? "Success" : "Error"}
          </p>
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* Field Reference */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-3">Field Reference</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <p>
            <strong>zone:</strong> "zone1" (Maharashtra & Gujarat) or "zone2" (Rest of
            India)
          </p>
          <p>
            <strong>age_min, age_max:</strong> Age range for the premium (e.g., 35, 35
            for exact age 35)
          </p>
          <p>
            <strong>sum_insured:</strong> Sum insured amount in rupees (e.g., 500000 for
            ₹5L)
          </p>
          <p>
            <strong>premium:</strong> Premium amount in rupees
          </p>
          <p>
            <strong>age_band:</strong> "&lt;35", "36-45", "46-50", "51-55", "56-60",
            "61-65", "&gt;65"
          </p>
          <p>
            <strong>threshold:</strong> Threshold/Deductible amount for Top-Up (e.g.,
            300000)
          </p>
          <p>
            <strong>member_type:</strong> "primary" or "additional" for Top-Up
          </p>
        </div>
      </div>
    </div>
  );
}
