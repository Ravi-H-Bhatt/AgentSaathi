import { UploadFlow } from "@/components/UploadFlow";
import { ManualPolicyForm } from "@/components/ManualPolicyForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Policy</h1>
        <p className="text-muted mt-1">
          Upload a PDF/XLSX file or enter policy details manually.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="upload">📄 Upload PDF</TabsTrigger>
          <TabsTrigger value="xlsx">📊 Upload XLSX</TabsTrigger>
          <TabsTrigger value="manual">✍️ Manual Entry</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Upload PDF Register</h3>
              <p className="text-sm text-muted mt-1">
                Upload New India Policy Expiry Register or other insurance PDFs.
                We'll extract all details automatically.
              </p>
            </div>
            <UploadFlow />
          </div>
        </TabsContent>

        <TabsContent value="xlsx" className="mt-6">
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Upload Excel Spreadsheet</h3>
              <p className="text-sm text-muted mt-1">
                Upload XLSX/XLS files with policy data. Much faster than PDF extraction!
              </p>
              <p className="text-sm text-green-700 mt-2">
                ✓ Supports New India format and generic policy sheets
              </p>
            </div>
            <UploadFlow fileType="xlsx" />
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-6">
          <ManualPolicyForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
