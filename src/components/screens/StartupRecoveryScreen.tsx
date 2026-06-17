import React, { useRef, useState } from "react";
import { Upload, RefreshCw, AlertCircle } from "lucide-react";
import { useStore, importBackup } from "@/lib/store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function StartupRecoveryScreen() {
  const { dispatch } = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; message: string } | null>(null);

  const handleContinueFresh = () => {
    // Reset app state and navigate to welcome/onboarding
    dispatch({ type: "RESET_APP" });
    dispatch({ type: "NAVIGATE", screen: "welcome" });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string") return;
      const result = importBackup(text);
      if (result.ok) {
        toast.success("Backup restored. Reloading…");
        setStatus({ kind: "ok", message: "Backup restored. Reloading…" });
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.error(result.error);
        setStatus({ kind: "err", message: result.error });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 py-12 animate-fade-in bg-background">
      <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-8">
        <RefreshCw size={32} className="text-primary" />
      </div>

      <h1 className="text-3xl font-bold text-foreground mb-4 text-center">Welcome Back</h1>
      <p className="text-base text-muted-foreground text-center mb-10 max-w-[280px]">
        Restore your previous study progress or start fresh.
      </p>

      <div className="w-full flex flex-col gap-4">
        <button
          onClick={handleContinueFresh}
          className="w-full h-14 bg-primary text-primary-foreground rounded-2xl font-semibold text-[15px] shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center"
        >
          Continue Fresh
        </button>

        <button
          onClick={() => fileRef.current?.click()}
          className="w-full h-14 bg-card border border-border text-foreground rounded-2xl font-semibold text-[15px] shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <Upload size={18} />
          Restore Backup
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        onChange={handleImport}
        className="hidden"
      />

      {status && (
        <div
          className={cn(
            "mt-6 p-4 rounded-xl flex items-start gap-3 w-full",
            status.kind === "ok"
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive",
          )}
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm font-medium leading-tight">{status.message}</p>
        </div>
      )}
    </div>
  );
}
