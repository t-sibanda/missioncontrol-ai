import { trpc } from "@/providers/trpc";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();

  // Check OAuth auth (now returns null gracefully instead of throwing)
  const {
    data: oauthUser,
    isLoading: oauthLoading,
  } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // Check local auth
  const {
    data: localUser,
    isLoading: localLoading,
  } = trpc.localAuth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const localLogoutMutation = trpc.localAuth.logout.useMutation({
    onSuccess: async () => {
      await utils.invalidate();
    },
  });

  const logout = useCallback(() => {
    localLogoutMutation.mutate();
    window.location.href = "/login";
  }, [localLogoutMutation]);

  const isLoading = oauthLoading || localLoading;

  // Prefer OAuth user, fallback to local user
  const user = oauthUser || localUser || null;

  return useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      isAdmin: user?.role === "admin",
      logout,
    }),
    [user, isLoading, logout]
  );
}
