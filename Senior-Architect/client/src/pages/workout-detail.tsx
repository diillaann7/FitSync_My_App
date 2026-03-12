import { useState, useEffect, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useCompleteWorkout } from "@/hooks/use-gamification";
import {
  ArrowLeft, Plus, Play, Pause, CheckCircle2, SkipForward,
  Timer, Dumbbell, Trophy, Flame, RotateCcw, Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useLocation as useWouterLocation } from "wouter";

const EXERCISE_LIBRARY = [
  "Bench Press", "Incline Bench Press", "Dumbbell Flyes", "Cable Crossover",
  "Squat", "Romanian Deadlift", "Leg Press", "Walking Lunges", "Leg Extension",
  "Deadlift", "Barbell Row", "Pull-Ups", "Lat Pulldown", "Cable Row",
  "Overhead Press", "Lateral Raises", "Face Pulls", "Rear Delt Flyes",
  "Barbell Curl", "Hammer Curl", "Preacher Curl", "Tricep Pushdown", "Skull Crushers",
  "Plank", "Crunches", "Leg Raises", "Russian Twists", "Mountain Climbers",
  "Push-Ups", "Dips", "Chin-Ups", "Burpees", "Jump Rope",
];

function RestTimer({ onDone }: { onDone: () => void }) {
  const [seconds, setSeconds] = useState(90);
  const [paused, setPaused] = useState(false);
  const iRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!paused && seconds > 0) {
      iRef.current = setInterval(() => setSeconds(s => s - 1), 1000);
    }
    return () => clearInterval(iRef.current);
  }, [paused, seconds]);

  useEffect(() => { if (seconds === 0) onDone(); }, [seconds]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 mt-3">
      <CardContent className="pt-3 pb-3">
        <div className="text-center mb-2">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary mb-0.5 flex items-center justify-center gap-1">
            <Timer className="w-3 h-3" />Rest Timer
          </div>
          <div className="text-4xl font-black text-primary tabular-nums">{mm}:{ss}</div>
        </div>
        <Progress value={(seconds / 90) * 100} className="h-1.5 mb-3" />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setPaused(p => !p)}>
            {paused ? <><Play className="w-3 h-3 mr-1" />Resume</> : <><Pause className="w-3 h-3 mr-1" />Pause</>}
          </Button>
          <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setSeconds(s => s + 30)}>
            <RotateCcw className="w-3 h-3 mr-1" />+30s
          </Button>
          <Button size="sm" className="flex-1 h-8 text-xs bg-primary" onClick={onDone}>
            <SkipForward className="w-3 h-3 mr-1" />Skip
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface SetRow { idx: number; weight: string; reps: string; completed: boolean; }

function ExerciseCard({ exercise, sessionActive, onSetComplete }: { exercise: any; sessionActive: boolean; onSetComplete: (exId: number, done: number, weight: number) => void }) {
  const [sets, setSets] = useState<SetRow[]>(() =>
    Array.from({ length: exercise.sets }, (_, i) => ({
      idx: i, weight: String(exercise.weight || "0"), reps: String(exercise.reps || "10"), completed: false,
    }))
  );
  const [showRest, setShowRest] = useState(false);
  const qc = useQueryClient();

  const updateMut = useMutation({
    mutationFn: async (completedCount: number) => {
      const res = await apiRequest("PATCH", `/api/exercises/${exercise.id}`, { completedSets: completedCount });
      return res.json();
    },
  });

  const done = sets.filter(s => s.completed).length;

  function completeSet(idx: number) {
    if (!sessionActive) return;
    const updated = sets.map(s => s.idx === idx ? { ...s, completed: true } : s);
    setSets(updated);
    const completedCount = updated.filter(s => s.completed).length;
    updateMut.mutate(completedCount);
    const w = Number(updated[idx].weight) || Number(exercise.weight) || 0;
    onSetComplete(exercise.id, completedCount, w);
    if (completedCount < exercise.sets) setShowRest(true);
  }

  return (
    <Card className={`overflow-hidden transition-all ${done === exercise.sets ? "border-primary/40" : ""}`}>
      <CardHeader className="pb-1.5 pt-3.5 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-semibold">{exercise.name}</CardTitle>
          </div>
          <Badge variant={done === exercise.sets ? "default" : "secondary"}
            className={`text-xs ${done === exercise.sets ? "bg-primary text-primary-foreground" : ""}`}>
            {done}/{exercise.sets}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="space-y-1.5 mb-0">
          <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium px-1 mb-1">
            <span>Set</span><span className="text-center">kg</span><span className="text-center">Reps</span><span className="text-right">Done</span>
          </div>
          {sets.map(s => (
            <div key={s.idx} className={`grid grid-cols-4 items-center gap-2 px-1 py-1 rounded-lg transition-colors ${s.completed ? "bg-primary/5 opacity-70" : ""}`}>
              <span className="text-sm font-bold text-muted-foreground">#{s.idx + 1}</span>
              <Input className="h-7 text-center text-sm p-1" value={s.weight}
                onChange={e => !s.completed && setSets(prev => prev.map(r => r.idx === s.idx ? { ...r, weight: e.target.value } : r))}
                disabled={s.completed} data-testid={`weight-${exercise.id}-${s.idx}`} />
              <Input className="h-7 text-center text-sm p-1" value={s.reps}
                onChange={e => !s.completed && setSets(prev => prev.map(r => r.idx === s.idx ? { ...r, reps: e.target.value } : r))}
                disabled={s.completed} data-testid={`reps-${exercise.id}-${s.idx}`} />
              <div className="flex justify-end">
                {s.completed
                  ? <CheckCircle2 className="w-5 h-5 text-primary" />
                  : <Button size="icon" variant="outline" disabled={!sessionActive}
                      className="w-7 h-7 border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-40"
                      onClick={() => completeSet(s.idx)} data-testid={`complete-${exercise.id}-${s.idx}`}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                }
              </div>
            </div>
          ))}
        </div>
        {showRest && done < exercise.sets && <RestTimer onDone={() => setShowRest(false)} />}
      </CardContent>
    </Card>
  );
}

export default function WorkoutDetail() {
  const [, params] = useRoute("/workouts/:id");
  const [, navigate] = useWouterLocation();

  const [addOpen, setAddOpen] = useState(false);
  const [newEx, setNewEx] = useState({ name: "", sets: "3", reps: "10", weight: "0" });
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionStart, setSessionStart] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [completedSetsMap, setCompletedSetsMap] = useState<Record<number, { done: number; weight: number }>>({});
  const [finishOpen, setFinishOpen] = useState(false);
  const [xpResult, setXpResult] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const qc = useQueryClient();
  const completeWorkout = useCompleteWorkout();

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/workouts", params?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/workouts/${params?.id}`, undefined);
      return res.json();
    },
    enabled: !!params?.id,
  });

  const addExMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/exercises", {
        workoutId: Number(params?.id), name: newEx.name,
        sets: Number(newEx.sets), reps: Number(newEx.reps), weight: newEx.weight,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/workouts", params?.id] });
      setAddOpen(false);
      setNewEx({ name: "", sets: "3", reps: "10", weight: "0" });
    },
  });

  useEffect(() => {
    if (sessionActive && sessionStart) {
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - sessionStart.getTime()) / 1000)), 1000);
    } else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [sessionActive, sessionStart]);

  function startSession() { setSessionActive(true); setSessionStart(new Date()); }

  function handleSetComplete(exId: number, done: number, weight: number) {
    setCompletedSetsMap(prev => ({ ...prev, [exId]: { done, weight } }));
  }

  async function finishWorkout() {
    if (!data) return;
    const durationMinutes = Math.max(1, Math.round(elapsed / 60));
    const exercises: any[] = data.exercises || [];
    const totalVolume = exercises.reduce((sum: number, ex: any) => {
      const info = completedSetsMap[ex.id];
      const w = info?.weight || Number(ex.weight) || 0;
      const done = info?.done || 0;
      return sum + w * Number(ex.reps) * done;
    }, 0);
    const result = await completeWorkout.mutateAsync({ id: data.workout.id, durationMinutes, totalVolume });
    setXpResult(result);
    setSessionActive(false);
    setFinishOpen(true);
    clearInterval(timerRef.current);
  }

  const exercises: any[] = data?.exercises || [];
  const totalSets = exercises.reduce((s: number, e: any) => s + e.sets, 0);
  const totalDone = Object.values(completedSetsMap).reduce((s, v) => s + v.done, 0);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  if (isLoading) return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-28 rounded-2xl" />
      {[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
    </div>
  );

  if (!data) return (
    <div className="p-6 text-center">
      <p className="text-muted-foreground">Workout not found.</p>
      <Button variant="link" onClick={() => navigate("/workouts")}>Back to workouts</Button>
    </div>
  );

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/workouts")} className="rounded-xl" data-testid="back-button">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-xl truncate">{data.workout.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{data.workout.category}</p>
        </div>
        {data.workout.completed && (
          <Badge className="bg-primary text-primary-foreground gap-1 shrink-0">
            <CheckCircle2 className="w-3 h-3" />Done
          </Badge>
        )}
      </div>

      {/* Session HUD */}
      {!data.workout.completed && (
        <Card className={sessionActive ? "border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent" : "bg-muted/20"}>
          <CardContent className="pt-4 pb-4">
            {sessionActive ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-semibold">
                    <Flame className="w-5 h-5 animate-pulse" />Session Active
                  </div>
                  <div className="font-black text-3xl tabular-nums text-primary">{mm}:{ss}</div>
                </div>
                <Progress value={totalSets > 0 ? (totalDone / totalSets) * 100 : 0} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{totalDone}/{totalSets} sets done</span>
                  <span>{totalSets > 0 ? Math.round((totalDone / totalSets) * 100) : 0}%</span>
                </div>
                <Button className="w-full bg-gradient-to-r from-primary to-emerald-500 font-bold" onClick={finishWorkout}
                  disabled={completeWorkout.isPending} data-testid="finish-workout">
                  <Square className="w-4 h-4 mr-2" />
                  {completeWorkout.isPending ? "Finishing..." : "Finish Workout"}
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">Ready? Start tracking your sets!</p>
                <Button className="w-full bg-gradient-to-r from-primary to-emerald-500 font-bold" onClick={startSession}
                  data-testid="start-session">
                  <Play className="w-4 h-4 mr-2" />Start Session
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed stats */}
      {data.workout.completed && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-primary">{data.workout.durationMinutes}m</div>
                <div className="text-xs text-muted-foreground">Duration</div>
              </div>
              <div>
                <div className="text-2xl font-black text-primary">{Math.round(Number(data.workout.totalVolume || 0))}</div>
                <div className="text-xs text-muted-foreground">Volume kg</div>
              </div>
              <div>
                <div className="text-2xl font-black text-yellow-600">+{data.workout.xpEarned}</div>
                <div className="text-xs text-muted-foreground">XP</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exercises */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Exercises ({exercises.length})</h2>
          {!data.workout.completed && (
            <Button size="sm" variant="outline" className="gap-1 rounded-xl" onClick={() => setAddOpen(true)} data-testid="add-exercise">
              <Plus className="w-4 h-4" />Add
            </Button>
          )}
        </div>

        {exercises.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No exercises yet</p>
              <p className="text-sm mt-1">Add exercises then start your session</p>
            </CardContent>
          </Card>
        ) : (
          exercises.map((ex: any) => (
            <ExerciseCard key={ex.id} exercise={ex} sessionActive={sessionActive} onSetComplete={handleSetComplete} />
          ))
        )}
      </div>

      {/* Add Exercise Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Exercise</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Exercise</Label>
              <Select value={newEx.name} onValueChange={v => setNewEx(p => ({ ...p, name: v }))}>
                <SelectTrigger data-testid="exercise-select"><SelectValue placeholder="Select exercise..." /></SelectTrigger>
                <SelectContent className="max-h-64">
                  {EXERCISE_LIBRARY.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Sets</Label>
                <Input type="number" min={1} value={newEx.sets} onChange={e => setNewEx(p => ({ ...p, sets: e.target.value }))} data-testid="sets-input" />
              </div>
              <div className="space-y-1.5">
                <Label>Reps</Label>
                <Input type="number" min={1} value={newEx.reps} onChange={e => setNewEx(p => ({ ...p, reps: e.target.value }))} data-testid="reps-input" />
              </div>
              <div className="space-y-1.5">
                <Label>kg</Label>
                <Input type="number" min={0} value={newEx.weight} onChange={e => setNewEx(p => ({ ...p, weight: e.target.value }))} data-testid="weight-input" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-primary" onClick={() => addExMut.mutate()}
              disabled={!newEx.name || addExMut.isPending} data-testid="confirm-add-exercise">
              {addExMut.isPending ? "Adding..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Finish / XP Dialog */}
      <Dialog open={finishOpen} onOpenChange={() => { setFinishOpen(false); navigate("/workouts"); }}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-4 space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black">Workout Complete!</h2>
              <p className="text-muted-foreground text-sm mt-1">Great work — keep pushing!</p>
            </div>
            {xpResult && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/10 rounded-xl p-3">
                  <div className="text-2xl font-black text-primary">+{xpResult.xpEarned}</div>
                  <div className="text-xs text-muted-foreground">XP Earned</div>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-3">
                  <div className="text-2xl font-black text-yellow-600">{xpResult.prsBroken || 0}</div>
                  <div className="text-xs text-muted-foreground">PRs Broken</div>
                </div>
              </div>
            )}
            {xpResult?.user && (
              <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Level {xpResult.user.level}</span>
                  <span className="font-semibold text-primary">{(xpResult.user.xp || 0) % 500}/500 XP</span>
                </div>
                <Progress value={((xpResult.user.xp || 0) % 500) / 5} className="h-1.5" />
              </div>
            )}
            <Button className="w-full bg-primary"
              onClick={() => { setFinishOpen(false); navigate("/workouts"); }} data-testid="done-button">
              Back to Workouts
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
