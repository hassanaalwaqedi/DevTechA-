import { NextResponse } from "next/server";
import { requirePermissionApi } from "@/lib/auth";
import { recordAuditLog } from "@/lib/intelligence/audit";
import { RbacDeniedError } from "@/lib/rbac";
import { createPrivilegedOrServerSupabaseClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, actor } = await requirePermissionApi("recruitment", "view");
    const { id } = await params;
    const type =
      new URL(request.url).searchParams.get("type") === "cover-letter"
        ? "cover_letter_path"
        : "cv_path";
    const { data: app, error: appError } = await supabase
      .from("job_applications")
      .select(type)
      .eq("reference_id", id)
      .single();
    if (appError) throw appError;
    const path = (app as Record<string, unknown>)[type] as string | null;
    if (!path) {
      return NextResponse.json(
        { error: "This document was not provided." },
        { status: 404 }
      );
    }
    const storageClient = await createPrivilegedOrServerSupabaseClient();
    const { data, error } = await storageClient.storage
      .from("cvs")
      .createSignedUrl(path, 300);
    if (error) throw error;

    await recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.roleKey,
      module: "recruitment",
      action: "view_document",
      entityType: "application",
      entityId: id,
      outcome: "allowed",
      summary: `Generated short-lived signed URL for ${type} on application ${id}.`,
    });

    const redirectRes = NextResponse.redirect(data.signedUrl);
    redirectRes.headers.set("Cache-Control", "private, no-store, max-age=0");
    redirectRes.headers.set("Referrer-Policy", "no-referrer");
    return redirectRes;
  } catch (error) {
    if (error instanceof RbacDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Unable to access document.";
    return NextResponse.json(
      { error: message },
      { status: message === "UNAUTHORIZED" ? 401 : 400 }
    );
  }
}
