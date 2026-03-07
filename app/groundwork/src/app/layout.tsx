import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import WalletContextProvider from "@/lib/wallet";

const workSans = Work_Sans({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-work-sans",
});

export const metadata: Metadata = {
  title: "Groundwork",
  description: "Savings accountability for your first home.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${workSans.variable} antialiased`}>
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
