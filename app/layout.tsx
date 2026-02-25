import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "SIMO Intellisense — Enterprise Operating System",
    description: "Business Operating System for Mortgage Professionals",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="h-full overflow-hidden">
            <body className="h-full overflow-hidden">{children}</body>
        </html>
    );
}
