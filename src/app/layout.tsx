import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MazaCV — Free ATS Resume Scorer | CV banao mazedaar",
  description:
    "MazaCV — score your resume against any job description for free, then let AI tailor it. Export to PDF or Word. Made in Mumbai. mazacv.in",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
