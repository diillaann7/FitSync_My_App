import { useState, useEffect } from "react";
import { useUser, useUpdateProfile, useLogout } from "@/hooks/use-auth";
import { PageTransition } from "@/components/layout/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, LogOut, Save, Scale, Ruler, Calendar, Activity, Target, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FITNESS_GOALS = [
  { value: "lose_weight", label: "&#128307; Lose Weight", desc: "Reduce body fat through caloric deficit" },
  { value: "gain_muscle", label: "&#128170; Build Muscle", desc: "Increase lean muscle mass" },
  { value: "maintain_weight", label: "&#9878;&#65039; Maintain Weight", desc: "Keep current body composition" },
  { value: "improve_fitness", label: "&#127939; Improve Fitness", desc: "Boost cardiovascular health & endurance" },
];

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "lightly_active", label: "Lightly Active", desc: "Light exercise 1-3 days/week" },
  { value: "moderately_active", label: "Moderately Active", desc: "Exercise 3-5 days/week" },
  { value: "very_active", label: "Very Active", desc: "Hard exercise 6-7 days/week" },
  { value: "extremely_active", label: "Extremely Active", desc: "Physical job + exercise daily" },
];

export default function Profile() {
  const { data: user, isLoading } = useUser();
  const updateProfile = useUpdateProfile();
  const logout = useLogout();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    age: "",
    gender: "",
    height: "",
    weight: "",
    fitnessGoal: "",
    activityLevel: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        age: user.age ? String(user.age) : "",
        gender: user.gender || "",
        height: user.height ? String(user.height) : "",
        weight: user.weight ? String(user.weight) : "",
        fitnessGoal: user.fitnessGoal || "",
        activityLevel: user.activityLevel || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile.mutateAsync({
      name: form.name,
      age: form.age ? Number(form.age) : undefined,
      gender: form.gender || undefined,
      height: form.height ? String(form.height) : undefined,
      weight: form.weight ? String(form.weight) : undefined,
      fitnessGoal: form.fitnessGoal || undefined,
      activityLevel: form.activityLevel || undefined,
    });
    toast({ title: "Profile updated!", description: "Your changes have been saved." });
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Activity className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const profileCompletion = [
    user?.name, user?.age, user?.gender, user?.height, user?.weight, user?.fitnessGoal, user?.activityLevel
  ].filter(Boolean).length;
  const completionPct = Math.round((profileCompletion / 7) * 100);

  return (
    <PageTransition className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <header className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="heading-lg">Profile</h1>
          <p className="text-muted-foreground mt-1">Manage your personal info and fitness preferences.</p>
        </div>
        <Button variant="outline" size="sm" onClick={logout} className="text-destructive hover:bg-destructive/10 border-destructive/30" data-testid="button-logout">
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </header>

      {/* Profile Header Card */}
      <Card className="p-6 border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold shrink-0">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold truncate">{user?.name || "Your Name"}</h2>
            <p className="text-muted-foreground text-sm">{user?.email}</p>
            {user?.fitnessGoal && (
              <Badge variant="secondary" className="mt-2 text-xs capitalize">
                {user.fitnessGoal.replace(/_/g, " ")}
              </Badge>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold text-primary tabular-nums">{completionPct}%</div>
            <div className="text-xs text-muted-foreground">profile complete</div>
            <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden mt-2 ml-auto">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionPct}%` }} />
            </div>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Info */}
          <Card className="p-6 border-border/50 space-y-5">
            <h3 className="font-bold text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Info</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Your name" className="bg-background"
                data-testid="input-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={form.email} disabled className="bg-muted text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age" className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Age</Label>
                <Input
                  id="age" type="number" min="10" max="120"
                  value={form.age} onChange={e => setForm({ ...form, age: e.target.value })}
                  placeholder="Years" className="bg-background"
                  data-testid="input-age"
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                  <SelectTrigger className="bg-background" data-testid="select-gender">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Body Measurements */}
          <Card className="p-6 border-border/50 space-y-5">
            <h3 className="font-bold text-lg flex items-center gap-2"><Scale className="w-5 h-5 text-chart-4" /> Body Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="height" className="flex items-center gap-1"><Ruler className="w-3 h-3" /> Height (cm)</Label>
                <Input
                  id="height" type="number" min="100" max="250" step="0.5"
                  value={form.height} onChange={e => setForm({ ...form, height: e.target.value })}
                  placeholder="e.g. 175" className="bg-background"
                  data-testid="input-height"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight" className="flex items-center gap-1"><Scale className="w-3 h-3" /> Weight (kg)</Label>
                <Input
                  id="weight" type="number" min="30" max="300" step="0.1"
                  value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })}
                  placeholder="e.g. 75" className="bg-background"
                  data-testid="input-weight"
                />
              </div>
            </div>

            {form.height && form.weight && (
              <div className="p-3 bg-muted/40 rounded-xl">
                <div className="text-sm text-muted-foreground">BMI</div>
                <div className="text-xl font-bold mt-0.5">
                  {(Number(form.weight) / Math.pow(Number(form.height) / 100, 2)).toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-0.5">
                  {(() => {
                    const bmi = Number(form.weight) / Math.pow(Number(form.height) / 100, 2);
                    if (bmi < 18.5) return "Underweight";
                    if (bmi < 25) return "Normal weight ✓";
                    if (bmi < 30) return "Overweight";
                    return "Obese";
                  })()}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Fitness Goal */}
        <Card className="p-6 border-border/50 space-y-5">
          <h3 className="font-bold text-lg flex items-center gap-2"><Target className="w-5 h-5 text-chart-3" /> Fitness Goal</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FITNESS_GOALS.map(g => (
              <button
                key={g.value}
                type="button"
                onClick={() => setForm({ ...form, fitnessGoal: g.value })}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  form.fitnessGoal === g.value
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-border"
                }`}
                data-testid={`goal-${g.value}`}
              >
                <div className="font-semibold" dangerouslySetInnerHTML={{ __html: g.label }} />
                <div className="text-xs text-muted-foreground mt-1">{g.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        {/* Activity Level */}
        <Card className="p-6 border-border/50 space-y-5">
          <h3 className="font-bold text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-chart-2" /> Activity Level</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ACTIVITY_LEVELS.map(a => (
              <button
                key={a.value}
                type="button"
                onClick={() => setForm({ ...form, activityLevel: a.value })}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  form.activityLevel === a.value
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-border"
                }`}
                data-testid={`activity-${a.value}`}
              >
                <div className="font-semibold text-sm">{a.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{a.desc}</div>
              </button>
            ))}
          </div>
        </Card>

        <Button type="submit" size="lg" disabled={updateProfile.isPending} className="w-full font-bold text-base py-6" data-testid="button-save-profile">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          {updateProfile.isPending ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </PageTransition>
  );
}
