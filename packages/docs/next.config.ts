import nextra from "nextra";

const withNextra = nextra({
	latex: true,
	search: {
		codeblocks: false,
	},
	contentDirBasePath: "/docs",
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
});
