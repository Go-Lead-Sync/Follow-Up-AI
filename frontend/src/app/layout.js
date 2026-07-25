import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

export const metadata = {
  title: "Follow-Up AI",
  description: "The AI-powered CRM, conversations, and automation platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
