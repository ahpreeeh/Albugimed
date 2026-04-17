import type { Metadata } from "next";
import { DM_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/layout/LayoutShell";
import { ThemeProvider } from "@/context/ThemeContext";
import { DEFAULT_THEME, THEME_BOOTSTRAP_SCRIPT } from "@/shared/lib/theme";

const plusJakartaSans = Plus_Jakarta_Sans({
    subsets: ["latin"],
    variable: "--font-sans",
    weight: ["300", "400", "500", "600", "700"],
});

const dmMono = DM_Mono({
    subsets: ["latin"],
    variable: "--font-mono",
    weight: ["400", "500"],
});

export const metadata: Metadata = {
    title: "AlbugiMed",
    description: "Advanced Medical Revision System",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr" data-theme={DEFAULT_THEME} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
            </head>
            <body className={`${plusJakartaSans.variable} ${dmMono.variable} font-sans antialiased`}>
                <ThemeProvider>
                    <LayoutShell>
                        {children}
                    </LayoutShell>
                </ThemeProvider>
            </body>
        </html>
    );
}
