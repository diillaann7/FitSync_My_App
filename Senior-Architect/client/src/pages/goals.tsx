import { useState, useEffect } from "react";
import { useGoals, useSaveGoals } from "@/hooks/use-metrics";
import { useUser } from "@/hooks/use-auth";
import { PageTransition } from "@/components/layout/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Target, Flame, Dumbbell, Apple, Zap, Scale, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// TDEE Calculator
function calculateTDEE(weight: number, height: number, age: number, gender: string, activityLevel: string): number {
  // Mifflin-St Jeor BMR
  let bmr = gender === "female"
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.55));
}

function goalPresets(fitnessGoal: string, tdee: number) {
  switch (fitnessGoal) {
    case "lose_weight":
      return { calories: Math.max(tdee - 500, 1200), protein: 180, carbs: 150, fat: 55, label: "Calorie Deficit (-500 kcal)" };
    case "gain_muscle":
      return { calories: tdee + 300, protein: 200, carbs: 280, fat: 80, label: "Calorie Surplus (+300 kcal)" };
    case "maintain_weight":
      return { calories: tdee, protein: 150, carbs: 225, fat: 65, label: "Maintenance Calories" };
    case "improve_fitness":
      return { calories: tdee, protein: 160, carbs: 250, fat: 70, label: "Performance Focused" };
    default:
      return { calories: 2000, protein: 150, carbs: 200, fat: 65, label: "General Health" };
  }
}

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "lightly_active", label: "Lightly Active", desc: "Light exercise 1-3 days/week" },
  { value: "moderately_active", label: "Moderately Active", desc: "Exercise 3-5 days/week" },
  { value: "very_active", label: "Very Active", desc: "Hard exercise 6-7 days/week" },
  { value: "extremely_active", label: "Extremely Active", desc: "Physical job + daily exercise" },
];

export default function Goals() {
  const { data: user } = useUser();
  const { data: existingGoals } = useGoals();
  const saveGoals = useSaveGoals();
  const { toast } = useToast();

  const [form, setForm] = useState({
    calorieTarget: 2000,
    proteinTarget: 150,
    carbTarget: 200,
    fatTarget: 65,
    workoutsPerWeek: 4,
    weightGoal: "",
    activityLevel: "moderately_active",
  });

  const [autoCalcTDEE, setAutoCalcTDEE] = useState(false);

  useEffect(() => {
    if (existingGoals) {
      setForm(prev => ({
        ...prev,
        calorieTarget: existingGoals.calorieTarget || 2000,
        proteinTarget: existingGoals.proteinTarget || 150,
        carbTarget: existingGoals.carbTarget || 200,
        fatTarget: existingGoals.fatTarget || 65,
        workoutsPerWeek: existingGoals.workoutsPerWeek || 4,
        weightGoal: existingGoals.weightGoal || "",
        activityLevel: existingGoals.activityLevel || "moderately_active",
      }));
    }
  }, [existingGoals]);

  const tdee = (user?.weight && user?.height && user?.age && user?.gender)
    ? calculateTDEE(Number(user.weight), Number(user.height), Number(user.age), user.gender, form.activityLevel)
    : null;

  const preset = tdee ? goalPresets(user?.fitnessGoal || "maintain_weight", tdee) : null;

  const applyPreset = () => {
    if (!preset) return;
    setForm(prev => ({
      ...prev,
      calorieTarget: preset.calories,
      proteinTarget: preset.protein,
      carbTarget: preset.carbs,
      fatTarget: preset.fat,
    }));
    toast({ title: "Preset applied!", description: `${preset.label} macro targets set.` });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveGoals.mutateAsync(form);
    toast({ title: "Goals saved!", description: "Your fitness goals have been updated." });
  };

  const totalMacroCalories = form.proteinTarget * 4 + form.carbTarget * 4 + form.fatTarget * 9;

  const macroDistribution = [
    { label: "Protein", value: form.proteinTarget, calories: form.proteinTarget * 4, color: "hsl(var(--chart-1))", pct: Math.round((form.proteinTarget * 4 / Math.max(totalMacroCalories, 1)) * 100) },
    { label: "Carbs", value: form.carbTarget, calories: form.carbTarget * 4, color: "hsl(var(--chart-4))", pct: Math.round((form.carbTarget * 4 / Math.max(totalMacroCalories, 1)) * 100) },
    { label: "Fat", value: form.fatTarget, calories: form.fatTarget * 9, color: "hsl(var(--chart-3))", pct: Math.round((form.fatTarget * 9 / Math.max(totalMacroCalories, 1)) * 100) },
  ];

  return (
    <PageTransition className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <header>
        <h1 className="heading-lg">Fitness Goals</h1>
        <p className="text-muted-foreground mt-1">Set your daily targets and let FitSync calculate what you need to hit them.</p>
      </header>

      {/* TDEE Card */}
      {user && (
        <Card className="p-6 border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-lg">Your TDEE Estimate</h3>
              </div>
              <p className="text-sm text-muted-foreground">Total Daily Energy Expenditure — calories your body burns per day.</p>
            </div>
            {tdee ? (
              <div className="text-right">
                <div className="text-4xl font-bold tabular-nums text-primary">{tdee}</div>
                <div className="text-sm text-muted-foreground">kcal / day</div>
              </div>
            ) : (
              <Badge variant="outline">Complete your profile to see TDEE</Badge>
            )}
          </div>

          {tdee && (
            <div className="mt-4 flex flex-wrap gap-3 items-center">
              <div>
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Activity Level</Label>
                <Select value={form.activityLevel} onValueChange={v => setForm({ ...form, activityLevel: v })}>
                  <SelectTrigger className="bg-background mt-1 w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_LEVELS.map(a => (
                      <SelectItem key={a.value} value={a.value}>
                        <div>
                          <div>{a.label}</div>
                          <div className="text-xs text-muted-foreground">{a.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" onClick={applyPreset} className="mt-5">
                <Target className="w-4 h-4 mr-2" /> Apply Smart Preset
              </Button>

              {preset && (
                <div className="mt-5">
                  <Badge variant="secondary" className="text-sm">{preset.label}</Badge>
                </div>
              )}
            </div>
          )}

          {!user?.weight || !user?.height || !user?.age ? (
            <p className="mt-3 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              &#9432;&#65039; Complete your profile (weight, height, age, and gender) to enable smart TDEE calculation and goal presets.
            </p>
          ) : null}
        </Card>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calorie & Workout Goals */}
          <Card className="p-6 border-border/50 space-y-5">
            <h3 className="font-bold text-lg flex items-center gap-2"><Flame className="w-5 h-5 text-chart-5" /> Energy Goals</h3>
            <div className="space-y-2">
              <Label htmlFor="calories">Daily Calorie Target (kcal)</Label>
              <Input
                id="calories" type="number" required min="500" max="8000"
                value={form.calorieTarget}
                onChange={e => setForm({ ...form, calorieTarget: Number(e.target.value) })}
                className="bg-background text-lg font-bold" data-testid="input-calorie-target"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workouts">Weekly Workout Target</Label>
              <Input
                id="workouts" type="number" required min="0" max="14"
                value={form.workoutsPerWeek}
                onChange={e => setForm({ ...form, workoutsPerWeek: Number(e.target.value) })}
                className="bg-background" data-testid="input-workouts-per-week"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightGoal">Target Weight (kg) <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="weightGoal" type="number" step="0.1" min="30" max="300"
                value={form.weightGoal}
                onChange={e => setForm({ ...form, weightGoal: e.target.value })}
                placeholder="e.g. 70"
                className="bg-background" data-testid="input-weight-goal"
              />
            </div>
          </Card>

          {/* Macro Goals */}
          <Card className="p-6 border-border/50 space-y-5">
            <h3 className="font-bold text-lg flex items-center gap-2"><Apple className="w-5 h-5 text-primary" /> Macro Targets</h3>
            {[
              { key: "proteinTarget", label: "Protein (g)", color: "text-chart-1", tip: "1.6-2.2g per kg of bodyweight for muscle" },
              { key: "carbTarget", label: "Carbohydrates (g)", color: "text-chart-4", tip: "Main energy source, adjust based on activity" },
              { key: "fatTarget", label: "Fat (g)", color: "text-chart-3", tip: "Essential fats: min 0.5g per kg bodyweight" },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label className={f.color}>{f.label}</Label>
                <Input
                  type="number" required min="0"
                  value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: Number(e.target.value) })}
                  className="bg-background"
                  data-testid={`input-${f.key}`}
                />
                <p className="text-xs text-muted-foreground/70">{f.tip}</p>
              </div>
            ))}
          </Card>
        </div>

        {/* Macro distribution preview */}
        <Card className="p-6 border-border/50">
          <h3 className="font-bold text-base mb-4">Macro Distribution Preview</h3>
          <div className="flex gap-2 h-5 rounded-full overflow-hidden mb-4">
            {macroDistribution.map((m) => (
              <div key={m.label} className="h-full transition-all" style={{ width: `${m.pct}%`, background: m.color, minWidth: m.pct > 0 ? 4 : 0 }} />
            ))}
          </div>
          <div className="flex gap-6 flex-wrap">
            {macroDistribution.map(m => (
              <div key={m.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: m.color }} />
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-sm text-muted-foreground">{m.value}g ({m.pct}%)</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            Total macro calories: <strong className="text-foreground">{totalMacroCalories} kcal</strong>
            {Math.abs(totalMacroCalories - form.calorieTarget) > 50 && (
              <span className="text-chart-3 ml-2">(differs from calorie target by {Math.abs(totalMacroCalories - form.calorieTarget)} kcal)</span>
            )}
          </div>
        </Card>

        <Button type="submit" size="lg" disabled={saveGoals.isPending} className="w-full font-bold text-base py-6" data-testid="button-save-goals">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          {saveGoals.isPending ? "Saving Goals..." : "Save Fitness Goals"}
        </Button>
      </form>
    </PageTransition>
  );
}
