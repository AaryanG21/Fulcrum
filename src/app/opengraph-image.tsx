import { ImageResponse } from "next/og";

export const alt =
  "Fulcrum — a security scorecard and remediation agent for websites";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BASE = "#010511";
const SURFACE = "#050d24";
const LINE = "#1a2c5c";
const INK = "#f2f6ff";
const INK_MUTED = "#b3c0e0";
const SIGNAL = "#6fa0ff";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BASE,
          padding: 72,
          backgroundImage: `linear-gradient(to right, ${LINE} 1px, transparent 1px), linear-gradient(to bottom, ${LINE} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 34,
              height: 34,
              border: `5px solid ${SIGNAL}`,
              transform: "rotate(45deg)",
            }}
          />
          <div
            style={{
              fontSize: 34,
              letterSpacing: 10,
              color: INK,
              fontWeight: 600,
            }}
          >
            FULCRUM
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 68, color: INK, lineHeight: 1.15 }}>
            Know what to fix first,
          </div>
          <div style={{ fontSize: 68, color: SIGNAL, lineHeight: 1.15 }}>
            within the effort you have.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            borderTop: `2px solid ${LINE}`,
            paddingTop: 28,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              color: SIGNAL,
              background: SURFACE,
              border: `2px solid ${LINE}`,
              borderRadius: 999,
              padding: "8px 22px",
            }}
          >
            Scorecard + remediation agent
          </div>
          <div style={{ fontSize: 26, color: INK_MUTED }}>
            Graded A–F, with the reasoning shown
          </div>
        </div>
      </div>
    ),
    size,
  );
}
