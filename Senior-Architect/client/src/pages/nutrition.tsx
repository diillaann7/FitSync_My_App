import { useState, useRef } from "react";
import { useFoods, useCreateFood, useMealLogs, useCreateMealLog, useDeleteMealLog } from "@/hooks/use-nutrition";
import { useGoals } from "@/hooks/use-metrics";
import { useWaterLogs, useLogWater } from "@/hooks/use-gamification";
import { useUser } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Apple, Plus, Search, Flame, Coffee, Sun, Moon, Star, Droplets, Camera, Sparkles, Trash2, Crown, Upload, CheckCircle2 } from "lucide-react";
import { format, isToday } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const MEAL_TYPES = [
  { value: "breakfast", label: "Breakfast", icon: Coffee, color: "text-chart-3" },
  { value: "lunch", label: "Lunch", icon: Sun, color: "text-chart-2" },
  { value: "dinner", label: "Dinner", icon: Moon, color: "text-chart-4" },
  { value: "snack", label: "Snack", icon: Star, color: "text-primary" },
];

const WATER_AMOUNTS = [150, 250, 350, 500];

function MacroRing({ value, target, color, label }: { value: number; target: number; color: string; label: string }) {
  const pct = Math.min(value / Math.max(target, 1), 1);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const offset = circ - pct * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="32" cy="32" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute text-center">
          <div className="text-xs font-bold tabular-nums leading-none">{Math.round(value)}</div>
        </div>
      </div>
      <div className="text-xs font-medium text-muted-foreground text-center">{label}</div>
      <div className="text-xs text-muted-foreground/70">/{target}g</div>
    </div>
  );
}

function WaterTracker() {
  const { data: waterLogs = [] } = useWaterLogs();
  const logWater = useLogWater();
  const [customAmount, setCustomAmount] = useState("");

  const todayWater = waterLogs
    .filter((w: any) => isToday(new Date(w.date)))
    .reduce((s: number, w: any) => s + w.amount, 0);
  const dailyGoal = 2500;
  const pct = Math.min((todayWater / dailyGoal) * 100, 100);

  return (
    <Card className="p-5 border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center">
          <Droplets className="w-4 h-4 text-blue-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm">Water Intake</h3>
          <p className="text-xs text-muted-foreground">Daily goal: {dailyGoal}ml</p>
        </div>
        <div className="text-right">
          <div className="font-black text-blue-500 text-xl tabular-nums">{todayWater}<span className="text-xs font-semibold ml-0.5">ml</span></div>
        </div>
      </div>
      <Progress value={pct} className="h-2 mb-4 [&>div]:bg-blue-500" />
      <div className="flex flex-wrap gap-2 mb-3">
        {WATER_AMOUNTS.map(amount => (
          <Button key={amount} size="sm" variant="outline"
            className="h-8 text-xs gap-1 border-blue-200 dark:border-blue-900 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
            onClick={() => logWater.mutate(amount)} disabled={logWater.isPending}
            data-testid={`water-${amount}`}
          >
            <Droplets className="w-3 h-3" />+{amount}ml
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input type="number" placeholder="Custom (ml)" className="h-8 text-sm"
          value={customAmount} onChange={e => setCustomAmount(e.target.value)} data-testid="water-custom-input" />
        <Button size="sm" className="h-8 bg-blue-500 hover:bg-blue-600 text-white shrink-0"
          onClick={() => { if (customAmount) { logWater.mutate(Number(customAmount)); setCustomAmount(""); } }}
          disabled={!customAmount || logWater.isPending} data-testid="water-log-custom">
          Log
        </Button>
      </div>
    </Card>
  );
}

// AI Food Photo Scanner
function AIFoodScanner({ onFoodDetected }: { onFoodDetected: (food: any) => void }) {
  const { data: user } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const isPremium = user?.isPremium;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(URL.createObjectURL(file));
    setResult(null);
    setIsAnalyzing(true);

    try {
      const token = localStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/ai/analyze-food", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.requiresPremium) {
          navigate("/premium");
          return;
        }
        throw new Error(err.message || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
      toast({ title: "Food detected!", description: `${data.name} — ${data.calories} kcal` });
    } catch (err: any) {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddToLog = async () => {
    if (!result) return;
    // Create custom food + log it
    try {
      const token = localStorage.getItem("auth_token");
      const foodRes = await fetch("/api/foods", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: result.name,
          calories: result.calories,
          protein: result.protein,
          carbs: result.carbs,
          fat: result.fat,
          fiber: result.fiber,
          servingSize: result.servingSize,
        }),
      });
      const food = await foodRes.json();
      await fetch("/api/meal-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ foodId: food.id, quantity: "1", mealType: "lunch" }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/meal-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/foods"] });
      toast({ title: "Added to today's log! 🎉", description: `${result.name} logged successfully` });
      setResult(null);
      setPreview(null);
      onFoodDetected(food);
    } catch {
      toast({ title: "Failed to save food", variant: "destructive" });
    }
  };

  if (!isPremium) {
    return (
      <Card className="p-5 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-yellow-500/15 rounded-xl flex items-center justify-center">
            <Camera className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <h3 className="font-bold text-sm">AI Food Scanner</h3>
            <p className="text-xs text-muted-foreground">Premium feature</p>
          </div>
          <Badge className="ml-auto text-[10px] bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
            <Crown className="w-2.5 h-2.5 mr-1" /> PRO
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Take a photo of any meal and our AI will instantly detect calories and macros.
        </p>
        <Button
          size="sm" className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold gap-2"
          onClick={() => navigate("/premium")}
          data-testid="button-upgrade-premium"
        >
          <Crown className="w-3.5 h-3.5" /> Upgrade to Premium
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-primary/20 bg-primary/5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 bg-primary/15 rounded-xl flex items-center justify-center">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-bold text-sm flex items-center gap-1.5">
            AI Food Scanner <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
          </h3>
          <p className="text-xs text-muted-foreground">Upload a food photo to auto-detect macros</p>
        </div>
      </div>

      {preview && (
        <div className="mb-4 relative">
          <img src={preview} alt="Food preview" className="w-full h-36 object-cover rounded-xl" />
          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
              <div className="text-white text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 animate-pulse" /> Analyzing...
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="mb-4 p-4 bg-card rounded-xl border border-border/50 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="font-bold text-sm">{result.name}</span>
            <Badge variant="outline" className="ml-auto text-xs">{result.confidence} confidence</Badge>
          </div>
          <p className="text-xs text-muted-foreground italic">{result.description}</p>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {[
              { label: "Calories", value: `${result.calories} kcal`, color: "text-primary" },
              { label: "Protein", value: `${result.protein}g`, color: "text-chart-1" },
              { label: "Carbs", value: `${result.carbs}g`, color: "text-chart-4" },
              { label: "Fat", value: `${result.fat}g`, color: "text-chart-3" },
            ].map(m => (
              <div key={m.label} className="text-center">
                <div className={`font-bold text-sm ${m.color}`}>{m.value}</div>
                <div className="text-xs text-muted-foreground">{m.label}</div>
              </div>
            ))}
          </div>
          <Button size="sm" className="w-full gap-2 mt-1" onClick={handleAddToLog} data-testid="button-add-ai-food">
            <Plus className="w-3.5 h-3.5" /> Add to Today's Log
          </Button>
        </div>
      )}

      <input
        ref={fileRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleFileChange}
        data-testid="input-food-photo"
      />
      <Button
        size="sm" variant="outline" className="w-full gap-2"
        onClick={() => fileRef.current?.click()}
        disabled={isAnalyzing}
        data-testid="button-scan-food"
      >
        <Upload className="w-3.5 h-3.5" />
        {isAnalyzing ? "Analyzing..." : preview ? "Scan Another Photo" : "Upload Food Photo"}
      </Button>
    </Card>
  );
}

export default function Nutrition() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: foods = [] } = useFoods(searchTerm);
  const { data: logs = [] } = useMealLogs();
  const { data: goal } = useGoals();
  const { toast } = useToast();

  const createFood = useCreateFood();
  const createLog = useCreateMealLog();
  const deleteLog = useDeleteMealLog();

  const [isFoodOpen, setIsFoodOpen] = useState(false);
  const [foodForm, setFoodForm] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "", fiber: "", servingSize: "100g" });

  const [isLogOpen, setIsLogOpen] = useState(false);
  const [selectedFoodId, setSelectedFoodId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [mealType, setMealType] = useState("lunch");
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);

  const todayLogs = logs.filter((log: any) => isToday(new Date(log.log.date)));

  const todayTotals = todayLogs.reduce(
    (acc: any, m: any) => ({
      calories: acc.calories + m.food.calories * Number(m.log.quantity),
      protein: acc.protein + Number(m.food.protein) * Number(m.log.quantity),
      carbs: acc.carbs + Number(m.food.carbs) * Number(m.log.quantity),
      fat: acc.fat + Number(m.food.fat) * Number(m.log.quantity),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const calorieGoal = goal?.calorieTarget || 2000;
  const calorieLeft = Math.max(calorieGoal - todayTotals.calories, 0);

  const handleCreateFood = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFood.mutateAsync(foodForm as any);
    setIsFoodOpen(false);
    setFoodForm({ name: "", calories: "", protein: "", carbs: "", fat: "", fiber: "", servingSize: "100g" });
    toast({ title: "Food added to database!" });
  };

  const handleLogMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFoodId) return;
    await createLog.mutateAsync({ foodId: selectedFoodId, quantity, mealType });
    setIsLogOpen(false);
    setQuantity("1");
    setSelectedFoodId(null);
    toast({ title: "Meal logged! +10 XP" });
  };

  const handleDeleteLog = async () => {
    if (!deletingLogId) return;
    await deleteLog.mutateAsync(deletingLogId);
    setDeletingLogId(null);
    toast({ title: "Meal entry removed" });
  };

  const logsByMealType = MEAL_TYPES.map(mt => ({
    ...mt,
    logs: todayLogs.filter((l: any) => l.log.mealType === mt.value),
  }));

  const selectedFood = foods.find((f: any) => f.id === selectedFoodId);

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">Nutrition</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track your meals and hit your daily targets.</p>
        </div>
        <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold shadow-lg shadow-primary/20" data-testid="button-log-meal">
              <Plus className="w-4 h-4 mr-2" /> Log Meal
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px] bg-card border-border/50">
            <DialogHeader><DialogTitle>Log a Meal</DialogTitle></DialogHeader>
            <form onSubmit={handleLogMeal} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Meal Type</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map(mt => <SelectItem key={mt.value} value={mt.value}>{mt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Food</Label>
                <Select value={selectedFoodId?.toString() || ""} onValueChange={v => setSelectedFoodId(Number(v))}>
                  <SelectTrigger className="bg-background" data-testid="select-food">
                    <SelectValue placeholder="Choose from database..." />
                  </SelectTrigger>
                  <SelectContent>
                    {foods.map((f: any) => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.name} — {f.calories} kcal</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedFood && (
                <Card className="p-3 bg-primary/5 border-primary/20">
                  <div className="text-sm font-bold mb-1">{selectedFood.name}</div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>Kcal: <strong className="text-foreground">{Math.round(selectedFood.calories * Number(quantity || 1))}</strong></span>
                    <span>P: <strong className="text-foreground">{Math.round(Number(selectedFood.protein) * Number(quantity || 1))}g</strong></span>
                    <span>C: <strong className="text-foreground">{Math.round(Number(selectedFood.carbs) * Number(quantity || 1))}g</strong></span>
                    <span>F: <strong className="text-foreground">{Math.round(Number(selectedFood.fat) * Number(quantity || 1))}g</strong></span>
                  </div>
                </Card>
              )}
              <div className="space-y-2">
                <Label>Servings</Label>
                <Input type="number" step="0.25" min="0.25" required value={quantity}
                  onChange={e => setQuantity(e.target.value)} className="bg-background" data-testid="input-quantity" />
              </div>
              <Button type="submit" disabled={createLog.isPending || !selectedFoodId} className="w-full" data-testid="button-save-meal">
                {createLog.isPending ? "Saving..." : "Save Meal"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-2 bg-muted p-1 rounded-xl mb-6">
          <TabsTrigger value="today" className="rounded-lg font-semibold">Today's Log</TabsTrigger>
          <TabsTrigger value="database" className="rounded-lg font-semibold">Food Database</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-6">
          {/* Daily Summary + Water + AI Scanner */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-6 border-border/50 lg:col-span-1">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold tabular-nums">{Math.round(todayTotals.calories)}</div>
                    <div className="text-sm text-muted-foreground">{Math.round(calorieLeft)} kcal remaining</div>
                  </div>
                </div>
                <Progress value={Math.min((todayTotals.calories / calorieGoal) * 100, 100)} className="h-2" />
                <div className="flex justify-around">
                  <MacroRing value={todayTotals.protein} target={goal?.proteinTarget || 150} color="hsl(var(--chart-1))" label="Protein" />
                  <MacroRing value={todayTotals.carbs} target={goal?.carbTarget || 200} color="hsl(var(--chart-4))" label="Carbs" />
                  <MacroRing value={todayTotals.fat} target={goal?.fatTarget || 65} color="hsl(var(--chart-3))" label="Fat" />
                </div>
              </div>
            </Card>
            <WaterTracker />
            <AIFoodScanner onFoodDetected={() => {}} />
          </div>

          {/* Meals by type */}
          <div className="space-y-4">
            {logsByMealType.map(({ value, label, icon: Icon, color, logs: mealLogs }) => (
              <div key={value}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <h3 className="font-semibold text-sm">{label}</h3>
                  {mealLogs.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {Math.round(mealLogs.reduce((s: number, l: any) => s + l.food.calories * Number(l.log.quantity), 0))} kcal
                    </Badge>
                  )}
                </div>
                {mealLogs.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-border/50 text-sm text-muted-foreground/60 text-center">
                    No {label.toLowerCase()} logged
                  </div>
                ) : (
                  <Card className="border-border/50 overflow-hidden">
                    <div className="divide-y divide-border/50">
                      {(mealLogs as any[]).map((item: any) => (
                        <div key={item.log.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-colors group" data-testid={`row-meal-${item.log.id}`}>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold truncate">{item.food.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {Number(item.log.quantity)} serving{Number(item.log.quantity) > 1 ? "s" : ""}
                              {item.food.servingSize && ` × ${item.food.servingSize}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-sm shrink-0">
                            <div className="text-right">
                              <div className="font-bold text-primary">{Math.round(item.food.calories * Number(item.log.quantity))}</div>
                              <div className="text-xs text-muted-foreground">kcal</div>
                            </div>
                            <div className="hidden sm:grid grid-cols-3 gap-2 text-center">
                              {[
                                { label: "P", value: Math.round(Number(item.food.protein) * Number(item.log.quantity)) },
                                { label: "C", value: Math.round(Number(item.food.carbs) * Number(item.log.quantity)) },
                                { label: "F", value: Math.round(Number(item.food.fat) * Number(item.log.quantity)) },
                              ].map(m => (
                                <div key={m.label} className="w-10">
                                  <div className="text-xs text-muted-foreground">{m.label}</div>
                                  <div className="font-medium text-sm">{m.value}g</div>
                                </div>
                              ))}
                            </div>
                            <Button
                              size="icon" variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setDeletingLogId(item.log.id)}
                              data-testid={`button-delete-meal-${item.log.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search food database..." className="pl-9 bg-card shadow-sm"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} data-testid="input-search-food" />
            </div>
            <Dialog open={isFoodOpen} onOpenChange={setIsFoodOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-add-custom-food">
                  <Plus className="w-4 h-4 mr-2" /> Add Custom Food
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border/50">
                <DialogHeader><DialogTitle>Create Custom Food</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateFood} className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Food Name</Label>
                    <Input required value={foodForm.name} onChange={e => setFoodForm({ ...foodForm, name: e.target.value })} className="bg-background" data-testid="input-food-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Serving Size</Label>
                    <Input value={foodForm.servingSize} onChange={e => setFoodForm({ ...foodForm, servingSize: e.target.value })} className="bg-background" placeholder="100g" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "calories", label: "Calories (kcal)" },
                      { key: "protein", label: "Protein (g)" },
                      { key: "carbs", label: "Carbs (g)" },
                      { key: "fat", label: "Fat (g)" },
                    ].map(field => (
                      <div key={field.key} className="space-y-2">
                        <Label>{field.label}</Label>
                        <Input type="number" step="0.1" required value={(foodForm as any)[field.key]}
                          onChange={e => setFoodForm({ ...foodForm, [field.key]: e.target.value })}
                          className="bg-background" data-testid={`input-food-${field.key}`} />
                      </div>
                    ))}
                  </div>
                  <Button type="submit" disabled={createFood.isPending} className="w-full" data-testid="button-save-food">
                    {createFood.isPending ? "Saving..." : "Save to Database"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(foods as any[]).map((food: any) => (
              <Card key={food.id} className="p-5 border-border/50 hover:shadow-md transition-shadow flex flex-col gap-3" data-testid={`card-food-${food.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold leading-snug">{food.name}</h4>
                  <Badge variant="secondary" className="shrink-0 tabular-nums">{food.calories} kcal</Badge>
                </div>
                {food.servingSize && <div className="text-xs text-muted-foreground">Per {food.servingSize}</div>}
                <div className="flex justify-between text-sm pt-2 border-t border-border/50">
                  <span className="text-chart-1 font-medium">P: {food.protein}g</span>
                  <span className="text-chart-4 font-medium">C: {food.carbs}g</span>
                  <span className="text-chart-3 font-medium">F: {food.fat}g</span>
                </div>
                {food.isCustom && <Badge variant="outline" className="w-fit text-xs">Custom</Badge>}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete meal log confirm */}
      <AlertDialog open={!!deletingLogId} onOpenChange={open => !open && setDeletingLogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove meal entry?</AlertDialogTitle>
            <AlertDialogDescription>This will remove this meal from today's log.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLog} className="bg-destructive hover:bg-destructive/90" data-testid="button-confirm-delete-meal">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
