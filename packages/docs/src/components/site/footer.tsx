'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';

import {Buffer} from './buffer';
import {GitHubIcon} from './github-icon';
import {Logo} from './logo';
import {SideBordered} from './side-bordered';

const SplashText = [
	"It's here!",
	'Excitement!',
	'One of a kind!',
	'Indev!',
	'Check it out!',
	'Holy cow, man!',
	'Reticulating splines!',
	'Keyboard compatible!',
	"The bee's knees!",
	'Pixels!',
	'Enhanced!',
	'90% bug free!',
	'Pretty!',
	'Technically good!',
	'Indie!',
	'Euclidian!',
	'Es ist sehr gut!',
	'Yes, sir!',
	'Thousands of colors!',
	'Try it!',
	'Sensational!',
	'Guaranteed!',
	'Bring it on!',
	'Ultimate edition!',
];

const docsLinks = [
	{label: 'Installation', href: '/docs/guide/installation-and-setup'},
	{label: 'Project structure', href: '/docs/guide/project-structure'},
	{label: 'Rendering videos', href: '/docs/guide/rendering-videos'},
];

const resourceLinks = [
	{label: 'GitHub', href: 'https://github.com/redotvideo/revideo'},
	{label: 'Discord', href: 'https://discord.gg/MVJsrqjy3j'},
	{label: 'Midrender', href: 'https://midrender.com'},
];

export function SiteFooter() {
	const [splashIndex, setSplashIndex] = useState(0);

	useEffect(() => {
		const rafId = requestAnimationFrame(() => {
			setSplashIndex(Math.floor(Math.random() * SplashText.length));
		});
		const id = setInterval(() => {
			setSplashIndex((prev) => {
				const next = Math.floor(Math.random() * (SplashText.length - 1));
				return next >= prev ? next + 1 : next;
			});
		}, 5000);
		return () => {
			cancelAnimationFrame(rafId);
			clearInterval(id);
		};
	}, []);

	const year = new Date().getFullYear();

	return (
		<>
			<Buffer />
			<SideBordered borderBottom>
			<div className="p-6 sm:p-10 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-10">
				<div className="flex flex-col gap-3">
					<Link href="/" aria-label="Revideo home" className="inline-flex">
						<Logo />
					</Link>
					<div className="text-sm italic">
						<span key={splashIndex} className="shimmer-text">
							{SplashText[splashIndex]}
						</span>
					</div>
				</div>

				<FooterLinkColumn title="Documentation" links={docsLinks} />
				<FooterLinkColumn title="Resources" links={resourceLinks} />
				<FooterColumn title="Contact">
					<div className="flex gap-2">
						<Link
							href="https://github.com/redotvideo/revideo"
							target="_blank"
							rel="noreferrer"
							aria-label="Revideo on GitHub"
							className="inline-flex w-9 h-9 items-center justify-center border border-border-light text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
						>
							<GitHubIcon className="w-4 h-4" />
						</Link>
						<Link
							href="https://x.com/hkonsti_"
							target="_blank"
							rel="noreferrer"
							aria-label="Follow @hkonsti_ on X"
							className="inline-flex w-9 h-9 items-center justify-center border border-border-light text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
						>
							<XLogo className="w-4 h-4" />
						</Link>
					</div>
				</FooterColumn>
			</div>

			<div className="border-t border-border-light px-6 sm:px-10 py-4 text-xs text-muted-foreground">
				<span>© {year} Haven Technologies, Inc.</span>
			</div>
			</SideBordered>
		</>
	);
}

function XLogo({className}: {className?: string}) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
			<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
		</svg>
	);
}

function FooterColumn({title, children}: {title: string; children: React.ReactNode}) {
	return (
		<div className="flex flex-col gap-3">
			<div className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</div>
			{children}
		</div>
	);
}

function FooterLinkColumn({
	title,
	links,
}: {
	title: string;
	links: Array<{label: string; href: string}>;
}) {
	return (
		<FooterColumn title={title}>
			<ul className="flex flex-col gap-1.5">
				{links.map((link) => (
					<li key={link.href}>
						<Link
							href={link.href}
							className="text-sm text-muted-foreground hover:text-foreground transition-colors"
						>
							{link.label}
						</Link>
					</li>
				))}
			</ul>
		</FooterColumn>
	);
}
