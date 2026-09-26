import { ImageResponse } from "next/og";

export const alt = "Echoboard — feedback boards and public roadmaps for SaaS teams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const rows = [
  { votes: 58, title: "Dark mode", status: "Complete", color: "#15803d", bg: "#effaf2" },
  { votes: 47, title: "Two-way calendar sync", status: "In progress", color: "#4f46e5", bg: "#eef0ff" },
  { votes: 31, title: "Outlook integration", status: "Planned", color: "#0369a1", bg: "#e0f2fe" },
];

/** The card shown when the link is shared on LinkedIn, Slack, etc. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#fbfaf8", padding: 72, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 560 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700, color: "#1c1917" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#4f46e5" }} />
            Echoboard
          </div>
          <div style={{ marginTop: 40, fontSize: 64, fontWeight: 700, lineHeight: 1.05, color: "#1c1917" }}>Build what your users are asking for.</div>
          <div style={{ marginTop: 28, fontSize: 28, color: "#6b645c" }}>Feedback boards · Voting · Public roadmaps</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: "auto",
            alignSelf: "center",
            width: 460,
            borderRadius: 24,
            border: "2px solid #e6e2da",
            background: "#ffffff",
            padding: 12,
          }}
        >
          {rows.map((row) => (
            <div key={row.title} style={{ display: "flex", alignItems: "center", gap: 20, padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 72,
                  height: 72,
                  borderRadius: 14,
                  border: "2px solid #e6e2da",
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#1c1917",
                }}
              >
                {row.votes}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 26, fontWeight: 600, color: "#1c1917" }}>{row.title}</div>
                <div style={{ display: "flex", fontSize: 18, color: row.color, background: row.bg, borderRadius: 999, padding: "4px 12px", alignSelf: "flex-start" }}>
                  {row.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
