"use client";

import { useState } from "react";
import { X, Loader2, Upload, Check } from "lucide-react";
import type { Policy } from "@/lib/types";

interface MotorPolicyEditorProps {
  policy: Policy;
  clientName: string;
  onClose: () => void;
  onUpdate: () => void;
}

/**
 * Modal for editing motor policy specific fields and uploading documents
 */
export function MotorPolicyEditor({
  policy,
  clientName,
  onClose,
  onUpdate,
}: MotorPolicyEditorProps) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Form state
  const [sumInsured, setSumInsured] = useState(policy.sum_insured?.toString() || "");
  const [policyNumber, setPolicyNumber] = useState(policy.policy_number || "");
  const [vehicleMake, setVehicleMake] = useState(policy.vehicle_make || "");
  const [vehicleModel, setVehicleModel] = useState(policy.vehicle_model || "");
  const [registrationNumber, setRegistrationNumber] = useState(policy.registration_number || "");
  const [yearOfRegistration, setYearOfRegistration] = useState(policy.year_of_registration?.toString() || "");
  const [cubicCapacity, setCubicCapacity] = useState(policy.cubic_capacity?.toString() || "");

  async function handleSave() {
    setSaving(true);
    setNotice(null);
    
    try {
      const updates: Record<string, unknown> = {};
      
      if (sumInsured) updates.sum_insured = parseFloat(sumInsured);
      if (policyNumber) updates.policy_number = policyNumber;
      if (vehicleMake) updates.vehicle_make = vehicleMake;
      if (vehicleModel) updates.vehicle_model = vehicleModel;
      if (registrationNumber) updates.registration_number = registrationNumber.toUpperCase();
      if (yearOfRegistration) updates.year_of_registration = parseInt(yearOfRegistration);
      if (cubicCapacity) updates.cubic_capacity = parseInt(cubicCapacity);

      const res = await fetch("/api/policies/motor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policyId: policy.id,
          ...updates,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update policy");

      setNotice({ type: "ok", msg: "Motor policy details saved successfully" });
      setTimeout(() => {
        onUpdate();
        onClose();
      }, 1000);
    } catch (error) {
      setNotice({
        type: "err",
        msg: error instanceof Error ? error.message : "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Only accept PDFs
    if (file.type !== "application/pdf") {
      setNotice({ type: "err", msg: "Only PDF files are accepted" });
      return;
    }

    setUploading(true);
    setNotice(null);

    try {
      // Upload to storage
      const formData = new FormData();
      formData.append("file", file);
      formData.append("policyId", policy.id);
      formData.append("clientName", clientName);

      const res = await fetch("/api/policies/upload-document", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setNotice({ type: "ok", msg: "Policy document uploaded successfully" });
      setTimeout(() => {
        onUpdate();
      }, 1000);
    } catch (error) {
      setNotice({
        type: "err",
        msg: error instanceof Error ? error.message : "Upload failed",
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-border p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Motor Policy Details</h2>
            <p className="text-sm text-muted mt-0.5">
              {policy.policy_type || "Motor Policy"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Notice */}
        {notice && (
          <div
            className={`mx-4 mt-4 rounded-lg px-4 py-3 text-sm ${
              notice.type === "ok"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {notice.msg}
          </div>
        )}

        {/* Form */}
        <div className="p-6 space-y-5">
          {/* Upload Document Section */}
          <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
            <div className="space-y-3">
              <div className="flex justify-center">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                  <Upload size={20} className="text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-sm">Upload Policy Document</h3>
                <p className="text-xs text-muted mt-1">
                  Upload the policy PDF without parsing
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition cursor-pointer disabled:opacity-50">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="sr-only"
                />
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading...
                  </>
                ) : policy.source_file_path ? (
                  <>
                    <Check size={16} />
                    Replace Document
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Choose PDF
                  </>
                )}
              </label>
              {policy.source_file_path && (
                <p className="text-xs text-green-600 font-medium">
                  ✓ Document attached
                </p>
              )}
            </div>
          </div>

          {/* Basic Fields */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Basic Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Policy Number {!policy.policy_number && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  placeholder="Enter policy number"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Sum Insured {!policy.sum_insured && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  value={sumInsured}
                  onChange={(e) => setSumInsured(e.target.value)}
                  placeholder="Enter sum insured"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Vehicle Details</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Make {!policy.vehicle_make && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  placeholder="e.g., Honda, Maruti"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Model
                </label>
                <input
                  type="text"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="e.g., Activa, Swift"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Registration Number {!policy.registration_number && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={registrationNumber}
                  onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                  placeholder="e.g., MH02AB1234"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Year of Registration {!policy.year_of_registration && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="number"
                  value={yearOfRegistration}
                  onChange={(e) => setYearOfRegistration(e.target.value)}
                  placeholder="e.g., 2020"
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Cubic Capacity (cc)
                </label>
                <input
                  type="number"
                  value={cubicCapacity}
                  onChange={(e) => setCubicCapacity(e.target.value)}
                  placeholder="e.g., 110"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-muted mt-1">
                  For two-wheelers only
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-border p-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving || uploading}
            className="px-4 py-2 text-sm font-medium rounded-full border border-border hover:bg-black/5 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || uploading}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-full bg-foreground text-background hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={16} />
                Save Details
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
