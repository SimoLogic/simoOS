"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, Unlink, Search, Loader2 } from "lucide-react";

interface SfSearchResult {
  id: string;
  name: string;
  type: "Lead" | "Contact" | "Opportunity";
  stage?: string;
}

interface CrmSidebarSectionProps {
  taskId: string;
  sfExternalId?: string | null;
  sfExternalUrl?: string | null;
  sfObjectName?: string | null;
  onLink: (sfObjectId: string, sfObjectType: string) => Promise<void>;
  onUnlink: () => Promise<void>;
}

export default function CrmSidebarSection({
  taskId,
  sfExternalId,
  sfExternalUrl,
  sfObjectName,
  onLink,
  onUnlink,
}: CrmSidebarSectionProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SfSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/integrations/salesforce/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, doSearch]);

  const handleSelect = async (result: SfSearchResult) => {
    setLinking(true);
    try {
      await onLink(result.id, result.type);
      setQuery("");
      setResults([]);
    } finally {
      setLinking(false);
    }
  };

  // ── Linked State ──
  if (sfExternalId) {
    return (
      <div style={{ padding: "12px 0" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--vibe-text-muted, #676879)", marginBottom: 8 }}>
          Salesforce
        </div>
        <div style={{
          border: "1px solid var(--vibe-border, #E6E9EF)",
          borderRadius: 8,
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "var(--vibe-surface-2, #F5F6F8)",
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--vibe-text-prime, #323338)" }}>
              {sfObjectName || sfExternalId}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {sfExternalUrl && (
              <button
                onClick={() => window.open(sfExternalUrl, "_blank")}
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  color: "#0176D3",
                  backgroundColor: "transparent",
                  border: "1px solid #0176D3",
                  borderRadius: 4,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ExternalLink size={12} /> Open in SF
              </button>
            )}
            <button
              onClick={onUnlink}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                color: "var(--vibe-pink, #FF3D57)",
                backgroundColor: "transparent",
                border: "1px solid var(--vibe-pink, #FF3D57)",
                borderRadius: 4,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Unlink size={12} /> Unlink
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Search State (not linked) ──
  return (
    <div style={{ padding: "12px 0" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--vibe-text-muted, #676879)", marginBottom: 8 }}>
        Salesforce
      </div>

      {/* Search input */}
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--vibe-text-muted, #676879)",
          }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Leads, Contacts, Opportunities..."
          style={{
            width: "100%",
            padding: "8px 12px 8px 30px",
            fontSize: 13,
            border: "1px solid var(--vibe-border, #E6E9EF)",
            borderRadius: 4,
            color: "var(--vibe-text-prime, #323338)",
            backgroundColor: "#fff",
            outline: "none",
          }}
        />
        {searching && (
          <Loader2
            size={14}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-50%)",
              animation: "spin 1s linear infinite",
            }}
          />
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{
          marginTop: 4,
          border: "1px solid var(--vibe-border, #E6E9EF)",
          borderRadius: 8,
          maxHeight: 200,
          overflowY: "auto",
        }}>
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              disabled={linking}
              style={{
                width: "100%",
                padding: "8px 12px",
                fontSize: 13,
                textAlign: "left",
                border: "none",
                borderBottom: "1px solid var(--vibe-border, #E6E9EF)",
                backgroundColor: "#fff",
                cursor: linking ? "wait" : "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                transition: "background-color 70ms ease-in-out",
              }}
              onMouseEnter={(e) => ((e.target as HTMLElement).style.backgroundColor = "var(--vibe-surface-2, #F5F6F8)")}
              onMouseLeave={(e) => ((e.target as HTMLElement).style.backgroundColor = "#fff")}
            >
              <span style={{ color: "var(--vibe-text-prime, #323338)" }}>{r.name}</span>
              <span style={{
                fontSize: 11,
                padding: "2px 6px",
                borderRadius: 4,
                backgroundColor: r.type === "Lead" ? "#E8F4FD" : r.type === "Opportunity" ? "#FFF3E0" : "#E8F5E9",
                color: r.type === "Lead" ? "#0176D3" : r.type === "Opportunity" ? "#E65100" : "#2E7D32",
              }}>
                {r.type}
              </span>
            </button>
          ))}
        </div>
      )}

      {query.length > 0 && query.length < 3 && (
        <div style={{ fontSize: 12, color: "var(--vibe-text-muted, #676879)", marginTop: 4, paddingLeft: 4 }}>
          Type at least 3 characters to search
        </div>
      )}
    </div>
  );
}
