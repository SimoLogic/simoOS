import { NextRequest, NextResponse } from "next/server";

// We'll use the environment variables for configuring Salesforce
const SF_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const SF_REDIRECT_URI = process.env.SALESFORCE_REDIRECT_URI || "http://localhost:3000/api/integrations/salesforce/callback";
const SF_AUTH_URL = process.env.SALESFORCE_AUTH_URL || "https://login.salesforce.com/services/oauth2/authorize";

export async function GET(req: NextRequest) {
  if (!SF_CLIENT_ID) {
    return NextResponse.json({ error: "Salesforce Client ID not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId");
  const userId = searchParams.get("userId");

  if (!orgId || !userId) {
    return NextResponse.json({ error: "Missing orgId or userId" }, { status: 400 });
  }

  // Pass orgId and userId in the state parameter to recover them in the callback
  const state = Buffer.from(JSON.stringify({ orgId, userId })).toString("base64");

  const url = new URL(SF_AUTH_URL);
  url.searchParams.set("client_id", SF_CLIENT_ID);
  url.searchParams.set("redirect_uri", SF_REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  // Request minimum scopes necessary for the integration
  url.searchParams.set("scope", "api refresh_token offline_access");

  return NextResponse.redirect(url.toString());
}
