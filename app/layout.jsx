import { Geist, Geist_Mono, Bebas_Neue, Permanent_Marker } from "next/font/google";
import BookingSSRProvider from "../components/BookingSSRProvider";
import AuthProvider from "../components/AuthProvider";
import AuthModal from "../components/AuthModal";
import ProfilePanel from "../components/ProfilePanel";
import BarberSettingsModal from "../components/BarberSettingsModal";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Bebas_Neue({
  weight: "400",
  variable: "--font-display",
  subsets: ["latin"],
});

const graffiti = Permanent_Marker({
  weight: "400",
  variable: "--font-graffiti",
  subsets: ["latin"],
});

export const metadata = {
  title: "Lemo Barbershop",
  description: "Book your next haircut with Lemo.",
  icons: {
    icon: [{ url: "/lemologocircle.png" }],
    shortcut: ["/lemologocircle.png"],
    apple: ["/lemologocircle.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html suppressHydrationWarning lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} ${graffiti.variable} antialiased`}>
        <AuthProvider>
          <BookingSSRProvider />
          {children}
          <AuthModal />
          <ProfilePanel />
          <BarberSettingsModal />
        </AuthProvider>
      </body>
    </html>
  );
}
