import type {HTMLAttributes} from 'preact';

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

export function Separator({size = 2, ...props}: SeparatorProps) {
  return (
    <div
      {...props}
      style={{
        height: size * 8,
      }}
    />
  );
}
