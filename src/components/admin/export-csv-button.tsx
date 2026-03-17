"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

function escapeCell(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes(";")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function ExportCSVButton({ rows, filename }: { rows: string[][]; filename: string }) {
  function handleExport() {
    const content = rows.map((r) => r.map(escapeCell).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button size="sm" variant="outline" onClick={handleExport}>
      <Download className="size-4 mr-1" />
      Export CSV
    </Button>
  );
}
