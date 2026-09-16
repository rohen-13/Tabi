import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Tabi — Japan, your way", description: "Explore Japan with a personal itinerary, interactive map and transparent travel budget.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) { return <html lang="en"><body>{children}</body></html>; }
