import nextra from "nextra";
import remarkApiSnippet from "./remark-api-snippet.mjs";
import remarkDocsLinks from "./remark-docs-links.mjs";
import remarkFiddle from "./remark-fiddle.mjs";

const withNextra = nextra({
	latex: true,
	search: {
		codeblocks: false,
	},
	contentDirBasePath: "/docs",
	mdxOptions: {
		// Turns <ApiSnippet url="..."> elements into inline API reference
		// excerpts, then ```tsx editor fences into interactive <Fiddle>
		// previews, then prefixes content links with /docs. Order matters:
		// snippets can splice in editor fences and links, so remarkApiSnippet
		// must run before the other two.
		remarkPlugins: [remarkApiSnippet, remarkFiddle, remarkDocsLinks],
	},
});

export default withNextra({
	reactStrictMode: true,
	// The docs app is served as a Next.js "multi zone" under midrender.com/revideo.
	// midrender.com rewrites /revideo* to this deployment; basePath keeps every
	// internal link and asset correctly prefixed. Landing lives at /revideo, docs
	// at /revideo/docs.
	basePath: "/revideo",
	// Nextra's Mermaid client component imports `@theguild/remark-mermaid/mermaid`,
	// which is ESM-only (its exports define no `require` condition). Nextra only
	// aliases it for Turbopack; under the webpack production build the server bundle
	// would externalize it and fail to `require()` it at runtime. Transpiling the
	// package makes Next bundle it instead of externalizing.
	transpilePackages: ["@theguild/remark-mermaid"],
	// Because midrender.com proxies /revideo* to this deployment via its
	// *.vercel.app URL, Vercel automatically injects `X-Robots-Tag: noindex` on the
	// proxied response, which would keep the docs out of Google. Setting the header
	// here — at the source, before the response leaves this deployment — replaces
	// that value so the proxy forwards a single, clean `index, follow`. basePath is
	// applied to `source`, so `/:path*` covers every route under /revideo.
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [{key: "X-Robots-Tag", value: "index, follow"}],
			},
		];
	},
});
