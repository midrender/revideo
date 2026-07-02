import clsx from 'clsx';
import React, {useEffect, useRef, useState} from 'react';
import styles from './dropdown.module.css';

export interface DropdownProps {
  options: {
    value: number;
    name: string;
  }[];
  value: number;
  className?: string;
  onChange: (value: number) => void;
}

export default function Dropdown({
  options,
  value,
  className,
  onChange,
}: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [ref]);

  return (
    <div ref={ref} className={clsx(styles.dropdown, className)}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.toggle}
        onClick={() => setOpen(!open)}
      >
        {options.find(option => option.value === value)?.name ?? value}
        <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 10l5 5 5-5z" />
        </svg>
      </button>
      {open && (
        <ul className={styles.menu}>
          {options.map(option => (
            <li key={option.value}>
              <button
                type="button"
                className={clsx(
                  styles.item,
                  value === option.value && styles.itemActive,
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
              >
                {option.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
