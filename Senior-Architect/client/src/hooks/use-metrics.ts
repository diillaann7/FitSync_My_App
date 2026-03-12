import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useBodyMetrics() {
  return useQuery<any[]>({ queryKey: ["/api/body-metrics"], initialData: [] });
}

export function useCreateBodyMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (metric: any) => {
      const res = await apiRequest("POST", "/api/body-metrics", metric);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/body-metrics"] }),
  });
}

export function useUpdateBodyMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const res = await apiRequest("PATCH", `/api/body-metrics/${id}`, data);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/body-metrics"] }),
  });
}

export function useDeleteBodyMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/body-metrics/${id}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/body-metrics"] }),
  });
}

export function useGoals() {
  return useQuery<any>({ queryKey: ["/api/goals"] });
}

export function useSaveGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goals: any) => {
      const res = await apiRequest("POST", "/api/goals", goals);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/goals"] }),
  });
}
