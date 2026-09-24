import "./globals.css";

export const metadata = {
  title: "HashPulse — Live Bitcoin Mining Metrics",
  description: "Live hashprice, difficulty, hashrate, and pool shares from public Bitcoin network data. Not a mining app.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
