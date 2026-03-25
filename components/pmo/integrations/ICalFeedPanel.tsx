"use client";

import { useEffect, useState, useCallback } from "react";
import { getOrCreateIcalToken, regenerateIcalToken } from "@/app/actions/pmo/ical-actions";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface IcalTokenData {
  id: string;
  token: string;
  isActive: boolean;
  lastAccessAt: string | null;
  filters: Record<string, unknown> | null;
  feedUrl: string;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ICalFeedPanel() {
  const [tokenData, setTokenData] = useState<IcalTokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<"outlook-web" | "outlook-desktop" | "apple">("outlook-web");

  useEffect(() => {
    getOrCreateIcalToken()
      .then((data) => setTokenData(data as IcalTokenData))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = useCallback(async () => {
    if (!tokenData) return;
    await navigator.clipboard.writeText(tokenData.feedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [tokenData]);

  const handleRegenerate = useCallback(async () => {
    setRegenerating(true);
    try {
      const newToken = await regenerateIcalToken();
      setTokenData(newToken as IcalTokenData);
      setShowRegenModal(false);
    } catch (e) {
      console.error("Failed to regenerate:", e);
    } finally {
      setRegenerating(false);
    }
  }, []);

  // Badge status based on lastAccessAt
  const getAccessBadge = () => {
    if (!tokenData?.lastAccessAt) return { color: "#676879", text: "Never accessed" };
    const diff = Date.now() - new Date(tokenData.lastAccessAt).getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 25) return { color: "var(--vibe-green, #00CA72)", text: "Recently synced" };
    return { color: "var(--vibe-orange, #FDAB3D)", text: "Stale — last sync >25h ago" };
  };

  if (loading) {
    return (
      <div style={{ padding: 16, color: "var(--vibe-text-muted, #676879)", fontSize: 14 }}>
        Loading iCal feed...
      </div>
    );
  }

  const badge = getAccessBadge();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Feed URL */}
      <div>
        <label style={{ fontSize: 12, color: "var(--vibe-text-muted, #676879)", marginBottom: 4, display: "block" }}>
          Your iCal Feed URL
        </label>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            readOnly
            value={tokenData?.feedUrl || ""}
            style={{
              flex: 1,
              padding: "8px 12px",
              border: "1px solid var(--vibe-border, #E6E9EF)",
              borderRadius: 4,
              fontSize: 13,
              fontFamily: "monospace",
              backgroundColor: "var(--vibe-surface-2, #F5F6F8)",
              color: "var(--vibe-text-prime, #323338)",
            }}
          />
          <button
            onClick={handleCopy}
            style={{
              padding: "8px 16px",
              backgroundColor: copied ? "var(--vibe-green, #00CA72)" : "var(--vibe-blue, #0086C0)",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background-color 100ms ease-in-out",
              whiteSpace: "nowrap",
            }}
          >
            {copied ? "✓ Copied!" : "Copy URL"}
          </button>
        </div>
        {/* Access badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: badge.color, display: "inline-block" }} />
          <span style={{ fontSize: 12, color: "var(--vibe-text-muted, #676879)" }}>{badge.text}</span>
        </div>
      </div>

      {/* Instructions Tabs */}
      <div>
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--vibe-border, #E6E9EF)" }}>
          {([
            { key: "outlook-web", label: "Outlook Web" },
            { key: "outlook-desktop", label: "Outlook Desktop" },
            { key: "apple", label: "Apple Calendar" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? "var(--vibe-blue, #0086C0)" : "var(--vibe-text-muted, #676879)",
                backgroundColor: "transparent",
                border: "none",
                borderBottom: activeTab === tab.key ? "2px solid var(--vibe-blue, #0086C0)" : "2px solid transparent",
                cursor: "pointer",
                transition: "all 100ms ease-in-out",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "12px 0", fontSize: 13, color: "var(--vibe-text-prime, #323338)", lineHeight: 1.6 }}>
          {activeTab === "outlook-web" && (
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li>Go to <strong>outlook.office.com</strong> → Calendar</li>
              <li>Click <strong>&quot;Add calendar&quot;</strong> in the left panel</li>
              <li>Select <strong>&quot;Subscribe from web&quot;</strong></li>
              <li>Paste the iCal URL above and name it <strong>&quot;PMO Tasks&quot;</strong></li>
              <li>Click <strong>&quot;Import&quot;</strong> — tasks will sync every ~4 hours</li>
            </ol>
          )}
          {activeTab === "outlook-desktop" && (
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li>Open Outlook → <strong>File → Account Settings → Internet Calendars</strong></li>
              <li>Click <strong>&quot;New&quot;</strong> and paste the iCal URL above</li>
              <li>Name the subscription <strong>&quot;PMO Tasks&quot;</strong></li>
              <li>Click <strong>&quot;OK&quot;</strong> — Outlook will poll <strong>every 30 minutes</strong></li>
            </ol>
          )}
          {activeTab === "apple" && (
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li>Open <strong>Calendar.app</strong> → <strong>File → New Calendar Subscription</strong></li>
              <li>Paste the iCal URL</li>
              <li>Set <strong>Auto-refresh: Every hour</strong></li>
              <li>Click <strong>&quot;Subscribe&quot;</strong></li>
            </ol>
          )}
        </div>
      </div>

      {/* Regenerate Button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowRegenModal(true)}
          style={{
            padding: "6px 14px",
            fontSize: 12,
            color: "var(--vibe-pink, #FF3D57)",
            backgroundColor: "transparent",
            border: "1px solid var(--vibe-pink, #FF3D57)",
            borderRadius: 4,
            cursor: "pointer",
            transition: "all 100ms ease-in-out",
          }}
        >
          Regenerate URL
        </button>
      </div>

      {/* Regeneration Confirmation Modal */}
      {showRegenModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowRegenModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              padding: 24,
              width: 400,
              maxWidth: "90vw",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "var(--vibe-text-prime, #323338)" }}>
              Regenerate iCal URL?
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 14, color: "var(--vibe-text-muted, #676879)", lineHeight: 1.5 }}>
              The current URL will <strong>stop working immediately</strong>. You will need to update the URL in all calendar apps.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowRegenModal(false)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--vibe-surface-2, #F5F6F8)",
                  color: "var(--vibe-text-prime, #323338)",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                style={{
                  padding: "8px 16px",
                  backgroundColor: "var(--vibe-pink, #FF3D57)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: regenerating ? "wait" : "pointer",
                  opacity: regenerating ? 0.7 : 1,
                }}
              >
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
