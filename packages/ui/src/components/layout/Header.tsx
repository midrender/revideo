import clsx from 'clsx';
import type {HTMLAttributes} from 'preact';
import styles from './Header.module.scss';

export function Header({className, ...props}: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx(styles.header, className)} {...props} />;
}
