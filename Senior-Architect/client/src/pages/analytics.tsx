import { useMemo } from "react";
import { useWorkouts } from "@/hooks/use-workouts";
import { useMealLogs } from "@/hooks/use-nutrition";
import { useBodyMetrics, useGoals } from "@/hooks/use-metrics";
import { PageTransition } from "@/components/layout/page-transition";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Dumbbell, Apple, Activity, Award } from "lucide-react";
import { format, subDays, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend, LineChart, Line,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function Analytics() {
  const { data: workouts = [] } = useWorkouts();
  const { data: mealLogs = [] } = useMealLogs();
  const { data: metrics = [] } = useBodyMetrics();
  const { data: goal } = useGoals();

  // Last 30 days data
  const last30Days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const day = subDays(new Date(), 29 - i);
      const dayWorkouts = workouts.filter((w: any) => isSameDay(new Date(w.date), day));
      const dayMeals = mealLogs.filter((m: any) => isSameDay(new Date(m.log.date), day));
      const calories = dayMeals.reduce((s: number, m: any) => s + m.food.calories * Number(m.log.quantity), 0);
      const protein = dayMeals.reduce((s: number, m: any) => s + Number(m.food.protein) * Number(m.log.quantity), 0);
      return {
        date: format(day, "MMM d"),
        workouts: dayWorkouts.length,
        calories: Math.round(calories),
        protein: Math.round(protein),
        goal: goal?.calorieTarget || 2000,
      };
    });
  }, [workouts, mealLogs, goal]);

  // Weekly workout frequency
  const weeklyFrequency = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = startOfWeek(subDays(new Date(), (7 - i) * 7), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const count = workouts.filter((w: any) => {
        const d = new Date(w.date);
        return d >= weekStart && d <= weekEnd;
      }).length;
      return { week: format(weekStart, "MMM d"), workouts: count };
    });
  }, [workouts]);

  // Workout category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    workouts.forEach((w: any) => {
      const cat = w.category || "strength";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [workouts]);

  // Nutrition consistency (days with any logging in last 30)
  const nutritionDays = last30Days.filter(d => d.calories > 0).length;
  const workoutDays30 = last30Days.filter(d => d.workouts > 0).length;
  const avgCalories = last30Days.filter(d => d.calories > 0).reduce((s, d) => s + d.calories, 0) / Math.max(nutritionDays, 1);
  const avgProtein = last30Days.filter(d => d.protein > 0).reduce((s, d) => s + d.protein, 0) / Math.max(nutritionDays, 1);

  // Weight trend
  const sortedMetrics = [...metrics].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstWeight = sortedMetrics.length > 0 ? Number(sortedMetrics[0].weight) : null;
  const lastWeight = sortedMetrics.length > 0 ? Number(sortedMetrics[sortedMetrics.length - 1].weight) : null;
  const weightChange = firstWeight && lastWeight ? lastWeight - firstWeight : null;

  const statCards = [
    {
      label: "Total Workouts",
      value: workouts.length,
      sub: `${workoutDays30} sessions in 30 days`,
      icon: Dumbbell,
      color: "text-primary bg-primary/10",
    },
    {
      label: "Active Days (30d)",
      value: workoutDays30,
      sub: `${Math.round((workoutDays30 / 30) * 100)}% consistency`,
      icon: Award,
      color: "text-chart-4 bg-chart-4/10",
    },
    {
      label: "Avg. Daily Calories",
      value: `${Math.round(avgCalories)} kcal`,
      sub: `${nutritionDays} days logged`,
      icon: Apple,
      color: "text-chart-5 bg-chart-5/10",
    },
    {
      label: "Avg. Daily Protein",
      value: `${Math.round(avgProtein)}g`,
      sub: `vs. ${goal?.proteinTarget || 150}g goal`,
      icon: Activity,
      color: "text-chart-2 bg-chart-2/10",
    },
  ];

  return (
    <PageTransition className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="heading-lg">Analytics</h1>
          <p className="text-muted-foreground mt-1">Deep dive into your fitness trends and progress patterns.</p>
        </div>
        {weightChange !== null && (
          <div className={`text-right ${weightChange < 0 ? "text-primary" : "text-chart-3"}`}>
            <div className="text-2xl font-bold">{weightChange > 0 ? "+" : ""}{weightChange.toFixed(1)} kg</div>
            <div className="text-xs text-muted-foreground">weight change (all time)</div>
          </div>
        )}
      </header>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="p-5 border-border/50">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold tabular-nums leading-none">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1.5 font-medium">{s.label}</div>
            <div className="text-xs text-muted-foreground/60 mt-0.5">{s.sub}</div>
          </Card>
        ))}
      </div>

      {/* Calorie Trend (30 days) */}
      <Card className="p-6 border-border/50">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="font-bold text-lg">Calorie Intake — Last 30 Days</h3>
          <Badge variant="secondary">Goal: {goal?.calorieTarget || 2000} kcal</Badge>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last30Days} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} interval={4} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }}
                itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="calories" name="Calories" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#calGrad)" />
              <Line type="monotone" dataKey="goal" name="Goal" stroke="hsl(var(--chart-3))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Grid: Weekly Frequency + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-border/50">
          <h3 className="font-bold text-lg mb-6">Weekly Workout Frequency</h3>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyFrequency} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }}
                  itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                />
                <Bar dataKey="workouts" name="Workouts" radius={[6, 6, 0, 0]}>
                  {weeklyFrequency.map((_, i) => (
                    <Cell key={i} fill={i === weeklyFrequency.length - 1 ? "hsl(var(--primary))" : "hsl(var(--chart-2))"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 border-border/50">
          <h3 className="font-bold text-lg mb-6">Workout Categories</h3>
          <div className="h-[240px]">
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%" cy="50%" innerRadius={65} outerRadius={100}
                    paddingAngle={4} dataKey="value"
                    label={({ name, pct }) => `${name}`}
                    labelLine={false}
                  >
                    {categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }}
                    itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                  />
                  <Legend formatter={(value) => <span style={{ color: "hsl(var(--muted-foreground))", fontSize: 12 }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                No workout data yet
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Protein Trend */}
      <Card className="p-6 border-border/50">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h3 className="font-bold text-lg">Protein Intake — Last 30 Days</h3>
          <Badge variant="secondary">Goal: {goal?.proteinTarget || 150}g</Badge>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last30Days} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="protGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} interval={4} dy={8} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }}
                itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="protein" name="Protein (g)" stroke="hsl(var(--chart-2))" strokeWidth={2.5} fill="url(#protGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </PageTransition>
  );
}
