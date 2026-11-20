import { Suspense } from "react";
import { AdminActivateClient } from "@/components/admin-activate-client";

export const dynamic = "force-dynamic";

export default function AdminActivatePage() {
  return (
    <main className="hz-auth-screen">
      <Suspense
        fallback={
          <div style={{ color: "var(--hz-text-secondary)", fontSize: 13.5 }}>
            Verifying single-use invitation…
          </div>
        }
      >
        <AdminActivateClient />
      </Suspense>
    </main>
  );
}
