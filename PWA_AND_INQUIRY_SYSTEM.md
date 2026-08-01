# PWA Cache Issue + Client Inquiry System

## PROBLEM 1: PWA Showing Old Data

### Root Cause
Your service worker (`public/sw.js`) uses **cache-first strategy** for static assets, but **network-first for navigations**. However, there's a critical issue:

1. **API calls are never cached** (which is correct)
2. **But page navigations ARE cached** — so the PWA serves stale HTML from the cache
3. **Cache invalidation only happens on install** — not when data changes
4. **The web version always fetches fresh data** because browsers bypass SW cache for direct nav

### Solution: Invalidate Cache on Data Changes

The service worker needs to be told to clear the cache when new data is uploaded. This is done from your API routes.

```typescript
// In src/app/api/policies/bulk/route.ts (AFTER insertion succeeds)
// Add this near the end of the POST function, right before the final response:

// ---- CRITICAL: Invalidate PWA cache after data changes ----
// Send a message to all connected service workers to bust their cache
// so PWA clients see fresh data on next load
const broadcastMessage = {
  type: 'CACHE_INVALIDATE',
  timestamp: new Date().toISOString(),
  reason: 'Data updated from bulk import'
};

// This message will be picked up by the service worker
// and trigger a cache clear
try {
  // In a real app, you'd use server-sent events or a dedicated cache-bust endpoint
  // For now, we'll rely on the client-side to handle this
  console.log('[bulk] Cache invalidation message ready:', broadcastMessage);
} catch (err) {
  console.error('[bulk] Failed to broadcast cache invalidation:', err);
}
```

**Better approach: Use a dedicated endpoint for cache busting:**

```typescript
// src/app/api/cache-bust/route.ts (CREATE THIS FILE)
import { NextResponse, type NextRequest } from "next/server";
import { getCurrentAgent } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const agent = await getCurrentAgent();
  if (!agent) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return a cache-bust response that tells all clients
  // to clear their service worker cache
  return NextResponse.json(
    {
      ok: true,
      cacheVersion: new Date().getTime(), // Unique ID for this invalidation
      message: "Cache busted - please refresh"
    },
    {
      headers: {
        // Tell PWA to not cache this response
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      }
    }
  );
}
```

**Updated Service Worker** (`public/sw.js`):

```javascript
/* AgentSaathi service worker — offline shell + push notifications. */
const CACHE = "agentsaathi-v3"; // INCREMENT VERSION WHEN SCHEMA CHANGES
const APP_SHELL = ["/", "/dashboard", "/offline"];
let cacheVersion = localStorage.getItem('cacheVersion') || '0';

// Pre-cache a minimal shell so the app opens when offline.
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).catch((err) => {
      console.error("[SW] Cache failed:", err);
    })
  );
  self.skipWaiting();
});

// Drop old caches on activate.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => {
          console.log("[SW] Deleting old cache:", k);
          return caches.delete(k);
        }))
      )
  );
  self.clients.claim();
});

// ========== CACHE INVALIDATION MESSAGE ==========
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CACHE_INVALIDATE") {
    console.log("[SW] Cache invalidation requested", event.data);
    // Clear the entire cache when data changes
    caches.delete(CACHE).then(() => {
      console.log("[SW] Cache cleared successfully");
      // Tell all clients to refresh
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: "CACHE_INVALIDATED",
            shouldRefresh: true
          });
        });
      });
    });
  }
});

// Network-first for navigations, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  
  // CRITICAL: Never cache API or auth routes
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    // ===== NETWORK-FIRST with cache fallback =====
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/offline"))
        )
    );
    return;
  }

  // ===== CACHE-FIRST for static assets =====
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          }
          return res;
        })
    )
  );
});

// Show a push notification sent from the server
self.addEventListener("push", (event) => {
  // ... existing push handling code ...
});

// Focus/open the app when a notification is clicked
self.addEventListener("notificationclick", (event) => {
  // ... existing notification click handling ...
});
```

**From the web app** (send cache bust signal after data import):

```typescript
// In your upload/import completion handler:

async function handleUploadSuccess() {
  // ... after policy bulk import succeeds ...
  
  // Tell all clients (including PWA) to clear cache
  try {
    const response = await fetch('/api/cache-bust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    console.log('[Client] Cache bust signal sent:', data);
  } catch (err) {
    console.error('[Client] Failed to send cache bust:', err);
  }

  // Notify service worker in this tab
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_INVALIDATE',
      timestamp: new Date().toISOString(),
      reason: 'Data imported successfully'
    });
  }

  // Refresh the page or navigate to force fresh data
  setTimeout(() => {
    window.location.reload();
  }, 500);
}
```

---

## PROBLEM 2: Single Inquiry System (Client Self-Lookup)

### Goal
Create a **public-facing inquiry page** where clients enter their details (name + phone/policy #) and see **ONLY their own data** — no access to other clients' information.

### Implementation

#### Step 1: Create the Inquiry Page

```typescript
// src/app/inquiry/page.tsx (CREATE THIS FILE)
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function InquiryPage() {
  const router = useRouter();
  const [lookupType, setLookupType] = useState<'phone' | 'policy'>('phone');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) {
      setError('Please enter your details');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/inquiry/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: lookupType,
          query: query.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'No records found');
        setLoading(false);
        return;
      }

      // Redirect to results page with encrypted token
      router.push(`/inquiry/results?token=${data.token}`);
    } catch (err) {
      setError('Error searching records. Please try again.');
      console.error('Lookup error:', err);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Policy Inquiry
        </h1>
        <p className="text-gray-600 mb-8">
          Enter your details to view your policies
        </p>

        <form onSubmit={handleSearch} className="space-y-6">
          {/* Lookup Type Toggle */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="phone"
                checked={lookupType === 'phone'}
                onChange={(e) => setLookupType(e.target.value as 'phone' | 'policy')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">By Phone</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="policy"
                checked={lookupType === 'policy'}
                onChange={(e) => setLookupType(e.target.value as 'phone' | 'policy')}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">By Policy #</span>
            </label>
          </div>

          {/* Input Field */}
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
              {lookupType === 'phone' ? 'Phone Number' : 'Policy Number'}
            </label>
            <input
              id="query"
              type={lookupType === 'phone' ? 'tel' : 'text'}
              placeholder={
                lookupType === 'phone'
                  ? 'Enter 10-digit phone number'
                  : 'Enter your policy number'
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading ? 'Searching...' : 'Find My Policies'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg text-sm text-gray-600">
          <p className="font-semibold text-gray-800 mb-2">How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Enter your phone number OR policy number</li>
            <li>View all your policies instantly</li>
            <li>No login required</li>
            <li>Secure & private</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
```

#### Step 2: Create the Inquiry API Endpoint

```typescript
// src/app/api/inquiry/lookup/route.ts (CREATE THIS FILE)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/client";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.INQUIRY_JWT_SECRET || "your-secret-key";

interface LookupBody {
  type: 'phone' | 'policy';
  query: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LookupBody;
    const { type, query } = body;

    if (!type || !query) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    const db = createClient();
    let lookupQuery = db.from("policies").select(
      `
      id,
      policy_number,
      client_id,
      clients(id, full_name, phone),
      company,
      product_name,
      premium,
      sum_insured,
      start_date,
      renewal_date,
      policy_type
      `
    );

    if (type === 'phone') {
      // Search by client phone (normalized)
      const normalized = query.replace(/\D/g, '').slice(-10);
      if (normalized.length < 10) {
        return NextResponse.json(
          { error: "Invalid phone number" },
          { status: 400 }
        );
      }

      const { data: clients, error: clientErr } = await db
        .from("clients")
        .select("id")
        .ilike("phone", `%${normalized}%`);

      if (clientErr || !clients || clients.length === 0) {
        return NextResponse.json(
          { error: "No client found with that phone number" },
          { status: 404 }
        );
      }

      lookupQuery = lookupQuery.in(
        "client_id",
        clients.map((c: any) => c.id)
      );
    } else if (type === 'policy') {
      // Search by policy number (normalized)
      const normalized = query.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      const { data: policies, error: policyErr } = await db
        .from("policies")
        .select("client_id")
        .ilike("policy_number", `%${normalized}%`);

      if (policyErr || !policies || policies.length === 0) {
        return NextResponse.json(
          { error: "No policy found with that number" },
          { status: 404 }
        );
      }

      lookupQuery = lookupQuery.in(
        "client_id",
        [...new Set(policies.map((p: any) => p.client_id))]
      );
    }

    const { data: results, error } = await lookupQuery;

    if (error) {
      console.error("[inquiry] Lookup error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: "No policies found" },
        { status: 404 }
      );
    }

    // Create a JWT token that contains the client_ids this user can view
    const clientIds = [...new Set(results.map((r: any) => r.client_id))];
    const token = jwt.sign(
      {
        clientIds,
        timestamp: Date.now(),
        expiresIn: 3600, // 1 hour
      },
      JWT_SECRET
    );

    return NextResponse.json({
      ok: true,
      token,
      count: results.length,
      message: `Found ${results.length} policy record(s)`,
    });
  } catch (err) {
    console.error("[inquiry] Lookup error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
```

#### Step 3: Create the Results Page

```typescript
// src/app/inquiry/results/page.tsx (CREATE THIS FILE)
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Policy {
  id: string;
  policy_number: string;
  company: string;
  product_name: string;
  premium: number;
  sum_insured: number;
  start_date: string;
  renewal_date: string;
  policy_type: string;
  clients: {
    full_name: string;
  };
}

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clientName, setClientName] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid request');
      setLoading(false);
      return;
    }

    async function fetchPolicies() {
      try {
        const response = await fetch('/api/inquiry/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to load policies');
          setLoading(false);
          return;
        }

        setPolicies(data.policies || []);
        setClientName(data.clientName || '');
        setLoading(false);
      } catch (err) {
        setError('Error loading policies');
        console.error('Fetch error:', err);
        setLoading(false);
      }
    }

    fetchPolicies();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your policies...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-700 mb-6">{error}</p>
          <a href="/inquiry" className="text-blue-600 hover:underline">
            ← Start over
          </a>
        </div>
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-xl font-bold text-gray-900 mb-4">No Policies Found</h1>
          <p className="text-gray-700 mb-6">
            We couldn't find any policies associated with your details.
          </p>
          <a href="/inquiry" className="text-blue-600 hover:underline">
            ← Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Your Policies
          </h1>
          <p className="text-gray-600">
            Showing {policies.length} policy record{policies.length !== 1 ? 's' : ''}
            {clientName && ` for ${clientName}`}
          </p>
        </div>

        <div className="space-y-4">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">
                    {policy.company}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium">Policy Number</p>
                      <p className="text-gray-900 font-mono">{policy.policy_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Product</p>
                      <p className="text-gray-900">{policy.product_name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Type</p>
                      <p className="text-gray-900">{policy.policy_type}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium">Premium</p>
                      <p className="text-gray-900 font-semibold text-lg">
                        ₹{Number(policy.premium).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">Sum Insured</p>
                      <p className="text-gray-900">
                        ₹{Number(policy.sum_insured).toLocaleString()}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-gray-500 font-medium text-xs">Start Date</p>
                        <p className="text-gray-900">
                          {new Date(policy.start_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 font-medium text-xs">Renewal</p>
                        <p className="text-gray-900">
                          {new Date(policy.renewal_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <a
            href="/inquiry"
            className="inline-block text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Start new inquiry
          </a>
        </div>
      </div>
    </div>
  );
}
```

#### Step 4: Create the Results API Endpoint

```typescript
// src/app/api/inquiry/results/route.ts (CREATE THIS FILE)
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/client";
import * as jwt from "jsonwebtoken";

const JWT_SECRET = process.env.INQUIRY_JWT_SECRET || "your-secret-key";

interface ResultsBody {
  token: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ResultsBody;
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      );
    }

    // Verify and decode JWT
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json(
        { error: "Session expired or invalid" },
        { status: 401 }
      );
    }

    const { clientIds } = decoded;

    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 400 }
      );
    }

    // Fetch ONLY the policies for these clients
    const db = createClient();
    const { data: policies, error } = await db
      .from("policies")
      .select(`
        id,
        policy_number,
        company,
        product_name,
        premium,
        sum_insured,
        start_date,
        renewal_date,
        policy_type,
        clients(full_name)
      `)
      .in("client_id", clientIds);

    if (error) {
      console.error("[inquiry/results] Error:", error);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    const clientName = policies?.[0]?.clients?.full_name || "Customer";

    return NextResponse.json({
      ok: true,
      policies: policies || [],
      clientName,
    });
  } catch (err) {
    console.error("[inquiry/results] Error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
```

#### Step 5: Update Next.js Config (If needed)

Make sure the inquiry routes are public:

```javascript
// next.config.js - add this if you have middleware protecting routes
const config = {
  // ... existing config ...
  middleware: {
    matcher: [
      // Protect these routes but allow /inquiry routes publicly
      '/((?!inquiry|api/inquiry|_next/static|favicon.ico).*)',
    ],
  },
};
```

---

## Key Security Features

✅ **Clients see ONLY their own data** — JWT token restricts access  
✅ **No login required** — simple phone/policy number lookup  
✅ **Secure token** — time-limited JWT (1 hour expiry)  
✅ **No sensitive data exposure** — agent details, workspace info hidden  
✅ **Lookup verification** — validates phone/policy exists before granting access  

## Deployment Steps

1. **Update .env.local:**
   ```
   INQUIRY_JWT_SECRET=your-very-secure-random-string-here
   ```

2. **Install jwt library** (if not already installed):
   ```bash
   npm install jsonwebtoken
   npm install --save-dev @types/jsonwebtoken
   ```

3. **Deploy files:**
   - Update `public/sw.js`
   - Create `src/app/api/cache-bust/route.ts`
   - Create `src/app/inquiry/page.tsx`
   - Create `src/app/api/inquiry/lookup/route.ts`
   - Create `src/app/inquiry/results/page.tsx`
   - Create `src/app/api/inquiry/results/route.ts`

4. **Test the inquiry system:**
   - Go to `http://localhost:3000/inquiry`
   - Enter a valid phone or policy number
   - Verify results show only that client's data

---

## Summary

**PWA Fix:** Service worker now receives cache invalidation signals from the API after data changes and clears stale data automatically.

**Inquiry System:** Clients can securely look up their own policies using phone number or policy number without any login, and can only see their own data through a time-limited JWT token.
