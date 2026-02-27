import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes before considering it stale.
      // Without this, every component mount triggers a refetch.
      staleTime: 5 * 60 * 1000,
      // Do not retry failed queries by default — auth errors should
      // redirect immediately, not hammer the server with retries.
      retry: false,
      // Do not refetch when the window regains focus (avoids bursts on tab switch).
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Returns true if the given React Query key belongs to the auth.me procedure.
 *
 * tRPC builds query keys as nested arrays: the first element is the split path,
 * e.g. trpc.auth.me -> queryKey = [["auth", "me"], { ... }]
 * We must check the inner array, NOT look for a "auth.me" string.
 */
function isAuthMeQueryKey(queryKey: readonly unknown[]): boolean {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return false;
  const pathSegments = queryKey[0];
  if (!Array.isArray(pathSegments)) return false;
  return pathSegments[0] === "auth" && pathSegments[1] === "me";
}

const redirectToLoginIfUnauthorized = (error: unknown, queryKey?: readonly unknown[]) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  // auth.me is the session-check query — App.tsx already handles the
  // unauthenticated state by rendering the login form. Never redirect for it,
  // as getLoginUrl() returns "/" in local dev (no OAuth), which would cause
  // an infinite page-reload loop.
  if (queryKey && isAuthMeQueryKey(queryKey)) return;

  const loginUrl = getLoginUrl();

  // Do not redirect if we are already on the login destination.
  const currentPath = window.location.pathname;
  const loginPath = loginUrl.startsWith("http") ? new URL(loginUrl).pathname : loginUrl;
  if (currentPath === loginPath || currentPath === "/") return;

  window.location.href = loginUrl;
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error, event.query.queryKey);
    // Only log non-auth errors to avoid noise
    if (!(error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG)) {
      console.error("[API Query Error]", error);
    }
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    if (!(error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG)) {
      console.error("[API Mutation Error]", error);
    }
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
