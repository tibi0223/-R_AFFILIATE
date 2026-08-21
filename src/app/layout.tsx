import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ÉR Partnerprogram",
  description: "Az Étkezési Rendszer hivatalos partnerprogramja",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = process.env.DEMO_MODE === "1";
  return (
    <html lang="hu">
      <body>
        {demo && (
          <div style={{
            background: "#161A17", color: "#E0A45C", textAlign: "center",
            fontSize: 11.5, fontWeight: 640, letterSpacing: ".08em",
            padding: "6px 12px", textTransform: "uppercase",
          }}>
            Demó mód · mintaadatok · éles adat nincs a rendszerben
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
