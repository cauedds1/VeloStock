import { useQuery } from "@tanstack/react-query";

export interface AuthUser {
  id: string;
  empresaId?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  role?: string | null;
  isActive?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
