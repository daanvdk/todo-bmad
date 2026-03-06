import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function makeOptimisticHandlers<TItem, TVars>(
  queryClient: QueryClient,
  getQueryKey: (vars: TVars) => QueryKey,
  updater: (items: TItem[], vars: TVars) => TItem[],
  handleError: () => void,
) {
  return {
    onMutate: async (vars: TVars) => {
      const key = getQueryKey(vars);
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<{ data: TItem[] }>(key);
      queryClient.setQueryData<{ data: TItem[] }>(key, (old) =>
        old ? { ...old, data: updater(old.data, vars) } : old,
      );
      return { snapshot };
    },
    onError: (
      _err: unknown,
      vars: TVars,
      context: { snapshot: { data: TItem[] } | undefined } | undefined,
    ) => {
      if (context?.snapshot) {
        queryClient.setQueryData(getQueryKey(vars), context.snapshot);
      }
      handleError();
    },
    onSettled: (_data: unknown, _err: unknown, vars: TVars) => {
      queryClient.invalidateQueries({ queryKey: getQueryKey(vars) });
    },
  };
}
