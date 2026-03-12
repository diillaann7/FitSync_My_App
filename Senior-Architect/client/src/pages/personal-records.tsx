import { usePersonalRecords } from "@/hooks/use-gamification";
import { Medal, Trophy, TrendingUp, Dumbbell, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const CATEGORY_COLORS: Record<string, string> = {
  "Bench Press": "bg-blue-500/10 text-blue-600 border-blue-500/20",
  "Squat": "bg-purple-500/10 text-purple-600 border-purple-500/20",
  "Deadlift": "bg-red-500/10 text-red-600 border-red-500/20",
  "Overhead Press": "bg-orange-500/10 text-orange-600 border-orange-500/20",
  "default": "bg-primary/10 text-primary border-primary/20",
};

function getColor(name: string) {
  for (const key of Object.keys(CATEGORY_COLORS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return CATEGORY_COLORS[key];
  }
  return CATEGORY_COLORS.default;
}

export default function PersonalRecords() {
  const { data: prs, isLoading } = usePersonalRecords();

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Medal className="w-6 h-6 text-yellow-500" />
          Personal Records
        </h1>
        <p className="text-muted-foreground text-sm">Your all-time best lifts — automatically updated when you complete workouts</p>
      </div>

      {/* Stats */}
      {!isLoading && prs && prs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-black text-primary">{prs.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Exercises Tracked</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-black text-yellow-600">
                {Math.max(...prs.map((pr: any) => Number(pr.weight)))}
                <span className="text-sm font-semibold ml-0.5">kg</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Heaviest Lift</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-black text-purple-600">
                {Math.max(...prs.map((pr: any) => Number(pr.weight) * pr.reps * pr.sets))}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Max Volume (1 set)</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PR List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Best Performances
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (prs?.length || 0) === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">No PRs yet</p>
              <p className="text-sm mt-1">Complete a workout with weights to set your first personal record!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {prs?.sort((a: any, b: any) => Number(b.weight) - Number(a.weight)).map((pr: any) => {
                const volume = Number(pr.weight) * pr.reps * pr.sets;
                const colorClass = getColor(pr.exerciseName);

                return (
                  <div key={pr.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors" data-testid={`pr-${pr.id}`}>
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Dumbbell className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{pr.exerciseName}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 shrink-0 ${colorClass}`}>
                          PR
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(pr.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span>{pr.sets} sets × {pr.reps} reps</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xl font-black text-primary">{Number(pr.weight)}<span className="text-sm font-semibold ml-0.5">kg</span></div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <TrendingUp className="w-3 h-3" />{volume} vol
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {prs && prs.length > 0 && (
        <div className="text-center text-xs text-muted-foreground/60">
          PRs automatically update when you complete a workout with heavier weight
        </div>
      )}
    </div>
  );
}
