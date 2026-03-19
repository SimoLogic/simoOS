"use client";

import { useEffect, useState } from "react";
import ICalFeedPanel from "./ICalFeedPanel";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface IntegrationStatus {
  salesforce: {
    connected: boolean;
    providerEmail: string | null;
    lastSyncAt: string | null;
    syncEnabled: boolean;
  };
  outlook: {
    connected: boolean;
    icsFeedUrl: string | null;
    icsFeedLastAccess: string | null;
    graphConnected: boolean;
  };
  zoom: {
    viaSalesforce: boolean;
    directEnabled: boolean;
    directConnected: boolean;
  };
}

interface SyncEvent {
  id: string;
  event_type: string;
  status: string;
  payload: Record<string, unknown>;
  created_at: string;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function IntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // Fetch sync events
    fetch("/api/integrations/sync-events")
      .then((r) => r.json())
      .then((data) => setSyncEvents(Array.isArray(data) ? data : []))
      .catch(() => setSyncEvents([]));
  }, []);

  const handleDisconnect = async (provider: string) => {
    await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
    // Refresh status
    const r = await fetch("/api/integrations/status");
    setStatus(await r.json());
  };

  const handleConnectSalesforce = () => {
    window.location.href = "/api/integrations/salesforce/auth";
  };

  if (loading) {
    return (
      <div style={{ padding: 32, display: "flex", justifyContent: "center" }}>
        <span style={{ fontSize: 14, color: "var(--vibe-text-muted, #676879)" }}>Loading integrations...</span>
      </div>
    );
  }

  const timeAgo = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const graphEnabled = typeof window !== "undefined" && (window as any).__NEXT_DATA__?.props?.pageProps?.outlookGraphEnabled;
  const zoomDirectEnabled = typeof window !== "undefined" && (window as any).__NEXT_DATA__?.props?.pageProps?.zoomDirectEnabled;

  return (
    <div style={{ padding: "24px 32px", maxWidth: 960, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--vibe-text-prime, #323338)", margin: 0 }}>
          Integrations
        </h1>
        <p style={{ fontSize: 14, color: "var(--vibe-text-muted, #676879)", marginTop: 4 }}>
          Connect your tools to sync tasks, events and meetings.
        </p>
      </div>

      {/* 2x2 Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {/* 1. Salesforce */}
        <IntegrationCard
          title="Salesforce"
          color="#0176D3"
          icon="☁"
          connected={status?.salesforce.connected ?? false}
          connectedContent={
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 13, color: "var(--vibe-text-prime, #323338)" }}>
                <strong>Email:</strong> {status?.salesforce.providerEmail || "—"}
              </div>
              <div style={{ fontSize: 12, color: "var(--vibe-text-muted, #676879)" }}>
                Last sync: {timeAgo(status?.salesforce.lastSyncAt ?? null)}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <SmallButton label="Sync Now" color="#0176D3" onClick={() => { }} />
                <SmallButton label="Disconnect" color="var(--vibe-pink, #FF3D57)" onClick={() => handleDisconnect("salesforce")} />
              </div>
            </div>
          }
          disconnectedContent={
            <div>
              <p style={{ fontSize: 13, color: "var(--vibe-text-muted, #676879)", margin: "0 0 12px" }}>
                Sync tasks, leads and events with Salesforce CRM.
              </p>
              <SmallButton label="Connect Salesforce" color="#0176D3" onClick={handleConnectSalesforce} />
            </div>
          }
        />

        {/* 2. Outlook iCal */}
        <IntegrationCard
          title="Outlook iCal"
          color="#0078D4"
          icon="📅"
          connected={true}
          connectedContent={<ICalFeedPanel />}
          disconnectedContent={null}
        />

        {/* 3. Outlook Graph */}
        <IntegrationCard
          title="Outlook Graph"
          color="#0078D4"
          icon="📧"
          connected={status?.outlook.graphConnected ?? false}
          connectedContent={
            <div style={{ fontSize: 13, color: "var(--vibe-text-muted, #676879)" }}>
              Connected to Microsoft Graph API
            </div>
          }
          disconnectedContent={
            <div>
              {process.env.NEXT_PUBLIC_OUTLOOK_GRAPH_ENABLED === "true" ? (
                <SmallButton label="Connect Graph" color="#0078D4" onClick={() => { }} />
              ) : (
                <span style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: "var(--vibe-surface-2, #F5F6F8)",
                  color: "var(--vibe-text-muted, #676879)",
                  borderRadius: 4,
                  letterSpacing: 0.5,
                }}>
                  ENTERPRISE
                </span>
              )}
            </div>
          }
        />

        {/* 4. Zoom */}
        <IntegrationCard
          title="Zoom"
          color="#2D8CFF"
          icon="🎥"
          connected={status?.zoom.directConnected ?? false}
          connectedContent={
            <div style={{ fontSize: 13, color: "var(--vibe-text-muted, #676879)" }}>
              Zoom meetings connected directly.
            </div>
          }
          disconnectedContent={
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {status?.zoom.viaSalesforce && (
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  fontSize: 12,
                  color: "var(--vibe-green, #00CA72)",
                  backgroundColor: "rgba(0,202,114,0.08)",
                  borderRadius: 4,
                  width: "fit-content",
                }}>
                  ✓ Available via Salesforce
                </span>
              )}
              {process.env.NEXT_PUBLIC_ZOOM_DIRECT_ENABLED === "true" && (
                <SmallButton label="Connect Zoom Direct" color="#2D8CFF" onClick={() => { }} />
              )}
              {!status?.zoom.viaSalesforce && process.env.NEXT_PUBLIC_ZOOM_DIRECT_ENABLED !== "true" && (
                <span style={{ fontSize: 13, color: "var(--vibe-text-muted, #676879)" }}>
                  Connect Salesforce first to enable Zoom integration.
                </span>
              )}
            </div>
          }
        />
      </div>

      {/* Sync Log */}
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--vibe-text-prime, #323338)", margin: "0 0 12px" }}>
          Sync Log
        </h2>
        {syncEvents.length === 0 ? (
          <div style={{
            padding: 24,
            textAlign: "center",
            color: "var(--vibe-text-muted, #676879)",
            fontSize: 13,
            backgroundColor: "var(--vibe-surface-2, #F5F6F8)",
            borderRadius: 8,
          }}>
            No sync events yet. Connect an integration to get started.
          </div>
        ) : (
          <div style={{
            border: "1px solid var(--vibe-border, #E6E9EF)",
            borderRadius: 8,
            overflow: "hidden",
          }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ backgroundColor: "var(--vibe-surface-2, #F5F6F8)" }}>
                  <th style={thStyle}>Platform</th>
                  <th style={thStyle}>Operation</th>
                  <th style={thStyle}>Result</th>
                  <th style={thStyle}>When</th>
                </tr>
              </thead>
              <tbody>
                {syncEvents.slice(0, 20).map((ev) => (
                  <tr key={ev.id} style={{ borderTop: "1px solid var(--vibe-border, #E6E9EF)" }}>
                    <td style={tdStyle}>{(ev.payload as any)?.provider || "—"}</td>
                    <td style={tdStyle}>{ev.event_type}</td>
                    <td style={tdStyle}>
                      <span style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: ev.status === "success" || ev.status === "OK"
                          ? "var(--vibe-green, #00CA72)"
                          : "var(--vibe-pink, #FF3D57)",
                        marginRight: 6,
                      }} />
                      {ev.status}
                    </td>
                    <td style={tdStyle}>{timeAgo(ev.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function IntegrationCard({
  title,
  color,
  icon,
  connected,
  connectedContent,
  disconnectedContent,
}: {
  title: string;
  color: string;
  icon: string;
  connected: boolean;
  connectedContent: React.ReactNode;
  disconnectedContent: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--vibe-border, #E6E9EF)",
        borderRadius: 8,
        padding: 20,
        backgroundColor: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transition: "box-shadow 100ms ease-in-out",
      }}
    >
      {/* Card Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--vibe-text-prime, #323338)" }}>
            {title}
          </span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 600,
            borderRadius: 4,
            backgroundColor: connected ? "rgba(0,202,114,0.1)" : "var(--vibe-surface-2, #F5F6F8)",
            color: connected ? "var(--vibe-green, #00CA72)" : "var(--vibe-text-muted, #676879)",
          }}
        >
          <span style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: connected ? "var(--vibe-green, #00CA72)" : "var(--vibe-text-muted, #676879)",
          }} />
          {connected ? "Connected" : "Not connected"}
        </span>
      </div>
      {/* Accent Bar */}
      <div style={{ height: 2, backgroundColor: color, borderRadius: 1, opacity: 0.6 }} />
      {/* Content */}
      {connected ? connectedContent : disconnectedContent}
    </div>
  );
}

function SmallButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        fontSize: 13,
        fontWeight: 600,
        color: "#fff",
        backgroundColor: color,
        border: "none",
        borderRadius: 4,
        cursor: "pointer",
        transition: "opacity 100ms ease-in-out",
      }}
      onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "0.85")}
      onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "1")}
    >
      {label}
    </button>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "8px 12px",
  textAlign: "left",
  fontWeight: 600,
  fontSize: 12,
  color: "var(--vibe-text-muted, #676879)",
};

const tdStyle: React.CSSProperties = {
  padding: "8px 12px",
  color: "var(--vibe-text-prime, #323338)",
};
