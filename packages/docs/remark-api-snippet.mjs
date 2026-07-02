/*
 * Expands `<ApiSnippet url="/api-reference/..." />` elements into an inline
 * excerpt of the generated API reference (signature, description, parameters)
 * followed by a link to the full page.
 *
 * This replaces the old Docusaurus ApiSnippet component, which rendered
 * reflections from a typedoc JSON lookup at runtime. Here the API reference is
 * already generated as markdown (scripts/generate-api.mjs), so we splice the
 * relevant section in at compile time instead — the excerpt becomes ordinary
 * MDX content with working syntax highlighting and links, at zero client cost.
 *
 * Supported url forms (routes relative to src/content, like every other
 * content link — nextra prefixes contentDirBasePath/basePath itself):
 *   /api-reference/core/flow/functions/all           whole symbol page
 *   /api-reference/2d/components/classes/Layout#gap  one member section
 */
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fromMarkdown} from "mdast-util-from-markdown";
import {gfmFromMarkdown} from "mdast-util-gfm";
import {gfm} from "micromark-extension-gfm";
import {visit} from "unist-util-visit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.join(__dirname, "src/content");

// Heading sections that only make sense on the full page.
const DROPPED_SECTIONS = new Set(["Inherited from", "Overrides", "Defined in", "Source", "See"]);

/** GitHub-style slug, matching the anchors nextra generates for headings. */
function slugify(text) {
	return text
		.toLowerCase()
		.replace(/`/g, "")
		.replace(/\\/g, "")
		.replace(/[^a-z0-9 _-]/g, "")
		.trim()
		.replace(/ /g, "-");
}

/** Parse a heading line into {level, text} or null. */
function parseHeading(line) {
	const match = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
	return match ? {level: match[1].length, text: match[2]} : null;
}

/**
 * Extract the markdown lines documenting `anchor` (or the whole page when
 * anchor is empty) from a generated API page.
 */
function extractSection(lines, anchor) {
	let start = -1;
	let minLevel = 1;
	let inCode = false;
	for (let i = 0; i < lines.length; i++) {
		if (/^```/.test(lines[i])) inCode = !inCode;
		const heading = inCode ? null : parseHeading(lines[i]);
		if (!heading) continue;
		if (anchor ? slugify(heading.text) === anchor : heading.level === 1) {
			start = i + 1;
			minLevel = heading.level;
			break;
		}
	}
	if (start === -1) return null;

	const section = [];
	for (let i = start; i < lines.length; i++) {
		const line = lines[i];
		if (/^```/.test(line)) inCode = !inCode;
		const heading = inCode ? null : parseHeading(line);
		// A same-or-higher-level heading ends the section. Members on class
		// pages are additionally separated by *** thematic breaks.
		if (heading && heading.level <= minLevel) break;
		if (anchor && !inCode && /^\*\*\*\s*$/.test(line)) break;
		section.push(line);
	}
	return section;
}

/**
 * Trim the extracted section down to snippet form: no source locations, no
 * inheritance chatter, and headings demoted to bold labels so they neither
 * enter the page TOC nor collide with the hand-written page's anchors.
 */
function toSnippetMarkdown(section) {
	const out = [];
	let skipUntilLevel = 0;
	let inCode = false;
	for (const line of section) {
		if (/^```/.test(line)) inCode = !inCode;
		const heading = inCode ? null : parseHeading(line);
		if (skipUntilLevel) {
			if (!heading || heading.level > skipUntilLevel) continue;
			skipUntilLevel = 0;
		}
		if (heading && DROPPED_SECTIONS.has(heading.text)) {
			skipUntilLevel = heading.level;
			continue;
		}
		if (heading) {
			out.push(`**${heading.text}**`);
			continue;
		}
		if (!inCode && /^Defined in: /.test(line)) continue;
		out.push(line);
	}
	return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** @returns {import('unified').Plugin} */
export default function remarkApiSnippet() {
	return (tree, file) => {
		visit(tree, "mdxJsxFlowElement", (node, index, parent) => {
			if (node.name !== "ApiSnippet" || !parent || index === undefined) return;

			const urlAttribute = (node.attributes ?? []).find(
				attr => attr.type === "mdxJsxAttribute" && attr.name === "url",
			);
			let url = urlAttribute?.value;
			if (url && typeof url === "object") {
				// url={'...'} — unwrap the expression's string literal.
				url = /^\s*['"`](.*)['"`]\s*$/.exec(url.value)?.[1];
			}
			if (typeof url !== "string") {
				throw new Error(`<ApiSnippet> in ${file.path} is missing a string \`url\` attribute`);
			}

			const [routePath, rawAnchor = ""] = url.split("#");
			const anchor = slugify(rawAnchor);
			const filePath = [".md", ".mdx"]
				.map(ext => path.join(contentRoot, routePath + ext))
				.find(candidate => fs.existsSync(candidate));
			if (!filePath) {
				throw new Error(
					`<ApiSnippet url="${url}"> in ${file.path}: no generated page at ` +
						`src/content${routePath}.md — did \`npm run api:generate\` run?`,
				);
			}

			const lines = fs.readFileSync(filePath, "utf8").split("\n");
			const section = extractSection(lines, anchor);
			if (!section) {
				throw new Error(
					`<ApiSnippet url="${url}"> in ${file.path}: no section "#${rawAnchor}" in ${filePath}`,
				);
			}

			const markdown = [
				toSnippetMarkdown(section),
				`[View full API ↗](${routePath}${anchor ? `#${anchor}` : ""})`,
			].join("\n\n");
			const snippet = fromMarkdown(markdown, {
				extensions: [gfm()],
				mdastExtensions: [gfmFromMarkdown()],
			});

			parent.children.splice(index, 1, ...snippet.children);
			// Continue after the spliced-in content.
			return index + snippet.children.length;
		});
	};
}
