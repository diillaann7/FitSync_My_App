import { pgTable, text, serial, integer, timestamp, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// USERS
// ============================================================
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  age: integer("age"),
  height: numeric("height"),
  weight: numeric("weight"),
  gender: text("gender"), // 'male', 'female', 'other'
  fitnessGoal: text("fitness_goal").default("maintain"),
  activityLevel: text("activity_level").default("moderate"),
  // Gamification
  xp: integer("xp").default(0).notNull(),
  level: integer("level").default(1).notNull(),
  // Premium
  isPremium: boolean("is_premium").default(false).notNull(),
  subscriptionId: text("subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// WORKOUTS
// ============================================================
export const workouts = pgTable("workouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").default("strength"),
  durationMinutes: integer("duration_minutes"),
  notes: text("notes"),
  completed: boolean("completed").default(false),
  totalVolume: numeric("total_volume"),
  xpEarned: integer("xp_earned").default(0),
  date: timestamp("date").notNull().defaultNow(),
});

// ============================================================
// EXERCISES
// ============================================================
export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  workoutId: integer("workout_id").notNull(),
  name: text("name").notNull(),
  sets: integer("sets").notNull(),
  reps: integer("reps").notNull(),
  weight: numeric("weight").notNull(),
  completedSets: integer("completed_sets").default(0),
  notes: text("notes"),
});

// ============================================================
// PERSONAL RECORDS
// ============================================================
export const personalRecords = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  exerciseName: text("exercise_name").notNull(),
  weight: numeric("weight").notNull(),
  reps: integer("reps").notNull(),
  sets: integer("sets").notNull(),
  date: timestamp("date").notNull().defaultNow(),
});

// ============================================================
// FOODS
// ============================================================
export const foods = pgTable("foods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  calories: integer("calories").notNull(),
  protein: numeric("protein").notNull(),
  carbs: numeric("carbs").notNull(),
  fat: numeric("fat").notNull(),
  fiber: numeric("fiber"),
  servingSize: text("serving_size").default("100g"),
  isCustom: boolean("is_custom").default(false),
});

// ============================================================
// MEAL LOGS
// ============================================================
export const mealLogs = pgTable("meal_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  foodId: integer("food_id").notNull(),
  quantity: numeric("quantity").notNull(),
  mealType: text("meal_type").default("lunch"),
  date: timestamp("date").notNull().defaultNow(),
});

// ============================================================
// BODY METRICS
// ============================================================
export const bodyMetrics = pgTable("body_metrics", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weight: numeric("weight").notNull(),
  bodyFat: numeric("body_fat"),
  muscleMass: numeric("muscle_mass"),
  waist: numeric("waist"),
  chest: numeric("chest"),
  arms: numeric("arms"),
  legs: numeric("legs"),
  date: timestamp("date").notNull().defaultNow(),
});

// ============================================================
// GOALS
// ============================================================
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  calorieTarget: integer("calorie_target").notNull(),
  proteinTarget: integer("protein_target").notNull(),
  carbTarget: integer("carb_target").notNull(),
  fatTarget: integer("fat_target").notNull(),
  weightGoal: numeric("weight_goal"),
  workoutsPerWeek: integer("workouts_per_week").default(4),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// WATER LOGS
// ============================================================
export const waterLogs = pgTable("water_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // ml
  date: timestamp("date").notNull().defaultNow(),
});

// ============================================================
// DAILY CHALLENGES
// ============================================================
export const dailyChallenges = pgTable("daily_challenges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  xpReward: integer("xp_reward").notNull(),
  completed: boolean("completed").default(false),
  date: timestamp("date").notNull().defaultNow(),
});

// ============================================================
// WEEKLY PLANS
// ============================================================
export const weeklyPlans = pgTable("weekly_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  weekStart: timestamp("week_start").notNull(),
  plan: text("plan").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// INSERT SCHEMAS
// ============================================================
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertWorkoutSchema = createInsertSchema(workouts).omit({ id: true });
export const insertExerciseSchema = createInsertSchema(exercises).omit({ id: true });
export const insertFoodSchema = createInsertSchema(foods).omit({ id: true });
export const insertMealLogSchema = createInsertSchema(mealLogs).omit({ id: true });
export const insertBodyMetricsSchema = createInsertSchema(bodyMetrics).omit({ id: true });
export const insertGoalSchema = createInsertSchema(goals).omit({ id: true, updatedAt: true });
export const insertPersonalRecordSchema = createInsertSchema(personalRecords).omit({ id: true });
export const insertWaterLogSchema = createInsertSchema(waterLogs).omit({ id: true });
export const insertDailyChallengeSchema = createInsertSchema(dailyChallenges).omit({ id: true });
export const insertWeeklyPlanSchema = createInsertSchema(weeklyPlans).omit({ id: true });

// ============================================================
// TYPES
// ============================================================
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Food = typeof foods.$inferSelect;
export type InsertFood = z.infer<typeof insertFoodSchema>;
export type MealLog = typeof mealLogs.$inferSelect;
export type InsertMealLog = z.infer<typeof insertMealLogSchema>;
export type BodyMetrics = typeof bodyMetrics.$inferSelect;
export type InsertBodyMetrics = z.infer<typeof insertBodyMetricsSchema>;
export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;
export type PersonalRecord = typeof personalRecords.$inferSelect;
export type InsertPersonalRecord = z.infer<typeof insertPersonalRecordSchema>;
export type WaterLog = typeof waterLogs.$inferSelect;
export type InsertWaterLog = z.infer<typeof insertWaterLogSchema>;
export type DailyChallenge = typeof dailyChallenges.$inferSelect;
export type InsertDailyChallenge = z.infer<typeof insertDailyChallengeSchema>;
export type WeeklyPlan = typeof weeklyPlans.$inferSelect;
export type InsertWeeklyPlan = z.infer<typeof insertWeeklyPlanSchema>;
