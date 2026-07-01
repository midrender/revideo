'use client';

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';

import {Buffer} from './buffer';
import {GitHubIcon} from './github-icon';
import {Logo} from './logo';
import {SideBordered} from './side-bordered';
import {Button, buttonVariants} from '@/components/ui/button';
import {EnterIcon} from '@/components/ui/enter-icon';
import {cn} from '@/lib/utils';

const GITHUB_URL = 'https://github.com/redotvideo/revideo';

const NAV_LINKS = [{label: 'Documentation', href: '/docs'}] as const;

function isLinkActive(pathname: string, href: string) {
	return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

function HeaderNavLink({
	href,
	label,
	onClick,
	className,
}: {
	href: string;
	label: string;
	onClick?: () => void;
	className?: string;
}) {
	const pathname = usePathname();
	const isActive = isLinkActive(pathname, href);

	return (
		<Link
			href={href}
			onClick={onClick}
			className={cn(
				buttonVariants({variant: 'ghost', size: 'lg'}),
				'text-muted-foreground hover:text-foreground',
				isActive && 'text-foreground',
				className,
			)}
		>
			{label}
		</Link>
	);
}

export function SiteHeader() {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	return (
		<div>
			<SideBordered borderTop className="flex justify-between items-center pl-4 pr-2 py-2">
				<Link href="/" aria-label="Revideo home" className="inline-flex">
					<Logo />
				</Link>

				{/* Desktop navigation */}
				<div className="hidden md:flex items-center">
					<div className="flex items-center gap-0.5">
						{NAV_LINKS.map((link) => (
							<HeaderNavLink key={link.href} href={link.href} label={link.label} />
						))}
					</div>
					<div className="mx-2 h-5 w-px bg-border-light" aria-hidden />
					<Link
						href={GITHUB_URL}
						target="_blank"
						rel="noreferrer"
						aria-label="Revideo on GitHub"
						className={cn(
							buttonVariants({variant: 'ghost', size: 'icon-lg'}),
							'text-muted-foreground hover:text-foreground',
						)}
					>
						<GitHubIcon className="w-[18px] h-[18px]" />
					</Link>
					<div className="mx-2 h-5 w-px bg-border-light" aria-hidden />
					<Link href="https://app.midrender.com" className="justify-center">
						<Button size="lg" shortcut={<EnterIcon />}>
							Try Midrender
						</Button>
					</Link>
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
						<div className="flex flex-col gap-1">
							{NAV_LINKS.map((link) => (
								<HeaderNavLink
									key={link.href}
									href={link.href}
									label={link.label}
									onClick={() => setMobileMenuOpen(false)}
									className="w-full justify-start"
								/>
							))}
							<Link
								href={GITHUB_URL}
								target="_blank"
								rel="noreferrer"
								onClick={() => setMobileMenuOpen(false)}
								className={cn(
									buttonVariants({variant: 'ghost', size: 'lg'}),
									'w-full justify-start text-muted-foreground hover:text-foreground',
								)}
							>
								GitHub
							</Link>
						</div>
						<Link href="https://app.midrender.com" className="w-full">
							<Button size="lg" shortcut={<EnterIcon />} className="w-full">
								Try Midrender
							</Button>
						</Link>
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
