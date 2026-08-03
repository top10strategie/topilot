import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  DOCUMENTS_BUCKET,
  VISUELS_BUCKET,
} from "@/lib/documents/constants";
import { publicVisuelUrl } from "@/lib/documents/storage";
import { isUuid } from "@/lib/uuid";

const SIGNED_URL_TTL_SECONDS = 3600;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function sanitizeDownloadName(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 180) || "document";
}

async function attachmentResponse(
  body: Blob | ArrayBuffer,
  filename: string,
  contentType?: string | null,
) {
  const bytes = body instanceof Blob ? await body.arrayBuffer() : body;
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${sanitizeDownloadName(filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/**
 * Proxy fichier document : session + RLS, puis URL signée (bucket privé)
 * ou redirection URL publique / lien externe.
 * `?download=1` force un téléchargement (Content-Disposition: attachment).
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
  }

  const wantDownload =
    new URL(request.url).searchParams.get("download") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { data: document, error } = await supabase
    .from("document")
    .select("id, document_name, storage_type, file_path, url, is_visual")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("GET /api/documents/[id]/file:", error);
    return NextResponse.json(
      { error: "Lecture du document impossible." },
      { status: 500 },
    );
  }
  if (!document) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  const filename = document.document_name || "document";

  if (document.storage_type === "url") {
    if (!document.url) {
      return NextResponse.json({ error: "URL manquante." }, { status: 404 });
    }
    if (!wantDownload) {
      return NextResponse.redirect(document.url);
    }
    try {
      const remote = await fetch(document.url);
      if (!remote.ok) {
        return NextResponse.json(
          { error: "Téléchargement distant impossible." },
          { status: 502 },
        );
      }
      return attachmentResponse(
        await remote.arrayBuffer(),
        filename,
        remote.headers.get("content-type"),
      );
    } catch (err) {
      console.error("download external url:", err);
      return NextResponse.json(
        { error: "Téléchargement distant impossible." },
        { status: 502 },
      );
    }
  }

  if (!document.file_path || document.file_path === "pending") {
    return NextResponse.json({ error: "Fichier manquant." }, { status: 404 });
  }

  if (!wantDownload) {
    if (document.is_visual) {
      return NextResponse.redirect(publicVisuelUrl(document.file_path));
    }
    const admin = createAdminClient();
    const { data: signed, error: signError } = await admin.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(document.file_path, SIGNED_URL_TTL_SECONDS);

    if (signError || !signed?.signedUrl) {
      console.error("createSignedUrl:", signError);
      return NextResponse.json(
        { error: "Impossible de générer l'URL du fichier." },
        { status: 500 },
      );
    }
    return NextResponse.redirect(signed.signedUrl);
  }

  const admin = createAdminClient();
  const bucket = document.is_visual ? VISUELS_BUCKET : DOCUMENTS_BUCKET;
  const { data: file, error: downloadError } = await admin.storage
    .from(bucket)
    .download(document.file_path);

  if (downloadError || !file) {
    console.error("storage.download:", downloadError);
    return NextResponse.json(
      { error: "Impossible de télécharger le fichier." },
      { status: 500 },
    );
  }

  return attachmentResponse(file, filename, file.type);
}
