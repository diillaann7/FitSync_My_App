import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useFoods(search?: string) {
  return useQuery<any[]>({
    queryKey: ["/api/foods", search || ""],
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const url = search ? `/api/foods?search=${encodeURIComponent(search)}` : "/api/foods";
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) throw new Error("Failed to fetch foods");
      return res.json();
    },
    staleTime: 60000,
  });
}

export function useCreateFood() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (food: any) => {
      const res = await apiRequest("POST", "/api/foods", food);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/foods"] }),
  });
}

export function useMealLogs() {
  return useQuery<any[]>({ queryKey: ["/api/meal-logs"], initialData: [] });
}

export function useCreateMealLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: { foodId: number; quantity: string; mealType?: string }) => {
      const res = await apiRequest("POST", "/api/meal-logs", log);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meal-logs"] }),
  });
}

export function useUpdateMealLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; quantity?: string; mealType?: string }) => {
      const res = await apiRequest("PATCH", `/api/meal-logs/${id}`, data);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meal-logs"] }),
  });
}

export function useDeleteMealLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/meal-logs/${id}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/meal-logs"] }),
  });
}
