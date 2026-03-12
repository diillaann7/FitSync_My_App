import { db } from "./db";
import {
  users, workouts, exercises, foods, mealLogs, bodyMetrics, goals,
  personalRecords, waterLogs, dailyChallenges, weeklyPlans,
  type User, type InsertUser,
  type Workout, type InsertWorkout,
  type Exercise, type InsertExercise,
  type Food, type InsertFood,
  type MealLog, type InsertMealLog,
  type BodyMetrics, type InsertBodyMetrics,
  type Goal, type InsertGoal,
  type PersonalRecord, type InsertPersonalRecord,
  type WaterLog, type InsertWaterLog,
  type DailyChallenge, type InsertDailyChallenge,
  type WeeklyPlan, type InsertWeeklyPlan,
} from "@shared/schema";
import { eq, desc, ilike, and, sql, gt, asc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<any>): Promise<User>;
  addXp(userId: number, xp: number): Promise<User>;
  getLeaderboard(): Promise<Pick<User, "id" | "name" | "xp" | "level">[]>;

  // Workouts
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  getWorkouts(userId: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  updateWorkout(id: number, updates: Partial<InsertWorkout>): Promise<Workout>;
  deleteWorkout(id: number): Promise<void>;
  completeWorkout(id: number, data: { durationMinutes: number; totalVolume: number; xpEarned: number }): Promise<Workout>;

  // Exercises
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  getExercises(workoutId: number): Promise<Exercise[]>;
  updateExercise(id: number, updates: Partial<InsertExercise>): Promise<Exercise>;
  deleteExercise(id: number): Promise<void>;

  // Foods
  getFoods(search?: string): Promise<Food[]>;
  createFood(food: InsertFood): Promise<Food>;
  getFoodCount(): Promise<number>;

  // Meal Logs
  createMealLog(log: InsertMealLog): Promise<MealLog>;
  getMealLogs(userId: number): Promise<{ log: MealLog; food: Food }[]>;
  updateMealLog(id: number, updates: Partial<InsertMealLog>): Promise<MealLog>;
  deleteMealLog(id: number): Promise<void>;

  // Body Metrics
  createBodyMetrics(metrics: InsertBodyMetrics): Promise<BodyMetrics>;
  getBodyMetrics(userId: number): Promise<BodyMetrics[]>;
  updateBodyMetrics(id: number, updates: Partial<InsertBodyMetrics>): Promise<BodyMetrics>;
  deleteBodyMetrics(id: number): Promise<void>;

  // Goals
  getGoal(userId: number): Promise<Goal | undefined>;
  upsertGoal(goal: InsertGoal): Promise<Goal>;

  // Personal Records
  getPersonalRecords(userId: number): Promise<PersonalRecord[]>;
  upsertPersonalRecord(pr: InsertPersonalRecord): Promise<PersonalRecord>;

  // Water Logs
  getWaterLogs(userId: number): Promise<WaterLog[]>;
  createWaterLog(log: InsertWaterLog): Promise<WaterLog>;
  deleteWaterLog(id: number): Promise<void>;

  // Daily Challenges
  getDailyChallenges(userId: number): Promise<DailyChallenge[]>;
  createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge>;
  completeChallenge(id: number, userId: number): Promise<DailyChallenge>;

  // Weekly Plan
  getWeeklyPlan(userId: number): Promise<WeeklyPlan | undefined>;
  upsertWeeklyPlan(plan: InsertWeeklyPlan): Promise<WeeklyPlan>;
}

export class DatabaseStorage implements IStorage {
  // ===================== USERS =====================
  async getUser(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<any>) {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user;
  }

  async addXp(userId: number, xp: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");
    const newXp = (user.xp || 0) + xp;
    const newLevel = Math.max(1, Math.floor(newXp / 500) + 1);
    const [updated] = await db.update(users)
      .set({ xp: newXp, level: newLevel })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  async getLeaderboard() {
    return await db.select({
      id: users.id, name: users.name, xp: users.xp, level: users.level,
    }).from(users).orderBy(desc(users.xp)).limit(20);
  }

  // ===================== WORKOUTS =====================
  async createWorkout(workout: InsertWorkout) {
    const [newWorkout] = await db.insert(workouts).values(workout).returning();
    return newWorkout;
  }

  async getWorkouts(userId: number) {
    return await db.select().from(workouts).where(eq(workouts.userId, userId)).orderBy(desc(workouts.date));
  }

  async getWorkout(id: number) {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout;
  }

  async updateWorkout(id: number, updates: Partial<InsertWorkout>) {
    const [updated] = await db.update(workouts).set(updates).where(eq(workouts.id, id)).returning();
    return updated;
  }

  async deleteWorkout(id: number) {
    await db.delete(exercises).where(eq(exercises.workoutId, id));
    await db.delete(workouts).where(eq(workouts.id, id));
  }

  async completeWorkout(id: number, data: { durationMinutes: number; totalVolume: number; xpEarned: number }) {
    const [updated] = await db.update(workouts)
      .set({ completed: true, ...data })
      .where(eq(workouts.id, id))
      .returning();
    return updated;
  }

  // ===================== EXERCISES =====================
  async createExercise(exercise: InsertExercise) {
    const [newExercise] = await db.insert(exercises).values(exercise).returning();
    return newExercise;
  }

  async getExercises(workoutId: number) {
    return await db.select().from(exercises).where(eq(exercises.workoutId, workoutId));
  }

  async updateExercise(id: number, updates: Partial<InsertExercise>) {
    const [updated] = await db.update(exercises).set(updates).where(eq(exercises.id, id)).returning();
    return updated;
  }

  async deleteExercise(id: number) {
    await db.delete(exercises).where(eq(exercises.id, id));
  }

  // ===================== FOODS =====================
  async getFoods(search?: string): Promise<Food[]> {
    if (search?.trim()) {
      return await db.select().from(foods).where(ilike(foods.name, `%${search}%`));
    }
    return await db.select().from(foods);
  }

  async createFood(food: InsertFood): Promise<Food> {
    const [newFood] = await db.insert(foods).values(food).returning();
    return newFood;
  }

  async getFoodCount(): Promise<number> {
    const result = await db.select().from(foods);
    return result.length;
  }

  // ===================== MEAL LOGS =====================
  async createMealLog(log: InsertMealLog): Promise<MealLog> {
    const [newLog] = await db.insert(mealLogs).values(log).returning();
    return newLog;
  }

  async getMealLogs(userId: number): Promise<{ log: MealLog; food: Food }[]> {
    return await db.select({ log: mealLogs, food: foods })
      .from(mealLogs)
      .innerJoin(foods, eq(mealLogs.foodId, foods.id))
      .where(eq(mealLogs.userId, userId))
      .orderBy(desc(mealLogs.date));
  }

  async updateMealLog(id: number, updates: Partial<InsertMealLog>): Promise<MealLog> {
    const [updated] = await db.update(mealLogs).set(updates).where(eq(mealLogs.id, id)).returning();
    return updated;
  }

  async deleteMealLog(id: number): Promise<void> {
    await db.delete(mealLogs).where(eq(mealLogs.id, id));
  }

  // ===================== BODY METRICS =====================
  async createBodyMetrics(metrics: InsertBodyMetrics): Promise<BodyMetrics> {
    const [m] = await db.insert(bodyMetrics).values(metrics).returning();
    return m;
  }

  async getBodyMetrics(userId: number): Promise<BodyMetrics[]> {
    return await db.select().from(bodyMetrics).where(eq(bodyMetrics.userId, userId)).orderBy(desc(bodyMetrics.date));
  }

  async updateBodyMetrics(id: number, updates: Partial<InsertBodyMetrics>): Promise<BodyMetrics> {
    const [updated] = await db.update(bodyMetrics).set(updates).where(eq(bodyMetrics.id, id)).returning();
    return updated;
  }

  async deleteBodyMetrics(id: number): Promise<void> {
    await db.delete(bodyMetrics).where(eq(bodyMetrics.id, id));
  }

  // ===================== GOALS =====================
  async getGoal(userId: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.userId, userId));
    return goal;
  }

  async upsertGoal(goal: InsertGoal): Promise<Goal> {
    const existing = await this.getGoal(goal.userId);
    if (existing) {
      const [updated] = await db.update(goals).set({ ...goal, updatedAt: new Date() }).where(eq(goals.userId, goal.userId)).returning();
      return updated;
    }
    const [created] = await db.insert(goals).values(goal).returning();
    return created;
  }

  // ===================== PERSONAL RECORDS =====================
  async getPersonalRecords(userId: number): Promise<PersonalRecord[]> {
    return await db.select().from(personalRecords)
      .where(eq(personalRecords.userId, userId))
      .orderBy(desc(personalRecords.date));
  }

  async upsertPersonalRecord(pr: InsertPersonalRecord): Promise<PersonalRecord> {
    const existing = await db.select().from(personalRecords)
      .where(and(eq(personalRecords.userId, pr.userId), eq(personalRecords.exerciseName, pr.exerciseName)))
      .limit(1);

    if (existing.length > 0) {
      const old = existing[0];
      if (Number(pr.weight) > Number(old.weight) ||
        (Number(pr.weight) === Number(old.weight) && pr.reps > old.reps)) {
        const [updated] = await db.update(personalRecords)
          .set({ ...pr, date: new Date() })
          .where(eq(personalRecords.id, old.id))
          .returning();
        return updated;
      }
      return old;
    }

    const [created] = await db.insert(personalRecords).values(pr).returning();
    return created;
  }

  // ===================== WATER LOGS =====================
  async getWaterLogs(userId: number): Promise<WaterLog[]> {
    return await db.select().from(waterLogs)
      .where(eq(waterLogs.userId, userId))
      .orderBy(desc(waterLogs.date));
  }

  async createWaterLog(log: InsertWaterLog): Promise<WaterLog> {
    const [created] = await db.insert(waterLogs).values(log).returning();
    return created;
  }

  async deleteWaterLog(id: number): Promise<void> {
    await db.delete(waterLogs).where(eq(waterLogs.id, id));
  }

  // ===================== DAILY CHALLENGES =====================
  async getDailyChallenges(userId: number): Promise<DailyChallenge[]> {
    return await db.select().from(dailyChallenges)
      .where(eq(dailyChallenges.userId, userId))
      .orderBy(desc(dailyChallenges.date));
  }

  async createDailyChallenge(challenge: InsertDailyChallenge): Promise<DailyChallenge> {
    const [created] = await db.insert(dailyChallenges).values(challenge).returning();
    return created;
  }

  async completeChallenge(id: number, userId: number): Promise<DailyChallenge> {
    const [updated] = await db.update(dailyChallenges)
      .set({ completed: true })
      .where(and(eq(dailyChallenges.id, id), eq(dailyChallenges.userId, userId)))
      .returning();
    return updated;
  }

  // ===================== WEEKLY PLAN =====================
  async getWeeklyPlan(userId: number): Promise<WeeklyPlan | undefined> {
    const [plan] = await db.select().from(weeklyPlans)
      .where(eq(weeklyPlans.userId, userId))
      .orderBy(desc(weeklyPlans.createdAt))
      .limit(1);
    return plan;
  }

  async upsertWeeklyPlan(plan: InsertWeeklyPlan): Promise<WeeklyPlan> {
    const [created] = await db.insert(weeklyPlans).values(plan).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();

// ============================================================
// SEED FOOD DATABASE
// ============================================================
export async function seedFoodDatabase() {
  const count = await storage.getFoodCount();
  if (count > 0) return;

  const seedFoods: InsertFood[] = [
    { name: "Chicken Breast (cooked)", calories: 165, protein: "31", carbs: "0", fat: "3.6", fiber: "0", servingSize: "100g" },
    { name: "Salmon (cooked)", calories: 208, protein: "20", carbs: "0", fat: "13", fiber: "0", servingSize: "100g" },
    { name: "Egg (large)", calories: 72, protein: "6", carbs: "0.4", fat: "5", fiber: "0", servingSize: "1 egg" },
    { name: "Greek Yogurt (plain)", calories: 100, protein: "17", carbs: "6", fat: "0.7", fiber: "0", servingSize: "170g" },
    { name: "Tuna (canned in water)", calories: 120, protein: "26", carbs: "0", fat: "1", fiber: "0", servingSize: "100g" },
    { name: "Cottage Cheese (low fat)", calories: 98, protein: "11", carbs: "3.4", fat: "4.3", fiber: "0", servingSize: "100g" },
    { name: "Turkey Breast", calories: 135, protein: "30", carbs: "0", fat: "1", fiber: "0", servingSize: "100g" },
    { name: "Beef (lean ground)", calories: 218, protein: "26", carbs: "0", fat: "12", fiber: "0", servingSize: "100g" },
    { name: "Whey Protein Shake", calories: 120, protein: "24", carbs: "3", fat: "1.5", fiber: "0", servingSize: "30g scoop" },
    { name: "Tofu (firm)", calories: 70, protein: "8", carbs: "2", fat: "4", fiber: "0.3", servingSize: "100g" },
    { name: "Shrimp (cooked)", calories: 99, protein: "24", carbs: "0", fat: "0.3", fiber: "0", servingSize: "100g" },
    { name: "Black Beans (cooked)", calories: 132, protein: "8.9", carbs: "24", fat: "0.5", fiber: "8.7", servingSize: "100g" },
    { name: "Brown Rice (cooked)", calories: 216, protein: "5", carbs: "45", fat: "1.8", fiber: "3.5", servingSize: "1 cup" },
    { name: "White Rice (cooked)", calories: 200, protein: "4.3", carbs: "44", fat: "0.4", fiber: "0.6", servingSize: "1 cup" },
    { name: "Oatmeal (cooked)", calories: 150, protein: "5", carbs: "27", fat: "2.5", fiber: "4", servingSize: "1 cup" },
    { name: "Whole Wheat Bread", calories: 69, protein: "3.6", carbs: "12", fat: "1.1", fiber: "1.9", servingSize: "1 slice" },
    { name: "Sweet Potato (baked)", calories: 103, protein: "2.3", carbs: "24", fat: "0.1", fiber: "3.8", servingSize: "1 medium" },
    { name: "Quinoa (cooked)", calories: 222, protein: "8", carbs: "39", fat: "3.5", fiber: "5", servingSize: "1 cup" },
    { name: "Pasta (cooked)", calories: 220, protein: "8", carbs: "43", fat: "1.3", fiber: "2.5", servingSize: "1 cup" },
    { name: "Banana", calories: 89, protein: "1.1", carbs: "23", fat: "0.3", fiber: "2.6", servingSize: "1 medium" },
    { name: "Apple", calories: 52, protein: "0.3", carbs: "14", fat: "0.2", fiber: "2.4", servingSize: "1 medium" },
    { name: "Orange", calories: 62, protein: "1.2", carbs: "15", fat: "0.2", fiber: "3.1", servingSize: "1 medium" },
    { name: "Blueberries", calories: 84, protein: "1.1", carbs: "21", fat: "0.5", fiber: "3.6", servingSize: "1 cup" },
    { name: "Broccoli (steamed)", calories: 55, protein: "3.7", carbs: "11", fat: "0.6", fiber: "5.1", servingSize: "1 cup" },
    { name: "Spinach (raw)", calories: 7, protein: "0.9", carbs: "1.1", fat: "0.1", fiber: "0.7", servingSize: "1 cup" },
    { name: "Mixed Salad Greens", calories: 10, protein: "0.8", carbs: "1.5", fat: "0.2", fiber: "0.9", servingSize: "2 cups" },
    { name: "Avocado", calories: 160, protein: "2", carbs: "9", fat: "15", fiber: "7", servingSize: "100g" },
    { name: "Edamame", calories: 120, protein: "11", carbs: "9", fat: "5", fiber: "5", servingSize: "1 cup" },
    { name: "Almonds", calories: 164, protein: "6", carbs: "6", fat: "14", fiber: "3.5", servingSize: "28g / 1oz" },
    { name: "Peanut Butter", calories: 188, protein: "8", carbs: "6", fat: "16", fiber: "2", servingSize: "2 tbsp" },
    { name: "Olive Oil", calories: 119, protein: "0", carbs: "0", fat: "13.5", fiber: "0", servingSize: "1 tbsp" },
    { name: "Whole Milk", calories: 149, protein: "8", carbs: "12", fat: "8", fiber: "0", servingSize: "1 cup" },
    { name: "Cheddar Cheese", calories: 113, protein: "7", carbs: "0.4", fat: "9.3", fiber: "0", servingSize: "1 oz / 28g" },
    { name: "Grilled Chicken Salad", calories: 320, protein: "35", carbs: "15", fat: "12", fiber: "5", servingSize: "1 bowl" },
    { name: "Protein Smoothie", calories: 280, protein: "28", carbs: "30", fat: "5", fiber: "3", servingSize: "1 cup" },
    { name: "Egg White Omelette (3 eggs)", calories: 150, protein: "24", carbs: "2", fat: "2", fiber: "0.5", servingSize: "1 serving" },
    { name: "Chicken & Rice Bowl", calories: 450, protein: "40", carbs: "55", fat: "6", fiber: "2", servingSize: "1 bowl" },
    { name: "Salmon with Vegetables", calories: 380, protein: "35", carbs: "20", fat: "16", fiber: "6", servingSize: "1 serving" },
  ];

  for (const food of seedFoods) {
    await storage.createFood(food);
  }
}

// ============================================================
// GENERATE DAILY CHALLENGES
// ============================================================
const CHALLENGE_TEMPLATES = [
  { type: "workout", title: "Power Session", description: "Complete any strength workout today", xpReward: 100 },
  { type: "workout", title: "Cardio Blast", description: "Complete a cardio or HIIT workout", xpReward: 80 },
  { type: "workout", title: "Full Body", description: "Log a full body workout with 4+ exercises", xpReward: 120 },
  { type: "nutrition", title: "Protein Goal", description: "Hit your daily protein target", xpReward: 75 },
  { type: "nutrition", title: "Log 3 Meals", description: "Log breakfast, lunch, and dinner", xpReward: 60 },
  { type: "nutrition", title: "Clean Eating", description: "Stay within your calorie goal", xpReward: 80 },
  { type: "hydration", title: "Stay Hydrated", description: "Log at least 2000ml of water today", xpReward: 50 },
  { type: "hydration", title: "Morning Hydration", description: "Log 500ml of water before noon", xpReward: 30 },
  { type: "streak", title: "Keep It Going", description: "Maintain your workout streak", xpReward: 150 },
  { type: "streak", title: "Log Something", description: "Log any activity to keep your momentum", xpReward: 40 },
];

export async function generateDailyChallenges(userId: number): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await storage.getDailyChallenges(userId);
  const todayChallenges = existing.filter(c => {
    const d = new Date(c.date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === today.getTime();
  });

  if (todayChallenges.length >= 3) return;

  const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5).slice(0, 3);
  for (const t of shuffled) {
    await storage.createDailyChallenge({
      userId,
      ...t,
      date: new Date(),
    });
  }
}
