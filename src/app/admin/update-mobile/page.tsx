"use client";

import { useState } from "react";
import { Upload, CheckCircle2, AlertCircle, X, Download, Info } from "lucide-react";

interface UpdateResult {
  clientName: string;
  status: "updated" | "not_found" | "skipped" | "error";
  phone?: string;
  email?: string;
  message?: string;
}

interface Summary {
  total: number;
  updated: number;
  notFound: number;
  skipped: number;
  errors: number;
}

export default function UpdateMobileNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [results, setResults] = useState<UpdateResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setSummary(null);
    setResults([]);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/update-mobile-numbers", {
        method: "POST",
        body: form,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Upload failed");
      } else {
        setSummary(data.summary);
        setResults(data.results || []);
        setFile(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const content = "Client Name\tMobile Number\tEmail\nAakash Shah\t9512039766\taakash@email.com\nAbhay Shah\t9376115120\t";
    const blob = new Blob([content], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mobile_numbers_template.txt";
    a.click();
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Update Mobile Numbers
        </h1>
        <p className="text-gray-600">
          Upload an Excel file to batch update client phone numbers and emails
        </p>
      </div>

      {/* Instructions Banner */}
      <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
        <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <p className="font-semibold mb-2">📋 Excel Format Required:</p>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>
              <strong>Column 1:</strong> Client Name (must match exactly)
            </li>
            <li>
              <strong>Column 2:</strong> Mobile Number (10 digits, no +91)
            </li>
            <li>
              <strong>Column 3:</strong> Email (optional, with @ symbol)
            </li>
          </ul>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="mb-8 p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <label className="block cursor-pointer">
          <div className="flex flex-col items-center justify-center py-8">
            <Upload size={32} className="mb-3 text-gray-400" />
            <p className="text-lg font-medium text-gray-900 mb-1">
              {file ? file.name : "Select Excel file"}
            </p>
            <p className="text-sm text-gray-600">
              {file ? "Click to change file" : "(.xlsx or .xls)"}
            </p>
          </div>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            disabled={loading}
          />
        </label>

        <div className="mt-6 flex gap-3">
          <button
            type="submit"
            disabled={!file || loading}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Processing..." : "Upload & Update"}
          </button>
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition flex items-center gap-2"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Template</span>
          </button>
        </div>
      </form>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Summary */}
      {summary && (
        <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900 mb-4 text-lg">
            ✓ Update Complete
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div>
              <p className="text-gray-600 text-sm">Total</p>
              <p className="text-3xl font-bold text-gray-900">
                {summary.total}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Updated</p>
              <p className="text-3xl font-bold text-green-600">
                {summary.updated}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Not Found</p>
              <p className="text-3xl font-bold text-yellow-600">
                {summary.notFound}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Skipped</p>
              <p className="text-3xl font-bold text-blue-600">
                {summary.skipped}
              </p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Errors</p>
              <p className="text-3xl font-bold text-red-600">
                {summary.errors}
              </p>
            </div>
          </div>

          {summary.updated > 0 && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="mt-4 text-sm text-green-700 hover:text-green-900 font-medium"
            >
              {showDetails ? "Hide" : "Show"} Details
            </button>
          )}
        </div>
      )}

      {/* Detailed Results */}
      {showDetails && results.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-4">Update Details</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border text-sm ${
                  result.status === "updated"
                    ? "bg-green-50 border-green-200"
                    : result.status === "not_found"
                    ? "bg-yellow-50 border-yellow-200"
                    : result.status === "skipped"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  {result.status === "updated" && (
                    <CheckCircle2 size={16} className="text-green-600 mt-0.5" />
                  )}
                  {result.status === "not_found" && (
                    <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
                  )}
                  {result.status === "skipped" && (
                    <AlertCircle size={16} className="text-blue-600 mt-0.5" />
                  )}
                  {result.status === "error" && (
                    <X size={16} className="text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {result.clientName}
                    </p>
                    {result.phone && (
                      <p className="text-gray-600">📱 {result.phone}</p>
                    )}
                    {result.email && (
                      <p className="text-gray-600">📧 {result.email}</p>
                    )}
                    {result.message && (
                      <p className="text-gray-600 text-xs mt-1">
                        {result.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!summary && !error && (
        <div className="text-center py-12 text-gray-500">
          <Upload size={48} className="mx-auto mb-3 opacity-20" />
          <p>Select an Excel file to get started</p>
        </div>
      )}
    </div>
  );
}
