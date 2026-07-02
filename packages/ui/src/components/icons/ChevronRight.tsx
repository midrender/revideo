import type {SVGAttributes} from 'preact';

export function ChevronRight(props: SVGAttributes<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <polygon points="10.71 16.71 9.29 15.29 12.59 12 9.29 8.71 10.71 7.29 15.41 12 10.71 16.71" />
    </svg>
  );
}
