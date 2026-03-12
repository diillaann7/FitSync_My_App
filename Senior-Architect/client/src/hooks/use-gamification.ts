import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Personal Records
export function usePersonalRecords() {
  return useQuery<any[]>({ queryKey: ["/api/personal-records"], initialData: [] });
}

// Water Logs
export function useWaterLogs() {
  return useQuery<any[]>({ queryKey: ["/api/water-logs"], initialData: [] });
}

export function useLogWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (amount: number) => {
      const res = await apiRequest("POST", "/api/water-logs", { amount });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/water-logs"] }),
  });
}

// Daily Challenges
export function useDailyChallenges() {
  return useQuery<any[]>({ queryKey: ["/api/daily-challenges"], initialData: [] });
}

export function useCompleteChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/daily-challenges/${id}/complete`, {});
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/daily-challenges"] });
      if (data?.user) {
        qc.setQueryData(["/api/auth/me"], data.user);
      }
    },
  });
}

// Leaderboard
export function useLeaderboard() {
  return useQuery<any[]>({ queryKey: ["/api/leaderboard"], initialData: [] });
}

// Weekly Plan
export function useWeeklyPlan() {
  return useQuery<any>({ queryKey: ["/api/weekly-plan"] });
}

// Complete Workout
export function useCompleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, durationMinutes, totalVolume }: { id: number; durationMinutes: number; totalVolume: number }) => {
      const res = await apiRequest("POST", `/api/workouts/${id}/complete`, { durationMinutes, totalVolume });
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/workouts"] });
      qc.invalidateQueries({ queryKey: ["/api/personal-records"] });
      if (data?.user) {
        qc.setQueryData(["/api/auth/me"], data.user);
      }
    },
  });
}
