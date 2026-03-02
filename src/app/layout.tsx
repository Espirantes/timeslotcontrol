import { Geist } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale = "cs";
  try {
    locale = await getLocale();
  } catch {
    // fallback to default when middleware hasn't set locale yet
  }

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
