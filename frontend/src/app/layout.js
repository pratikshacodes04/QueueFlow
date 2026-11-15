import "@/styles/globals.css";
import { AppProvider } from "@/context/AppContext";
import { ToastProvider } from "@/context/ToastContext";
import { AuthProvider } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: "QueueFlow – Smart Queue Management System",
  description:
    "Enterprise Smart Queue Management System built with Next.js App Router and FastAPI architecture.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <ToastProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
