import type {LabelHTMLAttributes} from 'preact';
import styles from './Controls.module.scss';

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

export function Label(props: LabelProps) {
  return (
    <label
      title={props.children as string}
      className={styles.label}
      {...props}
    />
  );
}
