import { UploadFlow } from "@/components/UploadFlow";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload policy</h1>
        <p className="text-muted mt-1">
          Upload a policy PDF. We&apos;ll extract the details for you to review
          before saving.
        </p>
      </div>
      <UploadFlow />
    </div>
  );
}
