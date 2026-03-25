/**
 * Outlook Graph Service — Stub for Enterprise integration.
 *
 * This service is feature-flagged via OUTLOOK_GRAPH_ENABLED.
 * When disabled, all methods return { available: false }.
 * When enabled, methods will call Microsoft Graph API to create
 * events, tasks, and webhook subscriptions.
 */

const ENABLED = process.env.OUTLOOK_GRAPH_ENABLED === "true";

interface GraphResult {
  available: boolean;
  data?: unknown;
}

async function createEvent(
  accessToken: string,
  event: { subject: string; start: string; end: string; body?: string }
): Promise<GraphResult> {
  if (!ENABLED) return { available: false };
  // TODO: Implement Microsoft Graph POST /me/events
  console.log("[OutlookGraph] createEvent stub called:", event.subject);
  return { available: true, data: null };
}

async function createTask(
  accessToken: string,
  task: { title: string; dueDateTime?: string }
): Promise<GraphResult> {
  if (!ENABLED) return { available: false };
  // TODO: Implement Microsoft Graph POST /me/todo/lists/{listId}/tasks
  console.log("[OutlookGraph] createTask stub called:", task.title);
  return { available: true, data: null };
}

async function createSubscription(
  accessToken: string,
  resource: string,
  notificationUrl: string
): Promise<GraphResult> {
  if (!ENABLED) return { available: false };
  // TODO: Implement Microsoft Graph POST /subscriptions
  console.log("[OutlookGraph] createSubscription stub called:", resource);
  return { available: true, data: null };
}

export const outlookGraphService = {
  createEvent,
  createTask,
  createSubscription,
};
