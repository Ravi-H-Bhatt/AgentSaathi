"use client";

import { useState } from "react";
import type {
  PolicyType,
  Zone,
  IndividualMediclaimInput,
  FloaterMediclaimInput,
  TopUpMediclaimInput,
  PremiumBreakdown,
} from "@/lib/premium-calculator";

const SUM_INSURED_OPTIONS = [
  100000, 200000, 300000, 400000, 500000, 600000, 700000, 800000, 1000000,
  1200000, 1500000, 2000000, 2500000, 3000000,
];

const THRESHOLD_OPTIONS = [
  300000, 400000, 500000, 600000, 700000, 800000, 1000000, 1500000, 2000000,
];

export default function PremiumCalculator() {
  const [policyType, setPolicyType] = useState<PolicyType>("individual");
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<PremiumBreakdown | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Individual/Floater fields
  const [age, setAge] = useState(30);
  const [eldestAge, setEldestAge] = useState(35);
  const [sumInsured, setSumInsured] = useState(500000);
  const [zone, setZone] = useState<Zone>("zone1");
  const [numberOfMembers, setNumberOfMembers] = useState(2);
  const [optionalCoverI, setOptionalCoverI] = useState(false);
  const [optionalCoverII, setOptionalCoverII] = useState(false);
  const [optionalCoverIII, setOptionalCoverIII] = useState(false);
  const [voluntaryCoPay, setVoluntaryCoPay] = useState(false);
  const [optionalCoverV, setOptionalCoverV] = useState(false);
  const [policyTerm, setPolicyTerm] = useState<1 | 2 | 3>(1);

  // Top-Up fields
  const [threshold, setThreshold] = useState(500000);
  const [primaryMemberAge, setPrimaryMemberAge] = useState(30);
  const [additionalMembers, setAdditionalMembers] = useState<Array<{ age: number }>>([]);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    setBreakdown(null);

    try {
      let input: IndividualMediclaimInput | FloaterMediclaimInput | TopUpMediclaimInput;

      if (policyType === "individual") {
        input = {
          policyType: "individual",
          age,
          sumInsured,
          zone,
          optionalCoverI,
          optionalCoverII,
          optionalCoverIII,
          voluntaryCoPay,
          optionalCoverV,
          policyTerm,
        };
      } else if (policyType === "floater") {
        input = {
          policyType: "floater",
          eldestAge,
          sumInsured,
          zone,
          numberOfMembers,
          optionalCoverI,
          optionalCoverII,
          optionalCoverIII,
          voluntaryCoPay,
          optionalCoverV,
          policyTerm,
        };
      } else {
        input = {
          policyType: "topup",
          threshold,
          sumInsured,
          primaryMemberAge,
          additionalMembers: additionalMembers.length > 0 ? additionalMembers : undefined,
        };
      }

      const response = await fetch("/api/premium/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to calculate premium");
      }

      const data: PremiumBreakdown = await response.json();
      setBreakdown(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addAdditionalMember = () => {
    setAdditionalMembers([...additionalMembers, { age: 25 }]);
  };

  const removeAdditionalMember = (index: number) => {
    setAdditionalMembers(additionalMembers.filter((_, i) => i !== index));
  };

  const updateAdditionalMemberAge = (index: number, age: number) => {
    const updated = [...additionalMembers];
    updated[index] = { age };
    setAdditionalMembers(updated);
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">New India Premium Calculator</h1>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Policy Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Policy Type</label>
          <select
            className="w-full border rounded-md p-2"
            value={policyType}
            onChange={(e) => setPolicyType(e.target.value as PolicyType)}
          >
            <option value="individual">Individual Mediclaim</option>
            <option value="floater">Floater Mediclaim</option>
            <option value="topup">Top-Up Mediclaim</option>
          </select>
        </div>

        {/* Individual Mediclaim Fields */}
        {policyType === "individual" && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Age</label>
                <input
                  type="number"
                  className="w-full border rounded-md p-2"
                  value={age}
                  onChange={(e) => setAge(parseInt(e.target.value))}
                  min={18}
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Zone</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={zone}
                  onChange={(e) => setZone(e.target.value as Zone)}
                >
                  <option value="zone1">Zone 1</option>
                  <option value="zone2">Zone 2</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Floater Mediclaim Fields */}
        {policyType === "floater" && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Eldest Member Age</label>
                <input
                  type="number"
                  className="w-full border rounded-md p-2"
                  value={eldestAge}
                  onChange={(e) => setEldestAge(parseInt(e.target.value))}
                  min={18}
                  max={100}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Number of Members</label>
                <input
                  type="number"
                  className="w-full border rounded-md p-2"
                  value={numberOfMembers}
                  onChange={(e) => setNumberOfMembers(parseInt(e.target.value))}
                  min={2}
                  max={10}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Zone</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={zone}
                  onChange={(e) => setZone(e.target.value as Zone)}
                >
                  <option value="zone1">Zone 1</option>
                  <option value="zone2">Zone 2</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* Top-Up Mediclaim Fields */}
        {policyType === "topup" && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">Threshold</label>
                <select
                  className="w-full border rounded-md p-2"
                  value={threshold}
                  onChange={(e) => setThreshold(parseInt(e.target.value))}
                >
                  {THRESHOLD_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      ₹{t.toLocaleString("en-IN")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Primary Member Age</label>
                <input
                  type="number"
                  className="w-full border rounded-md p-2"
                  value={primaryMemberAge}
                  onChange={(e) => setPrimaryMemberAge(parseInt(e.target.value))}
                  min={18}
                  max={70}
                />
              </div>
            </div>

            {/* Additional Members */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Additional Members</label>
              {additionalMembers.map((member, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="number"
                    className="flex-1 border rounded-md p-2"
                    value={member.age}
                    onChange={(e) => updateAdditionalMemberAge(index, parseInt(e.target.value))}
                    placeholder="Age"
                    min={18}
                    max={70}
                  />
                  <button
                    type="button"
                    onClick={() => removeAdditionalMember(index)}
                    className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAdditionalMember}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Add Member
              </button>
            </div>
          </>
        )}

        {/* Common: Sum Insured */}
        {policyType !== "topup" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Sum Insured</label>
            <select
              className="w-full border rounded-md p-2"
              value={sumInsured}
              onChange={(e) => setSumInsured(parseInt(e.target.value))}
            >
              {SUM_INSURED_OPTIONS.map((si) => (
                <option key={si} value={si}>
                  ₹{si.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>
        )}

        {policyType === "topup" && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Sum Insured</label>
            <select
              className="w-full border rounded-md p-2"
              value={sumInsured}
              onChange={(e) => setSumInsured(parseInt(e.target.value))}
            >
              {SUM_INSURED_OPTIONS.map((si) => (
                <option key={si} value={si}>
                  ₹{si.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Optional Covers (Individual & Floater only) */}
        {(policyType === "individual" || policyType === "floater") && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Optional Covers</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={optionalCoverI}
                    onChange={(e) => setOptionalCoverI(e.target.checked)}
                    className="mr-2"
                  />
                  Optional Cover I - No Proportionate Deduction
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={optionalCoverII}
                    onChange={(e) => setOptionalCoverII(e.target.checked)}
                    className="mr-2"
                  />
                  Optional Cover II - Maternity Benefit
                </label>
                {sumInsured >= 800000 && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={optionalCoverIII}
                      onChange={(e) => setOptionalCoverIII(e.target.checked)}
                      className="mr-2"
                    />
                    Optional Cover III - Revision in Cataract Limit
                  </label>
                )}
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={voluntaryCoPay}
                    onChange={(e) => setVoluntaryCoPay(e.target.checked)}
                    className="mr-2"
                  />
                  Voluntary Co-Pay (20% Co-Pay = 15% Discount)
                </label>
                {sumInsured >= 800000 && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={optionalCoverV}
                      onChange={(e) => setOptionalCoverV(e.target.checked)}
                      className="mr-2"
                    />
                    Optional Cover V - Non-Medical Items (₹1,500)
                  </label>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Policy Term</label>
              <select
                className="w-full border rounded-md p-2"
                value={policyTerm}
                onChange={(e) => setPolicyTerm(parseInt(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1}>1 Year</option>
                <option value={2}>2 Years (5% Discount)</option>
                <option value={3}>3 Years (7% Discount)</option>
              </select>
            </div>
          </>
        )}

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          {loading ? "Calculating..." : "Calculate Premium"}
        </button>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Premium Breakdown */}
      {breakdown && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold mb-4">Premium Breakdown</h2>
          <div className="space-y-2">
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Policy Type:</span>
              <span>{breakdown.policyType}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">Base Premium:</span>
              <span>₹{breakdown.basePremium.toLocaleString("en-IN")}</span>
            </div>
            {breakdown.optionalCoverI && (
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Optional Cover I:</span>
                <span>₹{breakdown.optionalCoverI.toLocaleString("en-IN")}</span>
              </div>
            )}
            {breakdown.optionalCoverII && (
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Optional Cover II:</span>
                <span>₹{breakdown.optionalCoverII.toLocaleString("en-IN")}</span>
              </div>
            )}
            {breakdown.optionalCoverIII && (
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Optional Cover III:</span>
                <span>₹{breakdown.optionalCoverIII.toLocaleString("en-IN")}</span>
              </div>
            )}
            {breakdown.optionalCoverV && (
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Optional Cover V:</span>
                <span>₹{breakdown.optionalCoverV.toLocaleString("en-IN")}</span>
              </div>
            )}
            {breakdown.voluntaryCoPay && (
              <div className="flex justify-between border-b pb-2 text-green-600">
                <span className="font-medium">Voluntary Co-Pay Discount:</span>
                <span>₹{breakdown.voluntaryCoPay.toLocaleString("en-IN")}</span>
              </div>
            )}
            {breakdown.familyDiscount && (
              <div className="flex justify-between border-b pb-2 text-green-600">
                <span className="font-medium">Family Discount:</span>
                <span>₹{breakdown.familyDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}
            {breakdown.longTermDiscount && (
              <div className="flex justify-between border-b pb-2 text-green-600">
                <span className="font-medium">Long Term Discount:</span>
                <span>₹{breakdown.longTermDiscount.toLocaleString("en-IN")}</span>
              </div>
            )}
            <div className="flex justify-between border-b pb-2">
              <span className="font-medium">GST:</span>
              <span>₹0</span>
            </div>
            <div className="flex justify-between pt-4 text-xl font-bold">
              <span>Total Premium:</span>
              <span className="text-green-600">
                ₹{breakdown.totalPremium.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
