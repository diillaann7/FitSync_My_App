import { z } from 'zod';
import { 
  insertUserSchema, users,
  insertWorkoutSchema, workouts,
  insertExerciseSchema, exercises,
  insertFoodSchema, foods,
  insertMealLogSchema, mealLogs,
  insertBodyMetricsSchema, bodyMetrics
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register' as const,
      input: insertUserSchema,
      responses: {
        201: z.object({
          token: z.string(),
          user: z.custom<typeof users.$inferSelect>(),
        }),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login' as const,
      input: z.object({
        email: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.object({
          token: z.string(),
          user: z.custom<typeof users.$inferSelect>(),
        }),
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me' as const,
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    }
  },
  workouts: {
    list: {
      method: 'GET' as const,
      path: '/api/workouts' as const,
      responses: {
        200: z.array(z.custom<typeof workouts.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/workouts' as const,
      input: insertWorkoutSchema.omit({ userId: true, date: true }), // Server will inject user_id and date
      responses: {
        201: z.custom<typeof workouts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/workouts/:id' as const,
      responses: {
        200: z.object({
          workout: z.custom<typeof workouts.$inferSelect>(),
          exercises: z.array(z.custom<typeof exercises.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    }
  },
  exercises: {
    create: {
      method: 'POST' as const,
      path: '/api/exercises' as const,
      input: insertExerciseSchema,
      responses: {
        201: z.custom<typeof exercises.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  foods: {
    list: {
      method: 'GET' as const,
      path: '/api/foods' as const,
      input: z.object({ search: z.string().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof foods.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/foods' as const,
      input: insertFoodSchema,
      responses: {
        201: z.custom<typeof foods.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  mealLogs: {
    list: {
      method: 'GET' as const,
      path: '/api/meal-logs' as const,
      responses: {
        200: z.array(z.object({
          log: z.custom<typeof mealLogs.$inferSelect>(),
          food: z.custom<typeof foods.$inferSelect>(),
        })),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/meal-logs' as const,
      input: insertMealLogSchema.omit({ userId: true, date: true }),
      responses: {
        201: z.custom<typeof mealLogs.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  bodyMetrics: {
    list: {
      method: 'GET' as const,
      path: '/api/body-metrics' as const,
      responses: {
        200: z.array(z.custom<typeof bodyMetrics.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/body-metrics' as const,
      input: insertBodyMetricsSchema.omit({ userId: true, date: true }),
      responses: {
        201: z.custom<typeof bodyMetrics.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}