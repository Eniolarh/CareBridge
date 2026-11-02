import { isContractConfigured } from "@/lib/stellar";
import { AlertIcon } from "./icons";

export function ConfigBanner() {
  if (isContractConfigured) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="container-page flex items-start gap-3 py-3 text-sm text-amber-900">
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          <span className="font-semibold">Contract not configured.</span> Run{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
            ./deploy.sh
          </code>{" "}
          (or{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
            .\deploy.ps1
          </code>
          ) from the repository root to deploy to testnet and write{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
            app/.env.local
          </code>
          .
        </p>
      </div>
    </div>
  );
}
