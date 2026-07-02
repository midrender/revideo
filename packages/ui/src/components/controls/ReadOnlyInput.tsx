import clsx from 'clsx';
import type {HTMLAttributes} from 'preact';
import styles from './Controls.module.scss';

type ReadOnlyInputProps = HTMLAttributes<HTMLDivElement>;

export function ReadOnlyInput({className, ...props}: ReadOnlyInputProps) {
  return <div className={clsx(className, styles.input)} {...props} />;
}
