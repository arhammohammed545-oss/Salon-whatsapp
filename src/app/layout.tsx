import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Salon WhatsApp Manager",
  description: "Customer and appointment messaging management for salons."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
