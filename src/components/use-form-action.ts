"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Like useActionState, but submits through onSubmit so React does NOT reset the
 * form after the action returns. Users keep what they typed when validation fails.
 */
export function useFormAction<S>(action: (state: Awaited<S>, formData: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState<S, FormData>(action, initial);
  const [transitioning, startTransition] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return [state, onSubmit, pending || transitioning] as const;
}
