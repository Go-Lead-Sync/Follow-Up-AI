import "./globals.css";

export const metadata = {
  title: "Follow-Up AI",
  description: "Follow-Up AI MVP",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
