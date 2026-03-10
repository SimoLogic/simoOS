import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "SIMO Intellisense — Enterprise Operating System",
    description: "Business Operating System for Mortgage Professionals",
};

const supportedLocales = ["en", "es"];

export function generateStaticParams() {
    return supportedLocales.map((locale) => ({ locale }));
}

export default function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: { locale: string };
}) {
    return <>{children}</>;
}
