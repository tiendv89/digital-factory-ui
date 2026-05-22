import { NextResponse } from "next/server";
import { createRegistry } from "@/services/content-provider";

/**
 * POST /api/content/fetch
 *
 * Server-side proxy that fetches document content from external sources
 * (GitHub, S3, etc.) using the content provider registry.
 *
 * Body: { url: string }
 * Response: { content: string, provider: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' field" },
        { status: 400 },
      );
    }

    const registry = createRegistry();
    const result = await registry.fetch(url);

    if (!result) {
      return NextResponse.json(
        { error: `No content provider can handle URL: ${url}` },
        { status: 422 },
      );
    }

    return NextResponse.json({
      content: result.content,
      provider: result.provider,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/content/fetch]", message);
    return NextResponse.json(
      { error: message },
      { status: 502 },
    );
  }
}
