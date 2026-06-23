import { WifiOff } from "lucide-react";

// Shown by the service worker when a navigation fails while offline.
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="h-14 w-14 rounded-2xl bg-foreground text-background flex items-center justify-center">
        <WifiOff size={24} />
      </div>
      <div>
        <h1 className="text-xl font-bold">You&apos;re offline</h1>
        <p className="text-muted mt-1 text-sm">
          AgentSaathi needs a connection to load fresh data. Reconnect and try
          again.
        </p>
      </div>
    </div>
  );
}
