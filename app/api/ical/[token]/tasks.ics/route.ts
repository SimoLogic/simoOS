import { generateFeed } from "@/lib/pmo/ical/ical-feed.service";

/**
 * GET /api/ical/[token]/tasks.ics
 *
 * Public endpoint (NO auth middleware) — authenticated via the unique feed token in the URL.
 * Returns an iCal (RFC 5545) calendar feed with the user's PMO tasks.
 *
 * Content-Type: text/calendar; charset=utf-8
 * 404 if token is invalid or deactivated.
 */
export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const icalContent = await generateFeed(token);

    return new Response(icalContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="tasks.ics"',
        "Cache-Control": `public, max-age=${process.env.ICAL_FEED_CACHE_TTL_SECONDS || "300"}`,
      },
    });
  } catch (err: unknown) {
    const message = (err as Error).message;

    if (message === "ICAL_TOKEN_INVALID") {
      return new Response("Not Found", { status: 404 });
    }

    console.error("[iCal Route] Error:", message);
    return new Response("Internal Server Error", { status: 500 });
  }
}
