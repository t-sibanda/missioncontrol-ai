import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
    mutations: { retry: false },
  },
});

// Use VITE_API_URL if set (Cloudflare Pages pointing to Render), otherwise relative path (served from Render directly)
const API_BASE = import.meta.env.VITE_API_URL || "";

const trpcClient = trpc.createClient({
  links: [
    loggerLink({ enabled: () => import.meta.env.DEV }),
    httpBatchLink({
      url: `${API_BASE}/api/trpc`,
      transformer: superjson,
      headers() {
        return { "x-trpc-source": "react" };
      },
      fetch(url, options) {
        return fetch(url, { ...options, credentials: "include" });
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}