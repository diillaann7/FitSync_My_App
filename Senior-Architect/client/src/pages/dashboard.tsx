import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUser } from "@/hooks/use-auth";
import { useWorkouts } from "@/hooks/use-workouts";
import { useMealLogs } from "@/hooks/use-nutrition";
import { useBodyMetrics, useGoals } from "@/hooks/use-metrics";
import { useDailyChallenges, useCompleteChallenge } from "@/hooks/use-gamification";
import { Activity, Flame, Dumbbell, Scale, ChevronRight, Trophy, Zap, TrendingUp, Target, Apple, CheckCircle2, Lock } from "lucide-react";
import { Link } from "wouter";
import { format, isToday, subDays, startOfWeek, isSameDay } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

// ============================================
// Calorie Ring Component
// ============================================
function CalorieRing({ consumed, goal }: { consumed: number; goal: number }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(consumed / Math.max(goal, 1), 1);
  const offset = circumference - pct * circumference;
  const color = pct >= 1 ? "hsl(var(--destructive))" : pct >= 0.8 ? "hsl(var(--chart-3))" : "hsl(var(--primary))";

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg width="144" height="144" viewBox="0 0 144 144" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="72" cy="72" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={radius} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-bold tabular-nums leading-none">{Math.round(consumed)}</div>
        <div className="text-xs text-muted-foreground mt-0.5">/ {goal}</div>
        <div className="text-xs font-medium text-muted-foreground">kcal</div>
      </div>
    </div>
  );
}

// ============================================
// Streak Badge
// ============================================
function StreakBadge({ workouts }: { workouts: any[] }) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const day = subDays(today, i);
    const hasWorkout = workouts.some(w => isSameDay(new Date(w.date), day));
    if (hasWorkout) streak++;
    else if (i > 0) break;
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-orange-500 text-2xl">&#128293;</span>
      <div>
        <div className="font-bold text-lg leading-none">{streak} day{streak !== 1 ? "s" : ""}</div>
        <div className="text-xs text-muted-foreground">Active streak</div>
      </div>
    </div>
  );
}

// ============================================
// Daily Challenges Widget
// ============================================
const CHALLENGE_TYPE_ICONS: Record<string, string> = {
  workout: "💪", nutrition: "🥗", hydration: "💧", streak: "🔥", steps: "👟",
};

function DailyChallengesWidget() {
  const { data: challenges = [] } = useDailyChallenges();
  const completeChallenge = useCompleteChallenge();

  const completedCount = challenges.filter((c: any) => c.completed).length;
  const totalXp = challenges.reduce((s: number, c: any) => s + (c.completed ? c.xpReward : 0), 0);

  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500/10 rounded-xl flex items-center justify-center text-yellow-600">
            <Zap className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-base">Daily Challenges</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{completedCount}/{challenges.length}</Badge>
          {totalXp > 0 && <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs">+{totalXp} XP</Badge>}
        </div>
      </div>

      {challenges.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">Loading challenges...</div>
      ) : (
        <div className="space-y-2">
          {challenges.map((c: any) => (
            <div
              key={c.id}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${c.completed ? "bg-primary/5 border-primary/20 opacity-70" : "bg-muted/20 border-border/40 hover:border-primary/20"}`}
              data-testid={`challenge-${c.id}`}
            >
              <div className="text-xl shrink-0">{CHALLENGE_TYPE_ICONS[c.type] || "⚡"}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.description}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-yellow-600">+{c.xpReward} XP</span>
                {c.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-7 h-7 border-primary/30 text-primary hover:bg-primary/10"
                    onClick={() => completeChallenge.mutate(c.id)}
                    disabled={completeChallenge.isPending}
                    data-testid={`complete-challenge-${c.id}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ============================================
// AI Insights Panel
// ============================================
function AIInsights({ user, todayCalories, todayProtein, goal, workoutsThisWeek }: any) {
  const insights = useMemo(() => {
    const tips: { icon: string; text: string }[] = [];
    if (goal && todayCalories < goal.calorieTarget * 0.5) {
      tips.push({ icon: "🌿", text: `You've eaten ${Math.round(goal.calorieTarget - todayCalories)} kcal less than your target today. Consider logging another meal.` });
    }
    if (goal && todayCalories > goal.calorieTarget * 1.1) {
      tips.push({ icon: "⚠️", text: `You're ${Math.round(todayCalories - goal.calorieTarget)} kcal over your daily goal. Consider lighter meals for the rest of the day.` });
    }
    if (goal && todayProtein < goal.proteinTarget * 0.6) {
      tips.push({ icon: "💧", text: `Your protein intake is low today (${Math.round(todayProtein)}g). Try adding chicken, eggs, or Greek yogurt.` });
    }
    if (workoutsThisWeek >= 4) {
      tips.push({ icon: "🏆", text: `Great week! You've hit ${workoutsThisWeek} workouts already. Rest and recovery are just as important.` });
    }
    if (workoutsThisWeek === 0) {
      tips.push({ icon: "💙", text: "No workouts this week yet. Even a 20-minute walk counts — let's get moving!" });
    }
    if (user?.fitnessGoal === "lose_weight" && goal && todayCalories <= goal.calorieTarget) {
      tips.push({ icon: "⭐", text: "You're on track with your weight loss goal today. Keep it up!" });
    }
    if (user?.fitnessGoal === "gain_muscle" && goal && todayProtein >= goal.proteinTarget * 0.8) {
      tips.push({ icon: "💪", text: "Solid protein intake for muscle growth! Make sure to also get enough sleep for optimal recovery." });
    }
    if (tips.length === 0) {
      tips.push({ icon: "🌞", text: "Log your meals and workouts to get personalized AI insights and recommendations." });
    }
    return tips.slice(0, 3);
  }, [user, todayCalories, todayProtein, goal, workoutsThisWeek]);

  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-xl bg-chart-4/10 text-chart-4">
          <Zap className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-bold">AI Coach Insights</h3>
        <Badge variant="secondary" className="ml-auto text-xs">Personalized</Badge>
      </div>
      <div className="space-y-3">
        {insights.map((tip, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
            <span className="text-lg mt-0.5">{tip.icon}</span>
            <p className="text-sm text-muted-foreground leading-relaxed">{tip.text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================
// Achievement Badges
// ============================================
function AchievementPanel({ workouts, mealLogs, metrics }: { workouts: any[], mealLogs: any[], metrics: any[] }) {
  const achievements = [
    { id: "first_workout", label: "First Workout", icon: Dumbbell, earned: workouts.length >= 1 },
    { id: "week_warrior", label: "Week Warrior", icon: Trophy, earned: workouts.length >= 7 },
    { id: "nutrition_log", label: "Nutrition Tracker", icon: Apple, earned: mealLogs.length >= 5 },
    { id: "metrics_30", label: "Consistency", icon: TrendingUp, earned: metrics.length >= 10 },
  ];
  return (
    <Card className="p-6 border-border/50">
      <div className="flex items-center gap-2 mb-5">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-bold">Achievements</h3>
        <Badge variant="secondary" className="ml-auto">{achievements.filter(a => a.earned).length}/{achievements.length}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {achievements.map(a => (
          <div key={a.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${a.earned ? "bg-primary/10 border border-primary/20" : "bg-muted/20 opacity-50"}`}>
            <div className={`p-2 rounded-lg ${a.earned ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
              <a.icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">{a.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================
// DASHBOARD PAGE
// ============================================
export default function Dashboard() {
  const { data: user } = useUser();
  const { data: workouts = [] } = useWorkouts();
  const { data: mealLogs = [] } = useMealLogs();
  const { data: metrics = [] } = useBodyMetrics();
  const { data: goal } = useGoals();

  const todayWorkouts = workouts.filter((w: any) => isToday(new Date(w.date)));
  const todayMeals = mealLogs.filter((m: any) => isToday(new Date(m.log.date)));

  const todayCalories = todayMeals.reduce((sum: number, m: any) => sum + m.food.calories * Number(m.log.quantity), 0);
  const todayProtein = todayMeals.reduce((sum: number, m: any) => sum + Number(m.food.protein) * Number(m.log.quantity), 0);
  const todayCarbs = todayMeals.reduce((sum: number, m: any) => sum + Number(m.food.carbs) * Number(m.log.quantity), 0);
  const todayFat = todayMeals.reduce((sum: number, m: any) => sum + Number(m.food.fat) * Number(m.log.quantity), 0);
  const todayBurned = todayWorkouts.filter((w: any) => w.completed).length * 350;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const workoutsThisWeek = workouts.filter((w: any) => new Date(w.date) >= weekStart).length;

  const weeklyCalChart = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayLogs = mealLogs.filter((m: any) => isSameDay(new Date(m.log.date), day));
    const cal = dayLogs.reduce((s: number, m: any) => s + m.food.calories * Number(m.log.quantity), 0);
    return { day: format(day, "EEE"), calories: Math.round(cal), goal: goal?.calorieTarget || 2000 };
  });

  const sortedMetrics = [...metrics].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weightChartData = sortedMetrics.slice(-14).map((m: any) => ({ date: format(new Date(m.date), "MMM dd"), weight: Number(m.weight) }));
  const currentWeight = sortedMetrics.length > 0 ? Number(sortedMetrics[sortedMetrics.length - 1].weight) : null;

  const calorieGoal = goal?.calorieTarget || 2000;
  const proteinGoal = goal?.proteinTarget || 150;
  const carbGoal = goal?.carbTarget || 200;
  const fatGoal = goal?.fatTarget || 65;
  const macroGoals = [
    { label: "Protein", value: todayProtein, target: proteinGoal, color: "hsl(var(--chart-1))" },
    { label: "Carbs", value: todayCarbs, target: carbGoal, color: "hsl(var(--chart-4))" },
    { label: "Fat", value: todayFat, target: fatGoal, color: "hsl(var(--chart-3))" },
  ];

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="text-muted-foreground text-sm font-medium">{format(new Date(), "EEEE, MMMM do")}</p>
          <h1 className="text-2xl md:text-3xl font-black mt-1">{greeting()}, <span className="text-primary">{user?.name?.split(" ")[0]}</span></h1>
        </div>
        <StreakBadge workouts={workouts} />
      </header>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Calories In", value: `${Math.round(todayCalories)}`, unit: "kcal", icon: Flame, color: "text-chart-5 bg-chart-5/10" },
          { label: "Calories Out", value: `${todayBurned}`, unit: "kcal", icon: Activity, color: "text-chart-4 bg-chart-4/10" },
          { label: "Workouts Today", value: `${todayWorkouts.length}`, unit: "sessions", icon: Dumbbell, color: "text-primary bg-primary/10" },
          { label: "Current Weight", value: currentWeight ? `${currentWeight}` : "--", unit: currentWeight ? "kg" : "", icon: Scale, color: "text-chart-2 bg-chart-2/10" },
        ].map((stat) => (
          <Card key={stat.label} className="p-5 border-border/50 bg-card hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold tabular-nums leading-none">{stat.value} <span className="text-sm font-normal text-muted-foreground">{stat.unit}</span></div>
            <div className="text-xs text-muted-foreground mt-1.5 font-medium">{stat.label}</div>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Calorie + Macros */}
        <Card className="p-6 border-border/50 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Daily Nutrition</h3>
            {!goal && (
              <Link href="/goals">
                <Button size="sm" variant="outline" className="text-xs">Set Goal</Button>
              </Link>
            )}
          </div>
          <div className="flex items-center justify-center">
            <CalorieRing consumed={todayCalories} goal={calorieGoal} />
          </div>
          <div className="space-y-3">
            {macroGoals.map((m) => (
              <div key={m.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground tabular-nums">{Math.round(m.value)}g / {m.target}g</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min((m.value / m.target) * 100, 100)}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
          <Link href="/nutrition">
            <Button variant="outline" className="w-full">
              <Apple className="w-4 h-4 mr-2" /> Log Meal
            </Button>
          </Link>
        </Card>

        {/* Center: Weight Chart */}
        <Card className="p-6 border-border/50 lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Weight Progress</h3>
            <Link href="/metrics" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex-1 min-h-[220px]">
            {weightChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} />
                  <Area type="monotone" dataKey="weight" name="Weight (kg)" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#wGrad)" dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                <Scale className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No weight data yet</p>
                <Link href="/metrics" className="text-primary text-sm mt-2 hover:underline font-medium">Log your weight</Link>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Daily Challenges + Weekly Chart + AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DailyChallengesWidget />

        <Card className="p-6 border-border/50 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-lg">Weekly Calories</h3>
            <Badge variant="secondary">{workoutsThisWeek} workouts this week</Badge>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyCalChart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} />
                <Bar dataKey="calories" name="Calories" radius={[6, 6, 0, 0]}>
                  {weeklyCalChart.map((entry, i) => (
                    <Cell key={i} fill={entry.calories >= entry.goal ? "hsl(var(--chart-3))" : entry.calories > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Achievements + AI Insights + Recent Workouts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AchievementPanel workouts={workouts} mealLogs={mealLogs} metrics={metrics} />
        <AIInsights user={user} todayCalories={todayCalories} todayProtein={todayProtein} goal={goal} workoutsThisWeek={workoutsThisWeek} />

        {/* Recent Workouts */}
        <Card className="p-6 border-border/50 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-base">Recent Workouts</h3>
            <Link href="/workouts" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {workouts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
              <Dumbbell className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No workouts yet.</p>
              <Link href="/workouts">
                <Button size="sm" variant="outline" className="mt-3">Start a workout</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {workouts.slice(0, 4).map((w: any) => (
                <Link key={w.id} href={`/workouts/${w.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer group">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${w.completed ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <Dumbbell className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{w.name}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(w.date), "EEE, MMM do")}</div>
                    </div>
                    {w.completed && <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">Done</Badge>}
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
