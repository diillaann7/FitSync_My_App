import { useWeeklyPlan } from "@/hooks/use-gamification";
import { useUser } from "@/hooks/use-auth";
import { CalendarDays, Dumbbell, Clock, Zap, CheckCircle2, Moon, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

const GOAL_LABELS: Record<string, string> = {
  lose_weight: "Fat Burning",
  gain_muscle: "Muscle Building",
  maintain_weight: "Balanced Fitness",
  improve_fitness: "Endurance",
};

const DAY_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-slate-400",
];

export default function WeeklyPlan() {
  const { data: plan, isLoading } = useWeeklyPlan();
  const { data: user } = useUser();
  const [expandedDay, setExpandedDay] = useState<string | null>("Monday");

  const goalLabel = GOAL_LABELS[user?.fitnessGoal || "maintain_weight"] || "Balanced Fitness";

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Weekly Plan
          </h1>
          <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">AI Generated</Badge>
        </div>
        <p className="text-muted-foreground text-sm">Personalized training plan based on your <span className="font-medium text-foreground">{goalLabel}</span> goal</p>
      </div>

      {/* Plan Theme */}
      {!isLoading && plan && (
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-bold">{plan.theme}</div>
                <div className="text-sm text-muted-foreground">7-day structured program</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Plan Cards */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : plan?.days ? (
        <div className="space-y-2">
          {plan.days.map((day: any, idx: number) => {
            const isExpanded = expandedDay === day.day;
            const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
            const isToday = today === day.day;
            const dotColor = DAY_COLORS[idx] || "bg-slate-400";

            return (
              <Card
                key={day.day}
                className={`cursor-pointer transition-all overflow-hidden ${isToday ? "border-primary/40 shadow-sm" : ""} ${day.rest ? "opacity-80" : ""}`}
                onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                data-testid={`day-card-${day.day}`}
              >
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 px-4 py-3.5">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{day.day}</span>
                        {isToday && <Badge className="text-[10px] px-1.5 h-4 bg-primary text-primary-foreground">Today</Badge>}
                        {day.rest && <Badge variant="outline" className="text-[10px] px-1.5 h-4">Rest</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{day.focus}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {day.duration > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {day.duration}m
                        </div>
                      ) : (
                        <Moon className="w-4 h-4 text-muted-foreground" />
                      )}
                      <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded exercises */}
                  {isExpanded && (
                    <div className="border-t border-border/40 px-4 py-3 bg-muted/20">
                      <div className="space-y-2">
                        {day.exercises.map((ex: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm">
                            <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              {day.rest ? (
                                <Moon className="w-3 h-3 text-muted-foreground" />
                              ) : (
                                <Dumbbell className="w-3 h-3 text-primary" />
                              )}
                            </div>
                            <span className="text-muted-foreground leading-snug">{ex}</span>
                          </div>
                        ))}
                      </div>
                      {!day.rest && (
                        <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{day.duration} min estimated</span>
                          <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-500" />{Math.round(day.duration * 5)} XP approx.</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Could not load weekly plan.</p>
        </div>
      )}

      <div className="text-center text-xs text-muted-foreground/60">
        Plan regenerates weekly based on your current goal and fitness level
      </div>
    </div>
  );
}
