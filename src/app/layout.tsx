import type { Metadata } from "next";
import { Geist_Mono, Manrope, Sora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import CookieNotice from "@/components/CookieNotice";
import { ToastProvider } from "@/contexts/ToastContext";
import { CspNonceProvider } from "@/contexts/CspNonceContext";
import { SentryUserContext } from "@/components/SentryUserContext";
import { isSpringAuthEnabled } from "@/lib/server/springBackend";
import { headers } from "next/headers";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce')
  const springAuthEnabled = isSpringAuthEnabled()

  return (
    <html lang="es">
      <body
        className={`${manrope.variable} ${sora.variable} ${geistMono.variable} antialiased`}
      >
        <CspNonceProvider value={nonce}>
          {springAuthEnabled ? (
            <ToastProvider>
              {children}
              <CookieNotice />
            </ToastProvider>
          ) : (
            <AuthProvider>
              <SentryUserContext />
              <ToastProvider>
                {children}
                <CookieNotice />
              </ToastProvider>
            </AuthProvider>
          )}
        </CspNonceProvider>
      </body>
    </html>
  );
}
