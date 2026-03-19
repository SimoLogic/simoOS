/**
 * Zoom Direct Service — Stub for direct Zoom API integration.
 *
 * This service is feature-flagged via ZOOM_DIRECT_ENABLED.
 * When disabled, all methods return { available: false }.
 * When enabled, methods will call the Zoom REST API to create/update meetings.
 *
 * NOTE: Most installations use Zoom via Salesforce (ReadBackZoomUrlJob).
 * This direct service is for orgs that need Zoom without Salesforce.
 */

const ENABLED = process.env.ZOOM_DIRECT_ENABLED === "true";

interface ZoomResult {
  available: boolean;
  data?: unknown;
}

async function createMeeting(
  accessToken: string,
  meeting: { topic: string; startTime: string; duration: number; timezone?: string }
): Promise<ZoomResult> {
  if (!ENABLED) return { available: false };
  // TODO: Implement Zoom API POST /users/me/meetings
  console.log("[ZoomDirect] createMeeting stub called:", meeting.topic);
  return { available: true, data: null };
}

async function updateMeeting(
  accessToken: string,
  meetingId: string,
  updates: { topic?: string; startTime?: string; duration?: number }
): Promise<ZoomResult> {
  if (!ENABLED) return { available: false };
  // TODO: Implement Zoom API PATCH /meetings/{meetingId}
  console.log("[ZoomDirect] updateMeeting stub called:", meetingId);
  return { available: true, data: null };
}

export const zoomDirectService = {
  createMeeting,
  updateMeeting,
};
