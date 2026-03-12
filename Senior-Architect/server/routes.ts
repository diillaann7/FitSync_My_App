import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import multer from "multer";
import { storage, seedFoodDatabase, generateDailyChallenges } from "./storage";
import { analyzeFoodPhoto, generateAIInsights } from "./openai";
import { z } from "zod";
import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.SESSION_SECRET || "fitsync_jwt_secret_2024";
const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID || "";
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "";
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || "";
const PAYPAL_API_BASE = process.env.PAYPAL_SANDBOX === "true"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

// Multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// XP rewards per action
const XP_REWARDS = {
  COMPLETE_WORKOUT: 150,
  LOG_MEAL: 10,
  LOG_WEIGHT: 20,
  SET_GOAL: 30,
  PR_BROKEN: 75,
};

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = scryptSync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = scryptSync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

interface AuthRequest extends Request { user?: { id: number } }

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.user = { id: decoded.userId };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requirePremium(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, async () => {
    const user = await storage.getUser(req.user!.id);
    if (!user?.isPremium) {
      return res.status(403).json({ message: "Premium subscription required", requiresPremium: true });
    }
    next();
  });
}

function sanitizeUser(user: any) {
  const { password, ...safe } = user;
  return safe;
}

// PayPal token cache
let paypalToken: { token: string; expires: number } | null = null;

async function getPayPalToken(): Promise<string> {
  if (paypalToken && Date.now() < paypalToken.expires) return paypalToken.token;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) throw new Error("PayPal not configured");

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  const data = await res.json() as any;
  paypalToken = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return data.access_token;
}

function generateWeeklyPlan(user: any, _goal: any): object {
  const fitnessGoal = user.fitnessGoal || "maintain_weight";

  const plans: Record<string, any> = {
    lose_weight: {
      theme: "Fat Burning & Cardio Focus",
      days: [
        { day: "Monday", focus: "HIIT Cardio", exercises: ["Jump Rope 3×3min", "Burpees 3×15", "Mountain Climbers 3×30", "Box Jumps 3×12"], duration: 40, rest: false },
        { day: "Tuesday", focus: "Upper Body Strength", exercises: ["Push-Ups 4×15", "Dumbbell Row 3×12", "Shoulder Press 3×10", "Tricep Dips 3×12"], duration: 45, rest: false },
        { day: "Wednesday", focus: "Active Recovery", exercises: ["30min Light Walk or Yoga", "Foam Rolling 10min", "Stretching 20min"], duration: 30, rest: true },
        { day: "Thursday", focus: "Lower Body + Core", exercises: ["Squats 4×15", "Lunges 3×12 each", "Glute Bridges 3×20", "Plank 3×60s"], duration: 45, rest: false },
        { day: "Friday", focus: "Cardio & Core", exercises: ["Treadmill 20min moderate", "Bicycle Crunches 3×20", "Leg Raises 3×15", "Russian Twists 3×20"], duration: 40, rest: false },
        { day: "Saturday", focus: "Full Body Circuit", exercises: ["Kettlebell Swings 3×15", "Pull-Ups 3×8", "Goblet Squats 3×12", "Plank 3×45s"], duration: 50, rest: false },
        { day: "Sunday", focus: "Rest & Recovery", exercises: ["Light walking", "Meditation or yoga", "Meal prep for the week"], duration: 0, rest: true },
      ]
    },
    gain_muscle: {
      theme: "Hypertrophy & Strength",
      days: [
        { day: "Monday", focus: "Chest & Triceps", exercises: ["Bench Press 4×8", "Incline DB Press 3×10", "Cable Flyes 3×12", "Tricep Pushdown 4×12", "Skull Crushers 3×10"], duration: 60, rest: false },
        { day: "Tuesday", focus: "Back & Biceps", exercises: ["Deadlift 4×5", "Barbell Row 4×8", "Lat Pulldown 3×10", "Barbell Curl 4×10", "Hammer Curl 3×12"], duration: 60, rest: false },
        { day: "Wednesday", focus: "Active Recovery", exercises: ["Light cardio 20min", "Foam rolling", "Mobility work"], duration: 30, rest: true },
        { day: "Thursday", focus: "Shoulders & Abs", exercises: ["OHP 4×8", "Lateral Raises 4×15", "Face Pulls 3×15", "Plank 3×60s", "Leg Raises 3×15"], duration: 55, rest: false },
        { day: "Friday", focus: "Legs (Quad Focus)", exercises: ["Squat 5×5", "Leg Press 4×10", "Walking Lunges 3×12", "Leg Extension 3×15", "Calf Raises 4×20"], duration: 65, rest: false },
        { day: "Saturday", focus: "Arms & Weak Points", exercises: ["Preacher Curl 4×10", "Incline DB Curl 3×12", "Close Grip Bench 4×10", "Cable Curl 3×12"], duration: 45, rest: false },
        { day: "Sunday", focus: "Rest", exercises: ["Complete rest", "High protein meal prep", "Sleep 8+ hours"], duration: 0, rest: true },
      ]
    },
    maintain_weight: {
      theme: "Balanced Fitness",
      days: [
        { day: "Monday", focus: "Full Body Strength", exercises: ["Squat 3×10", "Push-Ups 3×12", "Deadlift 3×8", "Row 3×10"], duration: 45, rest: false },
        { day: "Tuesday", focus: "Cardio", exercises: ["30min Run or Bike", "Core circuit 15min"], duration: 45, rest: false },
        { day: "Wednesday", focus: "Rest or Yoga", exercises: ["Yoga 30min", "Stretching"], duration: 30, rest: true },
        { day: "Thursday", focus: "Upper Body", exercises: ["DB Press 3×10", "Pull-Ups 3×8", "Shoulder Press 3×10", "Curls 3×12"], duration: 40, rest: false },
        { day: "Friday", focus: "Lower Body", exercises: ["Squat 4×10", "Romanian DL 3×10", "Calf Raises 4×15", "Plank 3×45s"], duration: 45, rest: false },
        { day: "Saturday", focus: "Active Recreation", exercises: ["Sport, hiking, or swimming", "Any activity you enjoy"], duration: 60, rest: false },
        { day: "Sunday", focus: "Rest", exercises: ["Rest and recover"], duration: 0, rest: true },
      ]
    },
    improve_fitness: {
      theme: "Endurance & Performance",
      days: [
        { day: "Monday", focus: "Interval Running", exercises: ["Warm up 5min", "8×400m intervals", "Cool down 5min stretch"], duration: 40, rest: false },
        { day: "Tuesday", focus: "Strength Circuit", exercises: ["5 rounds: Squat×10, Push-up×15, Row×10, Plank×30s"], duration: 45, rest: false },
        { day: "Wednesday", focus: "Active Recovery", exercises: ["Easy 20min jog", "Yoga 20min"], duration: 40, rest: true },
        { day: "Thursday", focus: "HIIT + Core", exercises: ["Tabata 4 rounds", "Core circuit 20min"], duration: 45, rest: false },
        { day: "Friday", focus: "Long Steady Cardio", exercises: ["45-60min steady state run, bike, or swim"], duration: 55, rest: false },
        { day: "Saturday", focus: "Functional Strength", exercises: ["Kettlebell circuit", "TRX or bodyweight", "Olympic lifts"], duration: 50, rest: false },
        { day: "Sunday", focus: "Rest", exercises: ["Complete rest", "Foam rolling"], duration: 0, rest: true },
      ]
    }
  };

  return plans[fitnessGoal] || plans["maintain_weight"];
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await seedFoodDatabase();

  // ===========================
  // AUTH
  // ===========================
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;
      if (!name || !email || !password) return res.status(400).json({ message: "Name, email, and password are required" });
      if (await storage.getUserByEmail(email)) return res.status(400).json({ message: "Email already registered" });
      const user = await storage.createUser({
        name, email,
        password: hashPassword(password),
        fitnessGoal: "maintain_weight",
        activityLevel: "moderately_active",
        xp: 0,
        level: 1,
        isPremium: false,
      } as any);
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
      res.status(201).json({ token, user: sanitizeUser(user) });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ message: "Email and password required" });
      const user = await storage.getUserByEmail(email);
      if (!user || !comparePasswords(password, user.password)) return res.status(401).json({ message: "Invalid email or password" });
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "30d" });
      res.json({ token, user: sanitizeUser(user) });
    } catch (err) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json(sanitizeUser(user));
  });

  app.patch("/api/auth/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, age, gender, height, weight, fitnessGoal, activityLevel } = req.body;
      const updates: any = {};
      if (name) updates.name = name;
      if (age !== undefined) updates.age = age ? Number(age) : null;
      if (gender !== undefined) updates.gender = gender || null;
      if (height !== undefined) updates.height = height ? String(height) : null;
      if (weight !== undefined) updates.weight = weight ? String(weight) : null;
      if (fitnessGoal) updates.fitnessGoal = fitnessGoal;
      if (activityLevel) updates.activityLevel = activityLevel;
      const user = await storage.updateUser(req.user!.id, updates);
      res.json(sanitizeUser(user));
    } catch (err) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  // ===========================
  // WORKOUTS — full CRUD
  // ===========================
  app.get("/api/workouts", requireAuth, async (req: AuthRequest, res) => {
    res.json(await storage.getWorkouts(req.user!.id));
  });

  app.post("/api/workouts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, category, notes } = req.body;
      if (!name) return res.status(400).json({ message: "Name required" });
      const workout = await storage.createWorkout({
        name, category: category || "strength", notes, userId: req.user!.id,
        date: new Date(), completed: false, xpEarned: 0,
      });
      res.status(201).json(workout);
    } catch (err) {
      res.status(500).json({ message: "Failed to create workout" });
    }
  });

  app.get("/api/workouts/:id", requireAuth, async (req: AuthRequest, res) => {
    const workout = await storage.getWorkout(Number(req.params.id));
    if (!workout || workout.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
    const exerciseList = await storage.getExercises(workout.id);
    res.json({ workout, exercises: exerciseList });
  });

  app.patch("/api/workouts/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const workout = await storage.getWorkout(Number(req.params.id));
      if (!workout || workout.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
      const { name, category, notes } = req.body;
      const updates: any = {};
      if (name) updates.name = name;
      if (category) updates.category = category;
      if (notes !== undefined) updates.notes = notes;
      const updated = await storage.updateWorkout(workout.id, updates);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update workout" });
    }
  });

  app.delete("/api/workouts/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const workout = await storage.getWorkout(Number(req.params.id));
      if (!workout || workout.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });
      await storage.deleteWorkout(workout.id);
      res.json({ message: "Workout deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete workout" });
    }
  });

  app.post("/api/workouts/:id/complete", requireAuth, async (req: AuthRequest, res) => {
    try {
      const workout = await storage.getWorkout(Number(req.params.id));
      if (!workout || workout.userId !== req.user!.id) return res.status(404).json({ message: "Not found" });

      const { durationMinutes = 30, totalVolume = 0 } = req.body;
      const xpEarned = XP_REWARDS.COMPLETE_WORKOUT + Math.floor(totalVolume / 1000) * 10;

      const completed = await storage.completeWorkout(workout.id, { durationMinutes, totalVolume, xpEarned });
      const updatedUser = await storage.addXp(req.user!.id, xpEarned);

      const exerciseList = await storage.getExercises(workout.id);
      let prsBroken = 0;
      for (const ex of exerciseList) {
        if (Number(ex.weight) > 0) {
          const pr = await storage.upsertPersonalRecord({
            userId: req.user!.id,
            exerciseName: ex.name,
            weight: ex.weight,
            reps: ex.reps,
            sets: ex.sets,
          });
          if (new Date(pr.date).getTime() > Date.now() - 5000) prsBroken++;
        }
      }

      if (prsBroken > 0) {
        await storage.addXp(req.user!.id, prsBroken * XP_REWARDS.PR_BROKEN);
      }

      res.json({ workout: completed, user: sanitizeUser(updatedUser), xpEarned, prsBroken });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to complete workout" });
    }
  });

  // ===========================
  // EXERCISES — full CRUD
  // ===========================
  app.post("/api/exercises", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { workoutId, name, sets, reps, weight, notes } = req.body;
      if (!workoutId || !name) return res.status(400).json({ message: "workoutId and name required" });
      const workout = await storage.getWorkout(Number(workoutId));
      if (!workout || workout.userId !== req.user!.id) return res.status(404).json({ message: "Workout not found" });
      const exercise = await storage.createExercise({
        workoutId: Number(workoutId), name,
        sets: Number(sets) || 3, reps: Number(reps) || 10,
        weight: String(weight || "0"), notes,
      });
      res.status(201).json(exercise);
    } catch (err) {
      res.status(500).json({ message: "Failed to add exercise" });
    }
  });

  app.patch("/api/exercises/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const updates: any = {};
      const { completedSets, name, sets, reps, weight, notes } = req.body;
      if (completedSets !== undefined) updates.completedSets = Number(completedSets);
      if (name) updates.name = name;
      if (sets !== undefined) updates.sets = Number(sets);
      if (reps !== undefined) updates.reps = Number(reps);
      if (weight !== undefined) updates.weight = String(weight);
      if (notes !== undefined) updates.notes = notes;
      const updated = await storage.updateExercise(Number(req.params.id), updates);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update exercise" });
    }
  });

  app.delete("/api/exercises/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.deleteExercise(Number(req.params.id));
      res.json({ message: "Exercise deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete exercise" });
    }
  });

  // ===========================
  // FOODS
  // ===========================
  app.get("/api/foods", requireAuth, async (req, res) => {
    res.json(await storage.getFoods(req.query.search as string));
  });

  app.post("/api/foods", requireAuth, async (req, res) => {
    try {
      const { name, calories, protein, carbs, fat, fiber, servingSize } = req.body;
      if (!name || !calories) return res.status(400).json({ message: "Name and calories required" });
      const food = await storage.createFood({
        name, calories: Number(calories),
        protein: String(protein || "0"), carbs: String(carbs || "0"),
        fat: String(fat || "0"), fiber: fiber ? String(fiber) : undefined,
        servingSize: servingSize || "100g", isCustom: true,
      });
      res.status(201).json(food);
    } catch (err) {
      res.status(500).json({ message: "Failed" });
    }
  });

  // ===========================
  // MEAL LOGS — full CRUD
  // ===========================
  app.get("/api/meal-logs", requireAuth, async (req: AuthRequest, res) => {
    res.json(await storage.getMealLogs(req.user!.id));
  });

  app.post("/api/meal-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { foodId, quantity, mealType } = req.body;
      if (!foodId) return res.status(400).json({ message: "foodId required" });
      const log = await storage.createMealLog({
        userId: req.user!.id, foodId: Number(foodId),
        quantity: String(quantity || "1"), mealType: mealType || "lunch", date: new Date(),
      });
      await storage.addXp(req.user!.id, XP_REWARDS.LOG_MEAL);
      res.status(201).json(log);
    } catch (err) {
      res.status(500).json({ message: "Failed" });
    }
  });

  app.patch("/api/meal-logs/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { quantity, mealType } = req.body;
      const updates: any = {};
      if (quantity !== undefined) updates.quantity = String(quantity);
      if (mealType) updates.mealType = mealType;
      const updated = await storage.updateMealLog(Number(req.params.id), updates);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update meal log" });
    }
  });

  app.delete("/api/meal-logs/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.deleteMealLog(Number(req.params.id));
      res.json({ message: "Meal log deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete meal log" });
    }
  });

  // ===========================
  // BODY METRICS — full CRUD
  // ===========================
  app.get("/api/body-metrics", requireAuth, async (req: AuthRequest, res) => {
    res.json(await storage.getBodyMetrics(req.user!.id));
  });

  app.post("/api/body-metrics", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { weight, bodyFat, muscleMass, waist, chest, arms, legs } = req.body;
      if (!weight) return res.status(400).json({ message: "Weight required" });
      const metrics = await storage.createBodyMetrics({
        userId: req.user!.id, weight: String(weight),
        bodyFat: bodyFat ? String(bodyFat) : undefined,
        muscleMass: muscleMass ? String(muscleMass) : undefined,
        waist: waist ? String(waist) : undefined,
        chest: chest ? String(chest) : undefined,
        arms: arms ? String(arms) : undefined,
        legs: legs ? String(legs) : undefined,
        date: new Date(),
      });
      await storage.addXp(req.user!.id, XP_REWARDS.LOG_WEIGHT);
      res.status(201).json(metrics);
    } catch (err) {
      res.status(500).json({ message: "Failed" });
    }
  });

  app.patch("/api/body-metrics/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { weight, bodyFat, muscleMass, waist, chest, arms, legs } = req.body;
      const updates: any = {};
      if (weight) updates.weight = String(weight);
      if (bodyFat !== undefined) updates.bodyFat = bodyFat ? String(bodyFat) : null;
      if (muscleMass !== undefined) updates.muscleMass = muscleMass ? String(muscleMass) : null;
      if (waist !== undefined) updates.waist = waist ? String(waist) : null;
      if (chest !== undefined) updates.chest = chest ? String(chest) : null;
      if (arms !== undefined) updates.arms = arms ? String(arms) : null;
      if (legs !== undefined) updates.legs = legs ? String(legs) : null;
      const updated = await storage.updateBodyMetrics(Number(req.params.id), updates);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Failed to update metrics" });
    }
  });

  app.delete("/api/body-metrics/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.deleteBodyMetrics(Number(req.params.id));
      res.json({ message: "Metrics deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete metrics" });
    }
  });

  // ===========================
  // GOALS
  // ===========================
  app.get("/api/goals", requireAuth, async (req: AuthRequest, res) => {
    res.json((await storage.getGoal(req.user!.id)) || null);
  });

  app.post("/api/goals", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { calorieTarget, proteinTarget, carbTarget, fatTarget, weightGoal, workoutsPerWeek } = req.body;
      if (!calorieTarget) return res.status(400).json({ message: "calorieTarget required" });
      const goal = await storage.upsertGoal({
        userId: req.user!.id,
        calorieTarget: Number(calorieTarget),
        proteinTarget: Number(proteinTarget || 150),
        carbTarget: Number(carbTarget || 200),
        fatTarget: Number(fatTarget || 65),
        weightGoal: weightGoal ? String(weightGoal) : undefined,
        workoutsPerWeek: Number(workoutsPerWeek || 4),
      });
      await storage.addXp(req.user!.id, XP_REWARDS.SET_GOAL);
      res.json(goal);
    } catch (err) {
      res.status(500).json({ message: "Failed" });
    }
  });

  // ===========================
  // PERSONAL RECORDS
  // ===========================
  app.get("/api/personal-records", requireAuth, async (req: AuthRequest, res) => {
    res.json(await storage.getPersonalRecords(req.user!.id));
  });

  // ===========================
  // WATER LOGS
  // ===========================
  app.get("/api/water-logs", requireAuth, async (req: AuthRequest, res) => {
    res.json(await storage.getWaterLogs(req.user!.id));
  });

  app.post("/api/water-logs", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { amount } = req.body;
      if (!amount) return res.status(400).json({ message: "amount required" });
      const log = await storage.createWaterLog({ userId: req.user!.id, amount: Number(amount), date: new Date() });
      res.status(201).json(log);
    } catch (err) {
      res.status(500).json({ message: "Failed" });
    }
  });

  app.delete("/api/water-logs/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      await storage.deleteWaterLog(Number(req.params.id));
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed" });
    }
  });

  // ===========================
  // DAILY CHALLENGES
  // ===========================
  app.get("/api/daily-challenges", requireAuth, async (req: AuthRequest, res) => {
    await generateDailyChallenges(req.user!.id);
    const all = await storage.getDailyChallenges(req.user!.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayChallenges = all.filter(c => {
      const d = new Date(c.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    res.json(todayChallenges);
  });

  app.post("/api/daily-challenges/:id/complete", requireAuth, async (req: AuthRequest, res) => {
    try {
      const challenge = await storage.completeChallenge(Number(req.params.id), req.user!.id);
      if (challenge.completed) {
        await storage.addXp(req.user!.id, challenge.xpReward);
      }
      const user = await storage.getUser(req.user!.id);
      res.json({ challenge, user: sanitizeUser(user!) });
    } catch (err) {
      res.status(500).json({ message: "Failed" });
    }
  });

  // ===========================
  // LEADERBOARD
  // ===========================
  app.get("/api/leaderboard", requireAuth, async (_req, res) => {
    res.json(await storage.getLeaderboard());
  });

  // ===========================
  // WEEKLY PLAN (AI)
  // ===========================
  app.get("/api/weekly-plan", requireAuth, async (req: AuthRequest, res) => {
    const user = await storage.getUser(req.user!.id);
    const goal = await storage.getGoal(req.user!.id);
    const plan = generateWeeklyPlan(user, goal);
    res.json(plan);
  });

  // ===========================
  // ANALYTICS SUMMARY
  // ===========================
  app.get("/api/analytics/summary", requireAuth, async (req: AuthRequest, res) => {
    const workoutList = await storage.getWorkouts(req.user!.id);
    const mealLogsList = await storage.getMealLogs(req.user!.id);
    const metricsList = await storage.getBodyMetrics(req.user!.id);
    const prs = await storage.getPersonalRecords(req.user!.id);
    res.json({
      totalWorkouts: workoutList.length,
      completedWorkouts: workoutList.filter(w => w.completed).length,
      totalMealLogs: mealLogsList.length,
      totalMetricLogs: metricsList.length,
      totalPRs: prs.length,
    });
  });

  // ===========================
  // AI FOOD PHOTO ANALYSIS (Premium)
  // ===========================
  app.post("/api/ai/analyze-food", requireAuth, upload.single("photo"), async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user?.isPremium) {
        return res.status(403).json({ message: "Premium subscription required", requiresPremium: true });
      }

      if (!req.file) return res.status(400).json({ message: "Photo required" });

      const imageBase64 = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype;

      const analysis = await analyzeFoodPhoto(imageBase64, mimeType);
      res.json(analysis);
    } catch (err: any) {
      console.error("AI food analysis error:", err);
      res.status(500).json({ message: err.message || "Analysis failed" });
    }
  });

  // ===========================
  // AI INSIGHTS (Premium)
  // ===========================
  app.get("/api/ai/insights", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user?.isPremium) {
        return res.status(403).json({ message: "Premium required", requiresPremium: true });
      }

      const workouts = await storage.getWorkouts(req.user!.id);
      const mealLogs = await storage.getMealLogs(req.user!.id);
      const goal = await storage.getGoal(req.user!.id);
      const recentWorkouts = workouts.filter(w => w.completed && new Date(w.date) > new Date(Date.now() - 7 * 24 * 3600000)).length;

      const totalCalories = mealLogs.slice(0, 10).reduce((sum, { food, log }) => {
        return sum + food.calories * Number(log.quantity);
      }, 0);
      const avgCalories = mealLogs.length > 0 ? Math.round(totalCalories / Math.min(mealLogs.length, 7)) : 0;

      const totalProtein = mealLogs.slice(0, 10).reduce((sum, { food, log }) => {
        return sum + Number(food.protein) * Number(log.quantity);
      }, 0);
      const avgProtein = mealLogs.length > 0 ? Math.round(totalProtein / Math.min(mealLogs.length, 7)) : 0;

      const insights = await generateAIInsights({
        recentWorkouts,
        avgCalories,
        proteinTarget: goal?.proteinTarget || 150,
        avgProtein,
        level: user.level,
      });

      res.json({ insights });
    } catch (err: any) {
      console.error("AI insights error:", err);
      res.status(500).json({ message: err.message || "Failed to generate insights" });
    }
  });

  // ===========================
  // PAYPAL — Get client ID
  // ===========================
  app.get("/api/paypal/client-id", requireAuth, (_req, res) => {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    if (!clientId) return res.status(503).json({ message: "PayPal not configured" });
    res.json({ clientId, sandbox: process.env.PAYPAL_SANDBOX === "true" });
  });

  // ===========================
  // PAYPAL — Create subscription
  // ===========================
  app.post("/api/paypal/create-subscription", requireAuth, async (req: AuthRequest, res) => {
    try {
      const token = await getPayPalToken();
      const planId = process.env.PAYPAL_PLAN_ID;
      if (!planId) return res.status(503).json({ message: "PayPal plan not configured" });

      const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan_id: planId,
          subscriber: {
            name: { given_name: req.body.givenName || "FitSync", surname: req.body.surname || "User" },
            email_address: req.body.email,
          },
          application_context: {
            return_url: `${process.env.APP_URL || "http://localhost:5000"}/premium?success=true`,
            cancel_url: `${process.env.APP_URL || "http://localhost:5000"}/premium?cancelled=true`,
          },
        }),
      });

      const data = await response.json() as any;
      res.json(data);
    } catch (err: any) {
      console.error("PayPal subscription error:", err);
      res.status(500).json({ message: err.message || "Failed to create subscription" });
    }
  });

  // ===========================
  // PAYPAL — Webhook handler
  // ===========================
  app.post("/api/paypal/webhook", async (req, res) => {
    try {
      const eventType = req.body?.event_type;
      const resource = req.body?.resource;

      console.log(`PayPal webhook received: ${eventType}`);

      if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" || eventType === "PAYMENT.SALE.COMPLETED") {
        const subscriptionId = resource?.id || resource?.billing_agreement_id;
        const payerEmail = resource?.subscriber?.email_address || resource?.payer?.payer_info?.email;

        if (payerEmail) {
          const user = await storage.getUserByEmail(payerEmail);
          if (user) {
            await storage.updateUser(user.id, {
              isPremium: true,
              subscriptionId: subscriptionId || null,
            });
            console.log(`User ${user.id} upgraded to premium via PayPal`);
          }
        }
      }

      if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" || eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
        const subscriptionId = resource?.id;
        if (subscriptionId) {
          const allUsers = await storage.getLeaderboard();
          // In production, you'd query by subscriptionId; for now log it
          console.log(`Subscription cancelled/expired: ${subscriptionId}`);
        }
      }

      res.json({ received: true });
    } catch (err) {
      console.error("PayPal webhook error:", err);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });

  // ===========================
  // PAYPAL — Verify subscription (frontend callback)
  // ===========================
  app.post("/api/paypal/verify-subscription", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { subscriptionId } = req.body;
      if (!subscriptionId) return res.status(400).json({ message: "subscriptionId required" });

      if (PAYPAL_CLIENT_ID && PAYPAL_SECRET) {
        const token = await getPayPalToken();
        const response = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`, {
          headers: { "Authorization": `Bearer ${token}` },
        });
        const data = await response.json() as any;

        if (data.status === "ACTIVE") {
          await storage.updateUser(req.user!.id, { isPremium: true, subscriptionId });
          const user = await storage.getUser(req.user!.id);
          return res.json({ success: true, user: sanitizeUser(user!) });
        }
        return res.status(400).json({ message: "Subscription not active" });
      }

      // Dev mode: directly activate premium
      await storage.updateUser(req.user!.id, { isPremium: true, subscriptionId });
      const user = await storage.getUser(req.user!.id);
      res.json({ success: true, user: sanitizeUser(user!) });
    } catch (err: any) {
      console.error("Verify subscription error:", err);
      res.status(500).json({ message: err.message || "Verification failed" });
    }
  });

  return httpServer;
}
