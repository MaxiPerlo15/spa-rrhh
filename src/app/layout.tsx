import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@uploadthing/react/styles.css";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { ToastProvider } from "@/contexts/ToastContext";
import { SentryUserContext } from "@/components/SentryUserContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Meinardi&Perlo RRHH - Consultora de Recursos Humanos en Las Varillas, Córdoba",
    template: "%s | Meinardi&Perlo RRHH"
  },
  description: "Consultora de Recursos Humanos especializada en reclutamiento y selección de personal en Las Varillas, Córdoba. Conectamos talento con oportunidades laborales de calidad.",
  keywords: ["recursos humanos", "consultora RRHH", "empleo", "ofertas laborales", "Las Varillas", "Córdoba", "Argentina", "reclutamiento", "selección de personal", "búsqueda laboral"],
  authors: [{ name: "Meinardi&Perlo RRHH" }],
  creator: "Meinardi&Perlo RRHH",
  publisher: "Meinardi&Perlo RRHH",
  icons: {
    icon: '/icon.png',
    shortcut: '/icon.png',
    apple: '/icon.png',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://www.meinardiperlo.com",
    title: "Meinardi&Perlo RRHH - Consultora de Recursos Humanos",
    description: "Consultora de Recursos Humanos especializada en reclutamiento y selección de personal en Las Varillas, Córdoba.",
    siteName: "Meinardi&Perlo RRHH",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meinardi&Perlo RRHH - Consultora de Recursos Humanos",
    description: "Consultora de Recursos Humanos especializada en reclutamiento y selección de personal.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <SentryUserContext /> 
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
