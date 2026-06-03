import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vulpine Bid Platform",
  description: "Multifamily cabinet bid builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: { background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 40px rgba(0,0,0,0.12)' },
            success: { iconTheme: { primary: '#6366f1', secondary: '#fff' } },
            duration: 3000,
          }}
        />
      </body>
    </html>
  );
}
