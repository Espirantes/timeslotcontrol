import { Inter } from "next/font/google";
import { getLocale } from "next-intl/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
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
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
