import type {SubscribableValueEvent} from '@revideo/core';
import {useEffect, useState} from 'react';

export function useSubscribableValue<TValue>(
  value: SubscribableValueEvent<TValue> | undefined,
) {
  const [state, setState] = useState(value?.current);
  useEffect(() => {
    if (value) {
      return value.subscribe(setState);
    }
  }, [value]);
  return state;
}
