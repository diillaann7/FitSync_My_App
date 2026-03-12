# FitSync — Fitness Tracking App

## Overview
World-class full-stack fitness tracking app built with React + Express + PostgreSQL + JWT auth.

## Tech Stack
- **Frontend**: React, Vite, TailwindCSS, shadcn/ui, Recharts, TanStack Query v5
- **Backend**: Express.js, Drizzle ORM, PostgreSQL, JWT auth
- **State**: TanStack Query with auth-aware queryClient (injects Bearer tokens)
- **Routing**: Wouter (client-side)
- **AI**: OpenAI (Replit AI integration) for AI insights, food photo analysis, weekly plans
- **Analytics**: Google Analytics GA4 (G-70FETQ4VR8) with SPA page tracking
- **Payments**: PayPal subscriptions (€9.99/month) for Premium tier

## Key Features
- JWT Authentication (register/login, 30-day tokens)
- Workout tracking with active session mode, rest timer, set tracking (full CRUD: edit/delete)
- Exercise library (33 pre-built exercises)
- Nutrition logging with macro rings and food database (38+ foods) (full CRUD: delete meals)
- AI Food Scanner — upload a photo to detect macros via OpenAI Vision (Premium feature)
- Water intake tracker (per-day logging, ml)
- Body metrics tracking (weight, body fat, measurements) (full CRUD: edit/delete in history)
- Goals & TDEE calculator
- Personal Records board (auto-updated on workout completion)
- Daily Challenges with XP rewards (auto-generated 3/day)
- Leaderboard (ranked by XP)
- AI-generated Weekly Training Plan (based on fitness goal)
- Gamification: XP/Level system (500 XP/level), displayed in sidebar
- Dark mode toggle (persisted in localStorage)
- Analytics with 30-day trends
- Profile management
- Premium subscription page with PayPal CTA and feature showcase

## Premium (isPremium flag on users)
- AI Food Scanner (photo → macro detection via OpenAI Vision)
- AI Coach Chat (unlimited messages)
- Advanced Analytics
- Priority Support
- Payment: PayPal subscriptions webhook at /api/paypal/webhook
- Requires env vars: PAYPAL_CLIENT_ID, PAYPAL_SECRET, PAYPAL_PLAN_ID (PAYPAL_SANDBOX=true for dev)

## XP Rewards
- Complete workout: +150 XP + volume bonus
- Log meal: +10 XP
- Log weight: +20 XP
- Set goal: +30 XP
- Break PR: +75 XP each
- Complete challenge: XP from challenge (30-150 XP)

## Pages & Routes
- `/dashboard` — Overview, calorie ring, AI insights, daily challenges, weight chart
- `/workouts` — Workout list (edit/delete CRUD), create workout
- `/workouts/:id` — Active workout session with rest timer
- `/nutrition` — Meal logging, macro rings, water tracker, AI Food Scanner
- `/metrics` — Body composition tracking and charts (edit/delete in history)
- `/analytics` — 30-day trends
- `/goals` — TDEE calculator, macro targets
- `/profile` — Account settings, BMI calculator
- `/personal-records` — All-time best lifts
- `/leaderboard` — Global XP ranking
- `/weekly-plan` — AI training plan (7 days, goal-based)
- `/premium` — Premium subscription page with PayPal integration

## Auth
- JWT in localStorage as `auth_token`
- Sent as `Authorization: Bearer <token>`
- queryClient auto-injects token; returns `null` on 401
- ProtectedRoute redirects unauthenticated users to /auth

## Design
- Primary: green `hsl(158 64% 42%)`
- Dark sidebar (`hsl(222 25% 10%)`)
- Dark mode: full `.dark` class support
- Responsive: mobile sidebar trigger shown on small screens

## Database Schema
Tables: users (with isPremium, subscriptionId), workouts, exercises, foods, meal_logs, body_metrics, goals, personal_records, water_logs, daily_challenges, weekly_plans

## AI Integration
- Uses Replit AI integration (OpenAI): env vars AI_INTEGRATIONS_OPENAI_API_KEY + AI_INTEGRATIONS_OPENAI_BASE_URL
- server/openai.ts: analyzeFood(imageBase64) → macros, generateInsights(), generateWeeklyPlan()
- Food photo endpoint: POST /api/nutrition/analyze-food (multipart, Premium gated)
- Insights endpoint: POST /api/ai/insights

## Running
`npm run dev` — starts Express backend on port 5000 + Vite frontend (proxied)
