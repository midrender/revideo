/*
 * Prefixes absolute in-content links with contentDirBasePath ("/docs").
 *
 * Content lives in src/content but is served under /docs (see next.config.ts),
 * and nextra does not rewrite markdown links accordingly — `[x](/animations/flow)`
 * would render as a dead /revideo/animations/flow. Authors (and the generated
 * API reference) write routes relative to the content root; this plugin turns
 * them into real routes at compile time. Only links whose first segment is a
 * top-level content entry are touched, so app routes (/blog, /showcase) and
 * static assets (/img, /modules) pass through untouched.
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {visit} from "unist-util-visit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.join(__dirname, "src/content");
const CONTENT_BASE = "/docs";

const topLevel = new Set(
	fs
		.readdirSync(contentRoot)
		.filter(name => !name.startsWith("_"))
		.map(name => name.replace(/\.mdx?$/, "")),
);

function rewrite(url) {
	const first = /^\/([^/#?]+)/.exec(url)?.[1];
	return first && topLevel.has(first) ? CONTENT_BASE + url : url;
}

/** @returns {import('unified').Plugin} */
export default function remarkDocsLinks() {
	return tree => {
		visit(tree, ["link", "definition"], node => {
			node.url = rewrite(node.url);
		});
	};
}
