import Image from 'next/image';

export function Logo() {
	return (
		<div className="flex items-center gap-2">
			{/* White wordmark for the dark UI. next/image prefixes the basePath (/revideo). */}
			<Image
				src="/img/logo_dark.svg"
				alt="Revideo"
				width={140}
				height={32}
				className="h-6 w-auto"
				priority
				unoptimized
			/>
			<span className="font-mono text-[10px] font-semibold uppercase tracking-wider border border-current px-1.5 py-0.5 text-muted-foreground">
				docs
			</span>
		</div>
	);
}
