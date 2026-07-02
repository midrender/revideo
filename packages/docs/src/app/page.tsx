import type {Metadata} from 'next';
import Link from 'next/link';

import {PageHero} from '@/components/site/page-hero';
import {SideBordered} from '@/components/site/side-bordered';
import {Button} from '@/components/ui/button';

export const metadata: Metadata = {
	title: 'Revideo',
	description:
		'Revideo, the open-source framework for programmatic video creation, is now part of Midrender.',
	openGraph: {
		title: 'The next chapter of Revideo',
		description:
			'Revideo, the open-source framework for programmatic video creation, is now part of Midrender.',
	},
};

export default function IndexPage() {
	return (
		<div className="flex flex-col">
			<PageHero
				title="The next chapter of Revideo."
				subtitle="The open-source framework for programmatic video creation lives on as the engine behind Midrender."
			>
				<div className="flex gap-3 m-auto">
					<Link href="https://app.midrender.com">
						<Button size="lg">Try Midrender</Button>
					</Link>
					<Link href="https://github.com/redotvideo/revideo">
						<Button size="lg" variant="outline">
							GitHub
						</Button>
					</Link>
				</div>
			</PageHero>

			<SideBordered className="px-4 py-12 md:px-12">
				<div className="max-w-2xl mx-auto space-y-16">
					<Section title="What is Revideo?">
						<p>
							Revideo is an open-source TypeScript framework for creating and editing videos
							programmatically. It&apos;s a fork of{' '}
							<Anchor href="https://motioncanvas.io">Motion Canvas</Anchor> that adds headless
							rendering, audio support, and a library-first API. You can generate videos from code,
							deploy rendering as serverless functions, or build entire video editors in the browser.
						</p>
						<p>
							People use it for video ads at scale, automated TikTok and YouTube Shorts content, and
							custom video tooling.
						</p>
						<p>
							Ready to build?{' '}
							<Anchor href="/docs">Read the documentation</Anchor> to get started.
						</p>
					</Section>

					<Section title="What is Midrender?">
						<p>
							Midrender is a visual editor for motion graphics built on Revideo&apos;s animation
							engine. It puts the same programmatic video ideas behind a visual interface, with AI
							that can understand and edit your compositions.
						</p>
						<p>
							Midrender speaks MCP, so you can connect it to agents like Claude Code or Cursor and
							create motion content from your terminal.
						</p>
					</Section>

					<Section title="Where is development happening?">
						<p>
							The team behind Revideo now primarily works on Midrender. Revideo&apos;s animation
							engine continues to be developed as part of Midrender, though recent changes have not
							yet been upstreamed to the open-source repository.
						</p>
						<p>
							The <Anchor href="https://github.com/redotvideo/revideo">GitHub repository</Anchor> and{' '}
							<Anchor href="/docs">documentation</Anchor> remain available.
						</p>
					</Section>
				</div>
			</SideBordered>
		</div>
	);
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
	return (
		<div className="space-y-4">
			<h2 className="text-xl md:text-2xl tracking-[-1px]">{title}</h2>
			<div className="space-y-3 text-muted-foreground text-base leading-relaxed">{children}</div>
		</div>
	);
}

function Anchor({href, children}: {href: string; children: React.ReactNode}) {
	return (
		<Link
			href={href}
			className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
		>
			{children}
		</Link>
	);
}
