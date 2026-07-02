import React from 'react';

export function PlayArrow() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export function Pause() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

export function SkipNext() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
    </svg>
  );
}

export function SkipPrevious() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
    </svg>
  );
}

export function IconImage() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
    </svg>
  );
}

export function IconSplit() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 15h8v-2H3v2zm0 4h8v-2H3v2zm0-8h8V9H3v2zm0-6v2h8V5H3zm10 0h8v14h-8V5z" />
    </svg>
  );
}

export function IconText() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 15h16v-2H4v2zm0 4h16v-2H4v2zm0-8h16V9H4v2zm0-6v2h16V5H4z" />
    </svg>
  );
}
