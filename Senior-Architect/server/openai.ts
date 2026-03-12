import OpenAI from "openai";

function getOpenAIClient() {
  return new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "dummy",
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
}

export interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  servingSize: string;
  confidence: "high" | "medium" | "low";
  description: string;
}

export async function analyzeFoodPhoto(imageBase64: string, mimeType: string): Promise<FoodAnalysis> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a professional nutritionist AI. When given a food photo, analyze it and provide accurate nutritional estimates. Always respond with valid JSON only, no markdown.`,
      },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: `Analyze this food photo and provide nutritional information. Return ONLY valid JSON with this exact structure:
{
  "name": "food name",
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "servingSize": "estimated serving size",
  "confidence": "high|medium|low",
  "description": "brief description of what you see"
}
All macros in grams. Estimate for the portion shown in the image.`,
          },
        ],
      },
    ],
    max_tokens: 500,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) throw new Error("No response from AI");

  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as FoodAnalysis;
  } catch {
    throw new Error("Failed to parse AI response");
  }
}

export async function generateAIInsights(userData: {
  recentWorkouts: number;
  avgCalories: number;
  proteinTarget: number;
  avgProtein: number;
  currentWeight?: number;
  weightGoal?: number;
  level: number;
}): Promise<string[]> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: "You are a personal fitness coach AI. Provide 3 concise, actionable insights based on user data. Return JSON array of strings only.",
      },
      {
        role: "user",
        content: `User stats: ${JSON.stringify(userData)}. Give 3 short coaching insights (max 15 words each). Return only a JSON array of 3 strings.`,
      },
    ],
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content?.trim() || "[]";
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return [
      "Keep up the great work on your fitness journey!",
      "Consistency is key — log your meals daily for best results.",
      "Rest and recovery are just as important as training.",
    ];
  }
}
