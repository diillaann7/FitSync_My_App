import { useState } from "react";
import { useBodyMetrics, useCreateBodyMetric, useUpdateBodyMetric, useDeleteBodyMetric } from "@/hooks/use-metrics";
import { useUser } from "@/hooks/use-auth";
import { PageTransition } from "@/components/layout/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Scale, TrendingDown, TrendingUp, Minus, Activity, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from "recharts";

const METRIC_FIELDS = [
  { key: "bodyFat", label: "Body Fat (%)" },
  { key: "muscleMass", label: "Muscle Mass (kg)" },
  { key: "waist", label: "Waist (cm)" },
  { key: "chest", label: "Chest (cm)" },
  { key: "arms", label: "Arms (cm)" },
  { key: "legs", label: "Legs (cm)" },
];

export default function Metrics() {
  const { data: user } = useUser();
  const { data: metrics = [] } = useBodyMetrics();
  const createMetric = useCreateBodyMetric();
  const updateMetric = useUpdateBodyMetric();
  const deleteMetric = useDeleteBodyMetric();
  const { toast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState({ weight: "", bodyFat: "", muscleMass: "", waist: "", chest: "", arms: "", legs: "" });
  const [editingMetric, setEditingMetric] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ weight: "", bodyFat: "", muscleMass: "", waist: "", chest: "", arms: "", legs: "" });
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sortedMetrics = [...metrics].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const latestMetric = sortedMetrics[sortedMetrics.length - 1];
  const prevMetric = sortedMetrics[sortedMetrics.length - 2];
  const weightChange = latestMetric && prevMetric
    ? Number(latestMetric.weight) - Number(prevMetric.weight)
    : null;

  const weightChartData = sortedMetrics.map((m: any) => ({
    date: format(new Date(m.date), "MMM dd"),
    weight: Number(m.weight),
    bodyFat: m.bodyFat ? Number(m.bodyFat) : undefined,
    muscleMass: m.muscleMass ? Number(m.muscleMass) : undefined,
  }));

  const compositionData = sortedMetrics
    .filter((m: any) => m.bodyFat || m.muscleMass)
    .map((m: any) => ({
      date: format(new Date(m.date), "MMM dd"),
      "Body Fat %": m.bodyFat ? Number(m.bodyFat) : undefined,
      "Muscle Mass": m.muscleMass ? Number(m.muscleMass) : undefined,
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMetric.mutateAsync({
      weight: form.weight,
      bodyFat: form.bodyFat || undefined,
      muscleMass: form.muscleMass || undefined,
      waist: form.waist || undefined,
      chest: form.chest || undefined,
      arms: form.arms || undefined,
      legs: form.legs || undefined,
    });
    setIsOpen(false);
    setForm({ weight: "", bodyFat: "", muscleMass: "", waist: "", chest: "", arms: "", legs: "" });
    toast({ title: "Measurement logged! +20 XP" });
  };

  const handleEditOpen = (metric: any) => {
    setEditingMetric(metric);
    setEditForm({
      weight: String(metric.weight || ""),
      bodyFat: String(metric.bodyFat || ""),
      muscleMass: String(metric.muscleMass || ""),
      waist: String(metric.waist || ""),
      chest: String(metric.chest || ""),
      arms: String(metric.arms || ""),
      legs: String(metric.legs || ""),
    });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMetric) return;
    await updateMetric.mutateAsync({
      id: editingMetric.id,
      weight: editForm.weight,
      bodyFat: editForm.bodyFat || null,
      muscleMass: editForm.muscleMass || null,
      waist: editForm.waist || null,
      chest: editForm.chest || null,
      arms: editForm.arms || null,
      legs: editForm.legs || null,
    });
    setEditingMetric(null);
    toast({ title: "Measurement updated!" });
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteMetric.mutateAsync(deletingId);
    setDeletingId(null);
    toast({ title: "Measurement deleted" });
  };

  const TrendIcon = weightChange === null ? Minus : weightChange > 0 ? TrendingUp : TrendingDown;
  const trendColor = weightChange === null ? "text-muted-foreground"
    : user?.fitnessGoal === "lose_weight"
      ? (weightChange < 0 ? "text-primary" : "text-destructive")
      : (weightChange > 0 ? "text-primary" : "text-chart-3");

  return (
    <PageTransition className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="heading-lg">Body Metrics</h1>
          <p className="text-muted-foreground mt-1">Track your body composition and measurements.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold shadow-lg shadow-primary/20" data-testid="button-log-measurement">
              <Plus className="w-4 h-4 mr-2" /> Log Measurement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] bg-card border-border/50">
            <DialogHeader><DialogTitle className="heading-md">Add Measurements</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label>Weight (kg) <span className="text-destructive">*</span></Label>
                <Input type="number" step="0.1" required value={form.weight}
                  onChange={e => setForm({ ...form, weight: e.target.value })}
                  placeholder="e.g. 75.5" className="bg-background" data-testid="input-weight" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {METRIC_FIELDS.map(f => (
                  <div key={f.key} className="space-y-2">
                    <Label>{f.label} <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input type="number" step="0.1" value={(form as any)[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="bg-background" data-testid={`input-${f.key}`} />
                  </div>
                ))}
              </div>
              <Button type="submit" disabled={createMetric.isPending} className="w-full" data-testid="button-save-measurement">
                {createMetric.isPending ? "Saving..." : "Save Measurement"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Current Weight", icon: Scale, color: "text-primary bg-primary/10",
            value: latestMetric ? `${Number(latestMetric.weight)} kg` : "--",
            sub: weightChange !== null ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg from last` : "No previous entry",
            trend: weightChange,
          },
          {
            label: "Body Fat", icon: Activity, color: "text-chart-5 bg-chart-5/10",
            value: latestMetric?.bodyFat ? `${Number(latestMetric.bodyFat)}%` : "--",
            sub: "Latest reading",
          },
          {
            label: "Muscle Mass", icon: TrendingUp, color: "text-chart-4 bg-chart-4/10",
            value: latestMetric?.muscleMass ? `${Number(latestMetric.muscleMass)} kg` : "--",
            sub: "Latest reading",
          },
          {
            label: "Log Entries", icon: Plus, color: "text-chart-2 bg-chart-2/10",
            value: metrics.length,
            sub: metrics.length >= 7 ? "Great consistency!" : "Log regularly for trends",
          },
        ].map((s, i) => (
          <Card key={i} className="p-5 border-border/50">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold tabular-nums leading-none">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-2 font-medium">{s.label}</div>
            <div className={`text-xs mt-1 flex items-center gap-1 ${s.trend !== undefined && s.trend !== null ? trendColor : "text-muted-foreground/60"}`}>
              {s.trend !== null && s.trend !== undefined && <TrendIcon className="w-3 h-3" />}
              {s.sub}
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="weight" className="w-full">
        <TabsList className="bg-muted p-1 rounded-xl mb-6">
          <TabsTrigger value="weight" className="rounded-lg font-semibold">Weight Trend</TabsTrigger>
          <TabsTrigger value="composition" className="rounded-lg font-semibold">Body Composition</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg font-semibold">History</TabsTrigger>
        </TabsList>

        <TabsContent value="weight">
          <Card className="p-6 border-border/50">
            <h3 className="font-bold text-lg mb-6">Weight Over Time</h3>
            <div className="h-[380px]">
              {weightChartData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weightChartData} margin={{ top: 15, right: 20, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="wGradM" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} domain={["auto", "auto"]} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }} itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} />
                    <Area type="monotone" dataKey="weight" name="Weight (kg)" stroke="hsl(var(--primary))" strokeWidth={3} fill="url(#wGradM)" dot={{ fill: "hsl(var(--primary))", r: 4, strokeWidth: 0 }} activeDot={{ r: 7 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  <Scale className="w-10 h-10 mb-3 opacity-30" />
                  <p className="font-medium">Not enough data to show trends</p>
                  <p className="text-sm opacity-70 mt-1">Log at least 2 measurements</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="composition">
          <Card className="p-6 border-border/50">
            <h3 className="font-bold text-lg mb-6">Body Composition Trend</h3>
            <div className="h-[380px]">
              {compositionData.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={compositionData} margin={{ top: 15, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 10 }} itemStyle={{ fontWeight: 600 }} />
                    <Legend />
                    <Line type="monotone" dataKey="Body Fat %" stroke="hsl(var(--chart-5))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--chart-5))" }} />
                    <Line type="monotone" dataKey="Muscle Mass" stroke="hsl(var(--chart-4))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--chart-4))" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                  <Activity className="w-10 h-10 mb-3 opacity-30" />
                  <p className="font-medium">No body composition data</p>
                  <p className="text-sm opacity-70 mt-1">Log body fat % or muscle mass to see trends</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-border/50 overflow-hidden">
            {sortedMetrics.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No measurements logged yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/30">
                      {["Date", "Weight", "Body Fat", "Muscle", "Waist", "Chest", "Arms", "Legs", "Actions"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {[...sortedMetrics].reverse().map((m: any) => (
                      <tr key={m.id} className="hover:bg-muted/10 transition-colors group" data-testid={`row-metric-${m.id}`}>
                        <td className="px-4 py-3 font-medium whitespace-nowrap">{format(new Date(m.date), "MMM do, yyyy")}</td>
                        <td className="px-4 py-3 font-bold text-primary tabular-nums">{m.weight} kg</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{m.bodyFat ? `${m.bodyFat}%` : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{m.muscleMass ? `${m.muscleMass} kg` : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{m.waist ? `${m.waist} cm` : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{m.chest ? `${m.chest} cm` : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{m.arms ? `${m.arms} cm` : "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">{m.legs ? `${m.legs} cm` : "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => handleEditOpen(m)}
                              data-testid={`button-edit-metric-${m.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeletingId(m.id)}
                              data-testid={`button-delete-metric-${m.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingMetric} onOpenChange={open => !open && setEditingMetric(null)}>
        <DialogContent className="sm:max-w-[480px] bg-card border-border/50">
          <DialogHeader><DialogTitle>Edit Measurement</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSave} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>Weight (kg) *</Label>
              <Input type="number" step="0.1" required value={editForm.weight}
                onChange={e => setEditForm({ ...editForm, weight: e.target.value })} className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {METRIC_FIELDS.map(f => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Input type="number" step="0.1" value={(editForm as any)[f.key]}
                    onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })} className="bg-background" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingMetric(null)}>Cancel</Button>
              <Button type="submit" disabled={updateMetric.isPending} className="flex-1" data-testid="button-save-metric-edit">
                {updateMetric.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete measurement?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this measurement entry.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" data-testid="button-confirm-delete-metric">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
