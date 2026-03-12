import { useState } from "react";
import { useWorkouts, useCreateWorkout, useUpdateWorkout, useDeleteWorkout } from "@/hooks/use-workouts";
import { PageTransition } from "@/components/layout/page-transition";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dumbbell, Plus, Calendar, ChevronRight, Zap, Heart, Timer, Flame, Pencil, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { format, isToday, isYesterday } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const WORKOUT_CATEGORIES = [
  { value: "strength", label: "Strength", icon: Dumbbell, color: "text-primary bg-primary/10" },
  { value: "cardio", label: "Cardio", icon: Heart, color: "text-chart-5 bg-chart-5/10" },
  { value: "hiit", label: "HIIT", icon: Flame, color: "text-chart-3 bg-chart-3/10" },
  { value: "flexibility", label: "Flexibility", icon: Zap, color: "text-chart-4 bg-chart-4/10" },
  { value: "custom", label: "Custom", icon: Timer, color: "text-chart-2 bg-chart-2/10" },
];

const QUICK_TEMPLATES = [
  { name: "Push Day", category: "strength", emoji: "&#128170;" },
  { name: "Pull Day", category: "strength", emoji: "&#128170;" },
  { name: "Leg Day", category: "strength", emoji: "&#129457;" },
  { name: "Morning Run", category: "cardio", emoji: "&#127939;" },
  { name: "HIIT Blast", category: "hiit", emoji: "&#9889;" },
  { name: "Full Body", category: "strength", emoji: "&#128293;" },
];

function getCategoryMeta(category: string) {
  return WORKOUT_CATEGORIES.find(c => c.value === category) || WORKOUT_CATEGORIES[0];
}

function formatRelativeDate(date: Date) {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE, MMM do");
}

function EditWorkoutDialog({ workout, onClose }: { workout: any; onClose: () => void }) {
  const updateWorkout = useUpdateWorkout();
  const [name, setName] = useState(workout.name);
  const [category, setCategory] = useState(workout.category || "strength");
  const [notes, setNotes] = useState(workout.notes || "");
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateWorkout.mutateAsync({ id: workout.id, name, category, notes });
    toast({ title: "Workout updated" });
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-[440px] bg-card border-border/50">
      <DialogHeader>
        <DialogTitle>Edit Workout</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <div className="space-y-2">
          <Label>Workout Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} required className="bg-background" data-testid="input-edit-workout-name" />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WORKOUT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} className="bg-background" placeholder="Any notes..." />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={updateWorkout.isPending} className="flex-1" data-testid="button-save-workout">
            {updateWorkout.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

export default function Workouts() {
  const { data: workouts = [], isLoading } = useWorkouts();
  const createWorkout = useCreateWorkout();
  const deleteWorkout = useDeleteWorkout();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("strength");
  const [editingWorkout, setEditingWorkout] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await createWorkout.mutateAsync({ name, category });
    setIsOpen(false);
    setName("");
    setCategory("strength");
    toast({ title: "Workout created! 💪" });
  };

  const handleTemplate = async (template: typeof QUICK_TEMPLATES[0]) => {
    await createWorkout.mutateAsync({ name: template.name, category: template.category });
    toast({ title: `${template.name} created!` });
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    await deleteWorkout.mutateAsync(deletingId);
    setDeletingId(null);
    toast({ title: "Workout deleted", variant: "default" });
  };

  const groupedWorkouts = workouts.reduce((groups: Record<string, any[]>, w: any) => {
    const key = formatRelativeDate(new Date(w.date));
    if (!groups[key]) groups[key] = [];
    groups[key].push(w);
    return groups;
  }, {});

  return (
    <PageTransition className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="heading-lg">Workouts</h1>
          <p className="text-muted-foreground mt-1">Track your training sessions and progress.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold shadow-lg shadow-primary/20" data-testid="button-new-workout">
              <Plus className="w-4 h-4 mr-2" /> Start Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px] bg-card border-border/50">
            <DialogHeader>
              <DialogTitle className="heading-md">New Workout</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-5 pt-2">
              <div className="space-y-2">
                <Label>Workout Name</Label>
                <Input
                  value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Upper Body Power"
                  autoFocus required className="bg-background"
                  data-testid="input-workout-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {WORKOUT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={createWorkout.isPending} className="w-full" data-testid="button-create-workout">
                {createWorkout.isPending ? "Creating..." : "Create Workout"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Quick Start Templates */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Start</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_TEMPLATES.map(t => (
            <button
              key={t.name}
              onClick={() => handleTemplate(t)}
              disabled={createWorkout.isPending}
              className="p-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
              data-testid={`button-template-${t.name.toLowerCase().replace(/ /g, "-")}`}
            >
              <div className="text-2xl mb-2" dangerouslySetInnerHTML={{ __html: t.emoji }} />
              <div className="text-sm font-semibold group-hover:text-primary transition-colors">{t.name}</div>
              <div className="text-xs text-muted-foreground capitalize mt-0.5">{t.category}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Workout List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-2xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : workouts.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border/50 flex flex-col items-center">
          <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <Dumbbell className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No workouts yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md text-sm">Start with a quick template above or create a custom workout session.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedWorkouts).map(([date, dayWorkouts]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {date}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(dayWorkouts as any[]).map((workout: any) => {
                  const cat = getCategoryMeta(workout.category || "strength");
                  return (
                    <Card
                      key={workout.id}
                      className="group border-border/50 bg-card p-5 rounded-2xl hover:shadow-lg hover:border-primary/25 transition-all duration-200 flex flex-col gap-4"
                      data-testid={`card-workout-${workout.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cat.color}`}>
                          <cat.icon className="w-5 h-5" />
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="icon" variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={e => { e.preventDefault(); setEditingWorkout(workout); }}
                                data-testid={`button-edit-workout-${workout.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </DialogTrigger>
                            {editingWorkout?.id === workout.id && (
                              <EditWorkoutDialog workout={editingWorkout} onClose={() => setEditingWorkout(null)} />
                            )}
                          </Dialog>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={e => { e.preventDefault(); setDeletingId(workout.id); }}
                            data-testid={`button-delete-workout-${workout.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Link href={`/workouts/${workout.id}`} className="flex-1">
                        <div>
                          <h3 className="font-bold text-base group-hover:text-primary transition-colors">{workout.name}</h3>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary" className="text-xs capitalize">{workout.category || "strength"}</Badge>
                            {workout.completed && <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">Completed</Badge>}
                            {workout.xpEarned > 0 && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">+{workout.xpEarned} XP</Badge>}
                            <span className="text-xs text-muted-foreground">{format(new Date(workout.date), "h:mm a")}</span>
                          </div>
                        </div>
                      </Link>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={open => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workout?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workout and all its exercises. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-delete-workout"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
