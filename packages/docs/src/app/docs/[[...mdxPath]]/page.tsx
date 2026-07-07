/* eslint-disable react-hooks/rules-of-hooks -- false positive, useMDXComponents isn't react hooks */

import {importPage} from "nextra/pages";
import {useMDXComponents} from "../../../../mdx-components";

export async function generateMetadata(props: {params: Promise<{mdxPath: string[]}>}) {
	const params = await props.params;
	const {metadata} = await importPage(params.mdxPath);
	// Self-referencing canonical so Google settles on the new URL (important for
	// the docs.re.video -> midrender.com/revideo/docs migration). Absolute URL:
	// metadataBase doesn't include the "/revideo" basePath.
	const path = params.mdxPath?.length ? `/${params.mdxPath.join("/")}` : "";
	return {
		...metadata,
		alternates: {
			...metadata?.alternates,
			canonical: `https://midrender.com/revideo/docs${path}`,
		},
	};
}

const Wrapper = useMDXComponents().wrapper;

export default async function Page(props: {params: Promise<{mdxPath: string[]}>}) {
	const params = await props.params;
	const result = await importPage(params.mdxPath);
	const {default: MDXContent, toc, metadata} = result;
	return (
		<Wrapper toc={toc} metadata={metadata}>
			<MDXContent {...props} params={params} />
		</Wrapper>
	);
}
