// @ts-check
/*
 * Generates the API reference for @revideo/core and @revideo/2d.
 *
 * This replaces the old Docusaurus custom TypeDoc plugin (packages/docs/typedoc.js)
 * with a Nextra-native approach: TypeDoc + typedoc-plugin-markdown emit MDX pages
 * into src/content/api-reference/{core,2d}/, which Nextra then renders as ordinary
 * content. The module list mirrors the entry points the old plugin documented.
 */
import {Application, TSConfigReader} from "typedoc";
import {fileURLToPath} from "node:url";
import path from "node:path";
import fs from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, "..");
const pkgRoot = path.resolve(docsRoot, "..");
const outRoot = path.join(docsRoot, "src/content/api-reference");

/** @type {Array<{id: string, title: string, tsconfig: string, modules: string[], srcBase: string}>} */
const PROJECTS = [
	{
		id: "core",
		title: "Core",
		tsconfig: path.join(pkgRoot, "core/tsconfig.build.json"),
		srcBase: path.join(pkgRoot, "core/src"),
		modules: [
			"app",
			"decorators",
			"events",
			"exporter",
			"flow",
			"media",
			"plugin",
			"scenes",
			"signals",
			"threading",
			"transitions",
			"tweening",
			"types",
			"utils",
		],
	},
	{
		id: "2d",
		title: "2D",
		tsconfig: path.join(pkgRoot, "2d/src/lib/tsconfig.json"),
		srcBase: path.join(pkgRoot, "2d/src/lib"),
		modules: ["components", "code", "curves", "decorators", "partials", "scenes", "utils"],
	},
];

async function generateProject(project) {
	const out = path.join(outRoot, project.id);
	await fs.rm(out, {recursive: true, force: true});

	const app = await Application.bootstrapWithPlugins(
		{
			entryPoints: project.modules.map(m => path.join(project.srcBase, m, "index.ts")),
			entryPointStrategy: "resolve",
			tsconfig: project.tsconfig,
			out,
			plugin: ["typedoc-plugin-markdown", "typedoc-plugin-frontmatter"],
			skipErrorChecking: true,
			excludeInternal: true,
			excludePrivate: true,
			excludeExternals: true,
			readme: "none",
			githubPages: false,
			hideGenerator: true,
			// The git remote is the private `midrender/revideo`; point "Defined in"
			// source links at the public repo used everywhere else in the docs. Pin to
			// `main` so links stay valid regardless of the local checkout's SHA.
			sourceLinkTemplate: "https://github.com/redotvideo/revideo/blob/main/{path}#L{line}",
			// plugin-markdown options
			outputFileStrategy: "members",
			// Folder landing pages become `index.md` so Nextra treats them as the
			// section index (route = the folder itself) instead of a `/README` page.
			entryFileName: "index",
			hideBreadcrumbs: false,
			hidePageHeader: false,
			// Fenced TypeDoc signatures explode the generated API tree into tens of
			// thousands of highlighted code blocks. Nextra then runs Shiki over all of
			// them during `next build`, which dominates docs build time and memory.
			useCodeBlocks: false,
			expandObjects: true,
			// keep angle-bracket generics MDX-safe (wrap types in code)
			formatWithPrettier: false,
		},
		[new TSConfigReader()],
	);

	const converted = await app.convert();
	if (!converted) {
		throw new Error(`TypeDoc failed to convert project "${project.id}"`);
	}
	await app.generateOutputs(converted);

	await postProcess(out);
	console.log(`✓ generated api-reference/${project.id}`);
}

/** Recursively collect every markdown file under `dir`. */
async function collectMarkdown(dir) {
	const entries = await fs.readdir(dir, {withFileTypes: true});
	const files = [];
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectMarkdown(full)));
		} else if (entry.name.endsWith(".md")) {
			files.push(full);
		}
	}
	return files;
}

/**
 * TypeDoc emits relative links with a `.md` suffix (e.g. `../interfaces/Foo.md`)
 * and names folder indexes `index.md`. Neither resolves as a Nextra route, so we
 * rewrite every internal link to an absolute, extensionless route and drop the
 * trailing `/index`. We also drop each page's `_media`-style breadcrumb noise by
 * leaving it to Nextra's own breadcrumbs.
 */
async function postProcess(root) {
	const files = await collectMarkdown(root);
	// route base for the whole api reference tree, e.g. "/api-reference"
	const contentRoot = path.join(docsRoot, "src/content");
	for (const file of files) {
		let text = await fs.readFile(file, "utf8");
		const fileDir = path.dirname(file);
		text = text.replace(/\]\(([^)]+?\.md)(#[^)]*)?\)/g, (_m, target, hash = "") => {
			// leave absolute URLs (http, /, etc.) untouched — these are relative
			if (/^[a-z]+:/i.test(target) || target.startsWith("/")) {
				return `](${target}${hash})`;
			}
			const abs = path.resolve(fileDir, target);
			let route = "/" + path.relative(contentRoot, abs).split(path.sep).join("/");
			route = route.replace(/\.md$/, "").replace(/\/index$/, "");
			return `](${route}${hash})`;
		});
		await fs.writeFile(file, text, "utf8");
	}
}

for (const project of PROJECTS) {
	await generateProject(project);
}
