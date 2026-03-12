import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

export function useUser() {
  return useQuery<any>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 60000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  return useMutation({
    mutationFn: async (creds: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", creds);
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      qc.setQueryData(["/api/auth/me"], data.user);
      setLocation("/dashboard");
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  return useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return res.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      qc.setQueryData(["/api/auth/me"], data.user);
      setLocation("/dashboard");
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: any) => {
      const res = await apiRequest("PATCH", "/api/auth/me", updates);
      return res.json();
    },
    onSuccess: (user) => {
      qc.setQueryData(["/api/auth/me"], user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  return () => {
    localStorage.removeItem("auth_token");
    qc.clear();
    setLocation("/auth");
  };
}
