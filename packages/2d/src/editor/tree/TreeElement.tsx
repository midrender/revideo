import type {Signal} from '@preact/signals';
import {Collapse, Toggle} from '@revideo/ui';
import {clsx} from 'clsx';
import type {ComponentChildren, HTMLAttributes, Ref} from 'preact';
import styles from './index.module.scss';

const DEPTH_VAR = '--depth';

interface TreeElementProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'label' | 'icon'> {
  icon?: ComponentChildren;
  label: ComponentChildren;
  children?: ComponentChildren;
  selected?: boolean;
  open: Signal<boolean>;
  depth?: number;
  forwardRef?: Ref<HTMLDivElement>;
}

export function TreeElement({
  label,
  children,
  selected,
  depth = 0,
  open,
  icon,
  forwardRef,
  ...props
}: TreeElementProps) {
  const hasChildren = !!children;

  return (
    <>
      <div
        ref={forwardRef}
        className={clsx(
          styles.label,
          selected && styles.active,
          hasChildren && styles.parent,
        )}
        onDblClick={() => {
          if (hasChildren) {
            open.value = !open.value;
          }
        }}
        {...props}
        style={{[DEPTH_VAR]: `${depth}`}}
      >
        {hasChildren && (
          <Toggle
            animated={false}
            open={open.value}
            onToggle={value => {
              open.value = value;
            }}
            onDblClick={e => {
              e.stopPropagation();
            }}
          />
        )}
        {icon}
        {label}
      </div>
      {hasChildren && (
        <Collapse open={open.value} animated={false}>
          {children}
        </Collapse>
      )}
    </>
  );
}
