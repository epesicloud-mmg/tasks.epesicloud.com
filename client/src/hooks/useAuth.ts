import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retryOnMount: false,
  });

  // User is authenticated if we have user data
  const isAuthenticated = !!user;

  return {
    user,
    isLoading,
    isAuthenticated,
  };
}
