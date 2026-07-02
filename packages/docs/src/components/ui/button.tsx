import * as React from 'react';
import {Slot} from '@radix-ui/react-slot';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';

function ButtonShortcut({
	className,
	visible = true,
	...props
}: React.ComponentProps<'span'> & {visible?: boolean}) {
	return (
		<span
			className={cn(
				'ml-2 flex items-center justify-center rounded-sm w-5 h-5 text-primary-foreground text-xs font-[system-ui] transition-all duration-150 overflow-hidden',
				visible ? 'opacity-100' : 'opacity-0 w-0 ml-0',
				className,
			)}
			{...props}
		/>
	);
}

function ButtonLoader({visible}: {visible: boolean}) {
	return (
		<span
			className={cn(
				'transition-all duration-150 overflow-hidden flex items-center',
				visible ? 'opacity-100 mr-2' : 'opacity-0 w-0',
			)}
		>
			<svg
				className="w-4 h-4 animate-spin"
				viewBox="0 0 24 24"
				fill="none"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
				<path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
			</svg>
		</span>
	);
}

const buttonVariants = cva(
	'inline-flex items-center justify-center whitespace-nowrap rounded-xs text-sm font-mono disabled:pointer-events-none disabled:opacity-80 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/90',
				destructive: 'bg-destructive text-white hover:bg-destructive/90',
				outline: 'border border-border text-foreground hover:bg-muted',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
				ghost: 'hover:bg-accent hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline',
			},
			size: {
				default: 'h-8 px-3 py-1',
				sm: 'h-7 px-2 py-0.5',
				lg: 'h-9 px-4 py-1.5',
				icon: 'size-8',
				'icon-sm': 'size-7',
				'icon-lg': 'size-9',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

function Button({
	className,
	variant,
	size,
	asChild = false,
	shortcut,
	children,
	loading,
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		shortcut?: React.ReactNode;
		loading?: boolean;
	}) {
	const Comp = asChild ? Slot : 'button';

	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({variant, size, className}))}
			{...props}
			disabled={loading || props.disabled}
		>
			<ButtonLoader visible={!!loading} />
			{children}
			{shortcut && <ButtonShortcut visible={!loading}>{shortcut}</ButtonShortcut>}
		</Comp>
	);
}

export {Button, buttonVariants, ButtonShortcut};
