/* eslint-env node */
import "./globals.css";
import type {Metadata} from "next";
import {IBM_Plex_Sans, IBM_Plex_Mono} from "next/font/google";
import {Layout} from "nextra-theme-docs";
import {Head} from "nextra/components";
import {getPageMap} from "nextra/page-map";
import "nextra-theme-docs/style.css";

import {SiteFooter} from "@/components/site/footer";
import {SiteHeader} from "@/components/site/header";
import {cn} from "@/lib/utils";

const ibmPlexSans = IBM_Plex_Sans({
	variable: "--font-ibm-plex-sans",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
	variable: "--font-ibm-plex-mono",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
	metadataBase: new URL("https://midrender.com"),
	title: {
		default: "Revideo Docs",
		template: "%s – Revideo",
	},
	description:
		"Documentation for Revideo, the open-source TypeScript framework for programmatic video creation.",
	applicationName: "Revideo",
	openGraph: {
		title: "Revideo Docs",
		description:
			"Documentation for Revideo, the open-source TypeScript framework for programmatic video creation.",
		siteName: "Revideo",
		type: "website",
	},
	twitter: {
		card: "summary_large_image",
		title: "Revideo Docs",
		description:
			"Documentation for Revideo, the open-source TypeScript framework for programmatic video creation.",
	},
};

export default async function RootLayout({children}: {children: React.ReactNode}) {
	const pageMap = await getPageMap();
	return (
		<html lang="en" dir="ltr" suppressHydrationWarning>
			<Head />
			<body
				className={cn(
					ibmPlexSans.variable,
					ibmPlexMono.variable,
					"font-sans antialiased",
				)}
			>
				{/* Marketing-style framed column: a centered max-w-7xl page with a thin
				    border all around and a margin to the viewport edge. The left/right
				    borders run the full height here; SiteHeader (borderTop) and
				    SiteFooter (borderBottom) close the top and bottom. */}
				<div className="px-1 sm:px-4">
					<div className="mx-auto my-1 max-w-7xl border-l border-r border-border-light sm:my-4">
						<Layout
							// Nextra's ConfigProvider renders [navbar, children, footer] as an
							// array, so these elements need stable keys to avoid a React warning.
							navbar={<SiteHeader key="navbar" />}
							footer={<SiteFooter key="footer" />}
							editLink="Edit this page on GitHub"
							docsRepositoryBase="https://github.com/redotvideo/revideo/blob/main/packages/docs"
							sidebar={{defaultMenuCollapseLevel: 1}}
							pageMap={pageMap}
							nextThemes={{defaultTheme: "dark"}}
						>
							{children}
						</Layout>
					</div>
				</div>
			</body>
		</html>
	);
}
