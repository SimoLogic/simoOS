import { NextRequest, NextResponse } from "next/server";
import { saveIntegrationToken, TokenData } from "@/lib/pmo/token-vault";

const SF_CLIENT_ID = process.env.SALESFORCE_CLIENT_ID;
const SF_CLIENT_SECRET = process.env.SALESFORCE_CLIENT_SECRET;
const SF_REDIRECT_URI = process.env.SALESFORCE_REDIRECT_URI || "http://localhost:3000/api/integrations/salesforce/callback";
const SF_TOKEN_URL = process.env.SALESFORCE_TOKEN_URL || "https://login.salesforce.com/services/oauth2/token";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateStr = searchParams.get("state");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorParam) {
    return NextResponse.json({ error: errorParam, description: errorDescription }, { status: 400 });
  }

  if (!code || !stateStr) {
    return NextResponse.json({ error: "Missing authorization code or state" }, { status: 400 });
  }

  let state;
  try {
    const decodedStr = Buffer.from(stateStr, "base64").toString("utf-8");
    state = JSON.parse(decodedStr);
  } catch (err) {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 });
  }

  const { orgId, userId } = state;

  if (!orgId || !userId) {
    return NextResponse.json({ error: "Invalid state payload: missing orgId or userId" }, { status: 400 });
  }

  if (!SF_CLIENT_ID || !SF_CLIENT_SECRET) {
    return NextResponse.json({ error: "Salesforce credentials not configured" }, { status: 500 });
  }

  // Exchange code for tokens
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    client_id: SF_CLIENT_ID,
    client_secret: SF_CLIENT_SECRET,
    redirect_uri: SF_REDIRECT_URI,
  });

  try {
    const tokenRes = await fetch(SF_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json({ error: "Failed to exchange token", details: tokenData }, { status: 400 });
    }

    // Prepare token data for vault
    const tokens: TokenData = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      metadata: {
        instanceUrl: tokenData.instance_url,
        idUrl: tokenData.id,
        issuedAt: tokenData.issued_at,
        signature: tokenData.signature
      }
    };

    // Use Token Vault to encrypt and save to Database (Shield Protocol & Key #3 compliance)
    const providerUserId = tokenData.id ? tokenData.id.split('/').pop() : userId; // Fallback
    await saveIntegrationToken(orgId, userId, "salesforce", providerUserId, tokens);

    // Redirect user back to the dashboard or settings
    const dashboardUrl = new URL("/es/pmo/settings/integrations?success=salesforce", req.url);
    return NextResponse.redirect(dashboardUrl.toString());

  } catch (err) {
    console.error("[Salesforce Auth] Error exchanging token or saving:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
