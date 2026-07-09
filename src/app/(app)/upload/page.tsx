import { UploadFlow } from "@/components/UploadFlow";
import { ManualPolicyForm } from "@/components/ManualPolicyForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Table2, Edit3 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add Policy</h1>
        <p className="text-muted mt-1">
          Upload a PDF/XLSX file or enter policy details manually.
        </p>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="inline-flex h-auto p-1 bg-black/[.04] rounded-2xl">
          <TabsTrigger value="upload" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            <FileText size={16} className="mr-2" />
            Upload PDF
          </TabsTrigger>
          <TabsTrigger value="xlsx" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            <Table2 size={16} className="mr-2" />
            Upload XLSX
          </TabsTrigger>
          <TabsTrigger value="manual" className="data-[state=active]:bg-foreground data-[state=active]:text-background">
            <Edit3 size={16} className="mr-2" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText size={18} />
                Upload PDF Register
              </h3>
              <p className="text-sm text-muted mt-2">
                Upload New India Policy Expiry Register or other insurance PDFs.
                We'll extract all details automatically.
              </p>
            </div>
            <UploadFlow />
          </div>
        </TabsContent>

        <TabsContent value="xlsx" className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-semibold flex items-center gap-2">
                <Table2 size={18} />
                Upload Excel Spreadsheet
              </h3>
              <p className="text-sm text-muted mt-2">
                Upload XLSX/XLS files with policy data. Much faster and more accurate than PDF extraction!
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
                  ✓ Recommended format
                </span>
              </div>
            </div>
            <UploadFlow fileType="xlsx" />
          </div>
        </TabsContent>

        <TabsContent value="manual" className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="font-semibold flex items-center gap-2 mb-6">
              <Edit3 size={18} />
              Manual Policy Entry
            </h3>
            <ManualPolicyForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
