import "./globals.css";
import { WebSocketProvider } from "./WebSocketProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black">
        <WebSocketProvider>{children}</WebSocketProvider>
      </body>
    </html>
  );
}