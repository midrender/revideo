import {SideBordered} from './side-bordered';

export function PageHero({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle: string;
	children?: React.ReactNode;
}) {
	return (
		<SideBordered className="flex flex-col gap-4 p-4">
			<div className="my-8 mx-4 md:m-12 flex flex-col items-center gap-4 md:gap-6">
				<h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl max-w-5xl text-center tracking-[-2px] text-balance">
					{title}
				</h1>
				<p className="text-base md:text-lg max-w-3xl text-center text-muted-foreground text-balance">
					{subtitle}
				</p>
				{children}
			</div>
		</SideBordered>
	);
}
