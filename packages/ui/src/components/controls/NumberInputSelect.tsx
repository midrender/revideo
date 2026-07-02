import type {InputHTMLAttributes} from 'preact';
import styles from './Controls.module.scss';
import {NumberInput} from './NumberInput';
import type {SelectProps} from './Select';
import {Select} from './Select';

export type NumberInputSelectProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'min' | 'max' | 'step'
> &
  SelectProps<number> & {
    value: number;
    min?: number;
    max?: number;
    step?: number;
  };

export function NumberInputSelect({
  options,
  value,
  onChange,
  ...props
}: NumberInputSelectProps) {
  return (
    <div className={styles.inputSelect}>
      <NumberInput value={value} onChange={onChange} {...props} />
      <Select value={value} options={options} onChange={onChange} />
    </div>
  );
}
