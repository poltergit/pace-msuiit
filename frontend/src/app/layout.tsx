import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "P.A.C.E. Career Center | MSU-IIT",
  description:
    "Professional Advancement and Career Empowerment (P.A.C.E.) is the MSU-IIT platform connecting students, counselors, alumni, and authorized partner recruiters through guidance, preparation, and opportunity.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="bg-[#F4F6F9] text-[#1E293B] antialiased">
        {children}
      </body>
    </html>
  );
}
