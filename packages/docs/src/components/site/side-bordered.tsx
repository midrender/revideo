import {cn} from '@/lib/utils';

export function SideBordered({
	children,
	className,
	borderTop = false,
	borderBottom = false,
	id,
}: {
	children: React.ReactNode;
	className?: string;
	borderTop?: boolean;
	borderBottom?: boolean;
	id?: string;
}) {
	return (
		<div
			id={id}
			className={cn(
				'border-l border-r border-border-light',
				borderTop && 'border-t',
				borderBottom && 'border-b',
				className,
			)}
		>
			{children}
		</div>
	);
}
