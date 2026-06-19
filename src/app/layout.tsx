import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeFit — Free ATS Resume Scorer",
  description:
    "Score your resume against any job description for free, then let AI tailor it. Export to PDF or Word.",
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
