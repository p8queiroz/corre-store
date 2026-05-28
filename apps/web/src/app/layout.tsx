import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { Providers } from "@/providers/Providers";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: {
    default: "StrideMarket — Running Gear Marketplace",
    template: "%s | StrideMarket",
  },
  description:
    "Buy and sell running shoes, hydration gear, wearables, and marathon essentials.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <Providers>
            <SiteHeader />
            <main>{children}</main>
            <SiteFooter />
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
