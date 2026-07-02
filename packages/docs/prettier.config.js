module.exports = {
	useTabs: true,
	semi: true,
	singleQuote: false,
	quoteProps: "as-needed",
	trailingComma: "all",
	bracketSpacing: false,
	printWidth: 120,
	tabWidth: 4,
	overrides: [
		{
			files: "*.mdx",
			options: {parser: "none"},
		},
	],
};
