import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useWorkouts() {
  return useQuery<any[]>({ queryKey: ["/api/workouts"], initialData: [] });
}

export function useWorkout(id: number) {
  return useQuery<any>({
    queryKey: ["/api/workouts", id],
    enabled: !!id,
    queryFn: async () => {
      const token = localStorage.getItem("auth_token");
      const res = await fetch(`/api/workouts/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Workout not found");
      return res.json();
    }
  });
}

export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; category?: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/workouts", data);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/workouts"] }),
  });
}

export function useUpdateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; name?: string; category?: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/workouts/${id}`, data);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/workouts"] }),
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/workouts/${id}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/workouts"] }),
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { workoutId: number; name: string; sets: number; reps: number; weight: string; notes?: string }) => {
      const res = await apiRequest("POST", "/api/exercises", data);
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/workouts", vars.workoutId] });
    },
  });
}

export function useUpdateExercise(workoutId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: any }) => {
      const res = await apiRequest("PATCH", `/api/exercises/${id}`, data);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/workouts", workoutId] }),
  });
}

export function useDeleteExercise(workoutId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/exercises/${id}`);
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/workouts", workoutId] }),
  });
}
