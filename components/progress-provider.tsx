"use client";

import { useConvex, useConvexAuth, usePaginatedQuery, useQuery } from "convex/react";
import { useEffect, useMemo, type ReactNode } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { guestStore, lockedPlayerStore, PlayerContext } from "@/lib/player";
import { createPlayerStore } from "@/lib/player-store";

function AccountSnapshot({ accountId, store }: { accountId: Id<"users">; store: ReturnType<typeof createPlayerStore> }) {
  const { results, loadMore, status } = usePaginatedQuery(api.practice.snapshotAccount, { accountId }, { initialNumItems: 100 });

  useEffect(() => {
    store.receive(results.map(({ event }) => event));
    if (status === "CanLoadMore") loadMore(100);
  }, [store, results, status, loadMore]);

  return null;
}

export function ProgressProvider({ children }: { children: ReactNode }) {
  const client = useConvex();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer, isAuthenticated ? {} : "skip");
  const accountId = isAuthenticated ? viewer?.userId : undefined;
  const accountStore = useMemo(() => accountId ? createPlayerStore(accountId, {
    push: (_, events) => client.mutation(api.practice.syncAccount, { accountId, events }),
  }) : undefined, [accountId, client]);

  const store = accountStore ?? (isLoading || isAuthenticated ? lockedPlayerStore : guestStore);

  return <PlayerContext.Provider value={store}>
    {children}
    {accountId && accountStore && <AccountSnapshot key={accountId} accountId={accountId} store={accountStore} />}
  </PlayerContext.Provider>;
}
