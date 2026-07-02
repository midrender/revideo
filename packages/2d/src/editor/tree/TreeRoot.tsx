import {clsx} from 'clsx';
import type {HTMLAttributes} from 'preact';
import styles from './index.module.scss';

export function TreeRoot({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx(styles.root, className)} {...props} />;
}
