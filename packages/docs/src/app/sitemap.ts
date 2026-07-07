import type {MetadataRoute} from "next";
import {readdirSync, statSync} from "node:fs";
import {join, relative} from "node:path";

// Absolute origin (no basePath); the docs are served under midrender.com/revideo.
const ORIGIN = "https://midrender.com";
const CONTENT_DIR = join(process.cwd(), "src", "content");

/** Collect every doc page (content-relative route + last-modified time). */
function collect(dir: string, out: {route: string; mtime: Date}[]) {
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			collect(full, out);
		} else if (/\.mdx?$/.test(entry)) {
			const route = relative(CONTENT_DIR, full)
				.replace(/\\/g, "/")
				.replace(/\.mdx?$/, "")
				.replace(/(^|\/)index$/, ""); // index -> its folder
			out.push({route, mtime: stat.mtime});
		}
	}
}

export default function sitemap(): MetadataRoute.Sitemap {
	const pages: {route: string; mtime: Date}[] = [];
	collect(CONTENT_DIR, pages);

	const docs = pages
		.map(({route, mtime}) => ({
			url: `${ORIGIN}/revideo/docs${route ? `/${route}` : ""}`,
			lastModified: mtime,
		}))
		.sort((a, b) => a.url.localeCompare(b.url));

	// The marketing landing page lives at /revideo (app/page.tsx), outside the
	// docs content tree, so add it explicitly.
	return [{url: `${ORIGIN}/revideo`}, ...docs];
}
