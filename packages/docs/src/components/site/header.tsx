'use client';

import {useState} from 'react';

import {Buffer} from './buffer';
import {Logo} from './logo';
import {SideBordered} from './side-bordered';
import {Button, buttonVariants} from '@/components/ui/button';
import {EnterIcon} from '@/components/ui/enter-icon';
import {cn} from '@/lib/utils';

// Mirrors the midrender.com marketing header. These pages live at the
// midrender.com root, outside this deployment's `/revideo` basePath, so they use
// plain root-relative anchors — Next's <Link> would incorrectly prepend the
// basePath and point at `/revideo/pricing` etc.
const navLinks = [
	{label: 'Pricing', href: '/pricing'},
	{label: 'Changelog', href: '/changelog'},
];

export function SiteHeader() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<div>
			<SideBordered borderTop className="flex justify-between items-center pl-4 pr-2 py-2">
				<a href="/" aria-label="Midrender home" className="inline-flex">
					<Logo />
				</a>

				{/* Desktop navigation */}
				<div className="hidden md:flex items-center">
					<div className="flex items-center gap-0.5">
						{navLinks.map((link) => (
							<a
								key={link.href}
								href={link.href}
								className={cn(
									buttonVariants({variant: 'ghost', size: 'lg'}),
									'text-muted-foreground hover:text-foreground',
								)}
							>
								{link.label}
							</a>
						))}
					</div>
					<div className="mx-2 h-5 w-px bg-border-light" aria-hidden="true" />
					<a href="https://app.midrender.com" className="justify-center">
						<Button size="lg" shortcut={<EnterIcon />}>
							Get started
						</Button>
					</a>
				</div>

				{/* Mobile menu button */}
				<button
					className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
					onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
				>
					{mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
				</button>
			</SideBordered>

			{/* Mobile menu */}
			{mobileMenuOpen && (
				<SideBordered borderTop className="md:hidden bg-background">
					<div className="flex flex-col p-4 gap-3">
						{navLinks.map((link) => (
							<a
								key={link.href}
								href={link.href}
								onClick={() => setMobileMenuOpen(false)}
								className={cn(
									buttonVariants({variant: 'ghost', size: 'lg'}),
									'w-full justify-start text-muted-foreground hover:text-foreground',
								)}
							>
								{link.label}
							</a>
						))}
						<a href="https://app.midrender.com" className="w-full">
							<Button size="lg" shortcut={<EnterIcon />} className="w-full">
								Get started
							</Button>
						</a>
					</div>
				</SideBordered>
			)}

			<Buffer />
		</div>
	);
}

function MenuIcon({className}: {className?: string}) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className={className}
		>
			<path d="M4 6h16M4 12h16M4 18h16" />
		</svg>
	);
}

function XIcon({className}: {className?: string}) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className={className}
		>
			<path d="M18 6 6 18M6 6l12 12" />
		</svg>
	);
}
