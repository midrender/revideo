// @ts-check
/*
 * One-shot content migration: rewrite the legacy Docusaurus `/api/<project>/...`
 * links in the hand-written docs to the new generated `/api-reference/...` routes.
 *
 * The old scheme was `/api/<project>/<module>/<Name>` (with members as #anchors on
 * class/module pages). The generated scheme inserts a <kind> segment
 * (`/api-reference/<project>/<module>/<kind>/<Name>`) and gives every module-level
 * function/variable its own page. We reconstruct the mapping from the generated
 * files so each legacy link lands on the correct page.
 *
 * Pass `--check` to only report coverage without writing.
 */
import {fileURLToPath} from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, "..");
const contentRoot = path.join(docsRoot, "src/content");
const apiRoot = path.join(contentRoot, "api-reference");
const check = process.argv.includes("--check");

/** Recursively collect files matching `test`. */
async function collect(dir, test, out = []) {
	for (const entry of await fs.readdir(dir, {withFileTypes: true})) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) await collect(full, test, out);
		else if (test(entry.name)) out.push(full);
	}
	return out;
}

// Build map: "<project>/<module>/<Name>" -> "/api-reference/<project>/<module>/<kind>/<Name>"
const generated = await collect(apiRoot, n => n.endsWith(".md") && n !== "index.md");
/** @type {Map<string,string>} */
const symbolMap = new Map();
for (const file of generated) {
	const rel = path.relative(apiRoot, file).replace(/\.md$/, "");
	const parts = rel.split(path.sep); // <project>/<module>/<kind>/<Name>
	if (parts.length !== 4) continue;
	const [project, mod, , name] = parts;
	symbolMap.set(`${project}/${mod}/${name}`, `/api-reference/${rel.split(path.sep).join("/")}`);
}

/** Resolve one legacy `/api/...` target to a new route (or null if unmatched). */
function resolveTarget(target) {
	let [pathPart, anchor] = target.split("#");
	pathPart = pathPart.replace(/\/$/, ""); // strip trailing slash before #
	const segs = pathPart.replace(/^\/api\//, "").split("/"); // <project>/<module>[/<Name>]
	const project = segs[0];
	const mod = segs[1];
	const name = segs[2];

	if (name) {
		// /api/<p>/<m>/<Name>[#member] — a symbol page; keep the member anchor.
		const route = symbolMap.get(`${project}/${mod}/${name}`);
		if (route) return anchor ? `${route}#${anchor}` : route;
		return null;
	}
	if (mod) {
		// /api/<p>/<m>[#member]
		if (anchor) {
			// A module-level member is now its own page under functions/ or variables/.
			const route = symbolMap.get(`${project}/${mod}/${anchor}`);
			if (route) return route; // drop anchor: it's now a page
			// section header anchor (e.g. #Functions) — just land on the module index
			return `/api-reference/${project}/${mod}`;
		}
		return `/api-reference/${project}/${mod}`;
	}
	return `/api-reference/${project}`;
}

// Rewrite every non-generated content file.
const contentFiles = (await collect(contentRoot, n => n.endsWith(".mdx") || n.endsWith(".md")))
	.filter(f => !f.startsWith(apiRoot + path.sep) || path.basename(f) === "index.md" && false);
// (only hand-written content — exclude generated api-reference tree entirely)
const handWritten = contentFiles.filter(f => !f.startsWith(apiRoot + path.sep));

const unmatched = new Set();
let rewrites = 0;
let filesTouched = 0;

for (const file of handWritten) {
	let text = await fs.readFile(file, "utf8");
	let changed = false;
	text = text.replace(/\]\((\/api\/(?:core|2d)[a-zA-Z0-9/_#-]*)\)/g, (m, target) => {
		const route = resolveTarget(target);
		if (!route) {
			unmatched.add(target);
			return m;
		}
		rewrites++;
		changed = true;
		return `](${route})`;
	});
	if (changed) {
		filesTouched++;
		if (!check) await fs.writeFile(file, text, "utf8");
	}
}

console.log(`${check ? "[check] would rewrite" : "rewrote"} ${rewrites} links across ${filesTouched} files`);
console.log(`symbol map entries: ${symbolMap.size}`);
if (unmatched.size) {
	console.log(`\nUNMATCHED (${unmatched.size}):`);
	for (const u of [...unmatched].sort()) console.log("  " + u);
} else {
	console.log("all links matched ✓");
}
