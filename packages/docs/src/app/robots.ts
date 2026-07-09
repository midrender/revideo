import type {MetadataRoute} from "next";

// NOTE: with basePath "/revideo" this is served at /revideo/robots.txt. Crawlers
// only read robots.txt from the domain root (midrender.com/robots.txt), which is
// owned by the main app, so the authoritative robots.txt must live there and
// reference this sitemap. This file keeps the docs zone self-describing and works
// if the docs are ever served on their own domain.
export default function robots(): MetadataRoute.Robots {
	return {
		rules: {userAgent: "*", allow: "/"},
		sitemap: "https://midrender.com/revideo/sitemap.xml",
	};
}
