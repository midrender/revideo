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
});
