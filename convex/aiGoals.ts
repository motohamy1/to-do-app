import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Seed Template Definitions for Goals
 */
export const SEED_TEMPLATES = [
  {
    templateId: "life_pillars",
    name: "Life Pillars & Balance",
    nameAr: "ركائز الحياة والتوازن",
    description: "Holistic monthly growth across career, health, mind, and personal wealth.",
    descriptionAr: "نمو متوازن وشامل يشمل المسار المهني، الصحة، الفكر، والمالية الشخصية.",
    icon: "layers-outline",
    badge: "Popular",
    badgeAr: "الأكثر اختياراً",
    bg: "#EDE8DB",
    ink: "#1E1B18",
    accent: "#EA580C",
    accentSecondary: "#C2410C",
    color: "#EA580C",
    gradientColors: ["#EDE8DB", "#EA580C"],
    artType: "halfCircles",
    order: 1,
    isDefault: true,
    categories: [
      {
        id: "career_tech",
        title: "Career & Projects",
        titleAr: "العمل والمشاريع",
        icon: "briefcase-outline",
        color: "#2563EB",
        description: "Core career milestones, shipped deliverables, and technical execution.",
        descriptionAr: "أهم الإنجازات المهنية، تسليم المشاريع، والأداء التقني.",
      },
      {
        id: "health_vitality",
        title: "Health & Vitality",
        titleAr: "الصحة واللياقة",
        icon: "fitness-outline",
        color: "#059669",
        description: "Physical workout targets, nutrition habits, and mental endurance.",
        descriptionAr: "أهداف التمارين الرياضية، التغذية الصحية، والنوم والنشاط.",
      },
      {
        id: "mind_learning",
        title: "Mind & Learning",
        titleAr: "الفكر والتعلم",
        icon: "book-outline",
        color: "#7C3AED",
        description: "Books to read, skills to acquire, and mental mastery.",
        descriptionAr: "الكتب المقروءة، المهارات الجديدة، وتوسيع المدارك.",
      },
      {
        id: "wealth_finance",
        title: "Finance & Wealth",
        titleAr: "المالية والاستثمار",
        icon: "wallet-outline",
        color: "#D97706",
        description: "Savings targets, smart budgeting, and investment tracking.",
        descriptionAr: "أهداف الادخار، ضبط الميزانية، والاستثمارات الذكية.",
      },
    ],
  },
  {
    templateId: "okr_engine",
    name: "OKR Ambition Engine",
    nameAr: "محرك الأهداف والنتائج (OKR)",
    description: "High-impact qualitative Objectives paired with quantifiable Key Results.",
    descriptionAr: "أهداف طموحة وواضحة مقترنة بنتائج رئيسية قابلة للقياس والتقييم.",
    icon: "speedometer-outline",
    badge: "Strategic",
    badgeAr: "استراتيجي",
    bg: "#C7D2FE",
    ink: "#1E1B4B",
    accent: "#4F46E5",
    accentSecondary: "#4338CA",
    color: "#4F46E5",
    gradientColors: ["#C7D2FE", "#4F46E5"],
    artType: "rings",
    order: 2,
    categories: [
      {
        id: "objective_1",
        title: "Objective 1: Prime Breakthrough",
        titleAr: "الهدف 1: الإنجاز الأكبر",
        icon: "trophy-outline",
        color: "#4F46E5",
        description: "The single most impactful objective that transforms this month.",
        descriptionAr: "الهدف الأهم والتحولي لهذا الشهر.",
      },
      {
        id: "objective_2",
        title: "Objective 2: Scale & Output",
        titleAr: "الهدف 2: الإنتاجية والتوسع",
        icon: "rocket-outline",
        color: "#7C3AED",
        description: "Scaling capacity, delivering major outputs, and building momentum.",
        descriptionAr: "مضاعفة الإنتاج وتسليم الأعمال ذات التأثير العالي.",
      },
      {
        id: "objective_3",
        title: "Objective 3: Foundation & Mastery",
        titleAr: "الهدف 3: الأساسيات والتمكين",
        icon: "shield-checkmark-outline",
        color: "#059669",
        description: "Strengthening core habits, health, and operational excellence.",
        descriptionAr: "تعزيز العادات الأساسية والصحة واستقرار الأداء.",
      },
    ],
  },
  {
    templateId: "weekly_sprint",
    name: "4-Week Sprint Roadmap",
    nameAr: "خارطة طريق الأسابيع الأربعة",
    description: "Decompose the month into 4 phased, actionable execution sprints.",
    descriptionAr: "تقسيم الشهر إلى 4 مراحل وتحديات أسبوعية واضحة ومترابطة.",
    icon: "calendar-outline",
    badge: "Agile",
    badgeAr: "مراحل أسبوعية",
    bg: "#86EFAC",
    ink: "#052E16",
    accent: "#15803D",
    accentSecondary: "#166534",
    color: "#15803D",
    gradientColors: ["#86EFAC", "#15803D"],
    artType: "stripes",
    order: 3,
    categories: [
      {
        id: "week_1",
        title: "Week 1: Setup & Kickoff",
        titleAr: "الأسبوع 1: التأسيس والانطلاق",
        icon: "flag-outline",
        color: "#059669",
        description: "Clarify scope, establish routines, and complete initial quick wins.",
        descriptionAr: "تجهيز المتطلبات، ترتيب الروتين، وتحقيق أولى المكاسب السريعة.",
      },
      {
        id: "week_2",
        title: "Week 2: Deep Build & Momentum",
        titleAr: "الأسبوع 2: البناء والزخم",
        icon: "construct-outline",
        color: "#2563EB",
        description: "Heavy lifting on core milestones and aggressive progress.",
        descriptionAr: "تنفيذ المهام المعقدة والتسارع في الإنجاز.",
      },
      {
        id: "week_3",
        title: "Week 3: Deep Work & Testing",
        titleAr: "الأسبوع 3: العمل العميق والمراجعة",
        icon: "code-working-outline",
        color: "#7C3AED",
        description: "Iterating, refining, validating quality, and fixing bottlenecks.",
        descriptionAr: "الصقل والتحسين، مراجعة الجودة وتخطي العقبات.",
      },
      {
        id: "week_4",
        title: "Week 4: Delivery & Celebrate",
        titleAr: "الأسبوع 4: التسليم والاحتفال",
        icon: "ribbon-outline",
        color: "#EA580C",
        description: "Final shipping, retrospective, celebrating wins, and future plan.",
        descriptionAr: "إنهاء التسليمات، مراجعة الإنجازات، والاحتفاء بالنجاح.",
      },
    ],
  },
  {
    templateId: "atomic_habits",
    name: "Atomic Systems & Habits",
    nameAr: "الأنظمة والعادات الذرية",
    description: "Focus on identity-driven recurring systems and friction elimination.",
    descriptionAr: "التركيز على بناء الأنظمة اليومية القوية وإزالة المشتتات.",
    icon: "repeat-outline",
    badge: "Habit Focus",
    badgeAr: "بناء العادات",
    bg: "#FED7AA",
    ink: "#451A03",
    accent: "#D97706",
    accentSecondary: "#B45309",
    color: "#D97706",
    gradientColors: ["#FED7AA", "#D97706"],
    artType: "sunRays",
    order: 4,
    categories: [
      {
        id: "target_outcomes",
        title: "Target Outcomes (The Destination)",
        titleAr: "النتائج المستهدفة (الوجهة)",
        icon: "golf-outline",
        color: "#EA580C",
        description: "The tangible deliverables or achievements for the month.",
        descriptionAr: "المخرجات الملموسة التي ستصل إليها بنهاية الشهر.",
      },
      {
        id: "daily_keystone",
        title: "Daily Keystone Habits",
        titleAr: "عادات التميز اليومية",
        icon: "flame-outline",
        color: "#D97706",
        description: "Non-negotiable daily rituals that compound into victory.",
        descriptionAr: "الطقوس اليومية الثابتة التي تصنع الفرق التراكمي.",
      },
      {
        id: "anti_goals",
        title: "Anti-Goals & Boundaries",
        titleAr: "الممنوعات والحدود الذكية",
        icon: "close-circle-outline",
        color: "#E11D48",
        description: "Distractions and traps strictly eliminated this month.",
        descriptionAr: "المشتتات والسلوكيات السلبية التي ستتجنبها تماماً.",
      },
    ],
  },
  {
    templateId: "balance_wheel",
    name: "8-Dimension Life Wheel",
    nameAr: "عجلة الحياة (8 أبعاد)",
    description: "Complete harmony across mind, body, wealth, craft, and soul.",
    descriptionAr: "تناغم وتكامل تام يشمل الصحة، الفكر، العلاقات، والعمل.",
    icon: "disc-outline",
    badge: "Harmonious",
    badgeAr: "تكامل شامل",
    bg: "#DDD6FE",
    ink: "#2E1065",
    accent: "#7C3AED",
    accentSecondary: "#9333EA",
    color: "#7C3AED",
    gradientColors: ["#DDD6FE", "#7C3AED"],
    artType: "dualDiscs",
    order: 5,
    categories: [
      {
        id: "craft_career",
        title: "Craft & Career",
        titleAr: "المهنة والعمل",
        icon: "laptop-outline",
        color: "#2563EB",
      },
      {
        id: "vitality_body",
        title: "Vitality & Body",
        titleAr: "اللياقة والبدن",
        icon: "heart-outline",
        color: "#059669",
      },
      {
        id: "intellect_soul",
        title: "Intellect & Soul",
        titleAr: "الفكر والروح",
        icon: "sunny-outline",
        color: "#7C3AED",
      },
      {
        id: "social_relationships",
        title: "Relationships & Community",
        titleAr: "العلاقات والمجتمع",
        icon: "people-outline",
        color: "#DB2777",
      },
    ],
  },
  {
    templateId: "project_launch",
    name: "Deep Work & Launch",
    nameAr: "العمل العميق وإطلاق المشاريع",
    description: "Zero fluff. Laser focus on finishing and shipping an ambitious build.",
    descriptionAr: "تركيز فائق بدون تشتت لإنهاء وإطلاق مشروع أو منتج محدد.",
    icon: "hammer-outline",
    badge: "High Intensity",
    badgeAr: "تركيز عالي",
    bg: "#334155",
    ink: "#F8FAFC",
    accent: "#38BDF8",
    accentSecondary: "#0284C7",
    color: "#38BDF8",
    gradientColors: ["#334155", "#38BDF8"],
    artType: "curves",
    order: 6,
    categories: [
      {
        id: "core_scope",
        title: "Scope & Core MVP",
        titleAr: "نطاق العمل والنسخة الأساسية",
        icon: "cube-outline",
        color: "#0284C7",
      },
      {
        id: "qa_polish",
        title: "QA, Polish & Details",
        titleAr: "الجودة والصقل والتفاصيل",
        icon: "sparkles-outline",
        color: "#7C3AED",
      },
      {
        id: "launch_reach",
        title: "Launch & Go-to-Market",
        titleAr: "الإطلاق والنشر",
        icon: "megaphone-outline",
        color: "#EA580C",
      },
    ],
  },
  {
    templateId: "health_vitality_peak",
    name: "Peak Health & Energy",
    nameAr: "قمة اللياقة والطاقة البدنية",
    description: "Biohacking, nutrition discipline, endurance training, and deep rest.",
    descriptionAr: "اللياقة البدنية العالية، الانضباط الغذائي، والنشاط والحيوية.",
    icon: "fitness-outline",
    badge: "Vitality",
    badgeAr: "صحة وطاقة",
    bg: "#6EE7B7",
    ink: "#022C22",
    accent: "#059669",
    accentSecondary: "#047857",
    color: "#059669",
    gradientColors: ["#6EE7B7", "#059669"],
    artType: "waves",
    order: 7,
    categories: [
      {
        id: "workout_targets",
        title: "Workouts & Endurance",
        titleAr: "التمارين والتحمل",
        icon: "barbell-outline",
        color: "#059669",
      },
      {
        id: "nutrition_fuel",
        title: "Nutrition & Hydration",
        titleAr: "التغذية والترطيب",
        icon: "nutrition-outline",
        color: "#15803D",
      },
      {
        id: "recovery_sleep",
        title: "Sleep & Mind Recovery",
        titleAr: "النوم والتعافي الذهني",
        icon: "moon-outline",
        color: "#0D9488",
      },
    ],
  },
  {
    templateId: "wealth_finance_mastery",
    name: "Wealth & Finance Mastery",
    nameAr: "إدارة الثروة والمالية الذكية",
    description: "Financial discipline, savings targets, revenue goals, and asset allocation.",
    descriptionAr: "الانضباط المالي، أهداف الادخار، زيادة الدخل، والاستثمار.",
    icon: "cash-outline",
    badge: "Financial",
    badgeAr: "مالية واستثمار",
    bg: "#FDE047",
    ink: "#1C1917",
    accent: "#2563EB",
    accentSecondary: "#EAB308",
    color: "#2563EB",
    gradientColors: ["#FDE047", "#2563EB"],
    artType: "sunRays",
    order: 8,
    categories: [
      {
        id: "savings_invest",
        title: "Savings & Investments",
        titleAr: "الادخار والاستثمار",
        icon: "wallet-outline",
        color: "#2563EB",
      },
      {
        id: "income_streams",
        title: "Income & Revenue Goals",
        titleAr: "مصادر الدخل والنمو",
        icon: "trending-up-outline",
        color: "#059669",
      },
      {
        id: "budget_control",
        title: "Budget Optimization",
        titleAr: "ترشيد المصروفات والميزانية",
        icon: "pie-chart-outline",
        color: "#D97706",
      },
    ],
  },
];

/**
 * Clean LLM response helper
 */
function cleanJsonOutput(text: string): string {
  if (!text) return "{}";
  let cleaned = text;
  cleaned = cleaned.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, "");
  cleaned = cleaned.replace(/<thought>[\s\S]*?(?:<\/thought>|$)/gi, "");
  cleaned = cleaned.replace(/<reasoning>[\s\S]*?(?:<\/reasoning>|$)/gi, "");

  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonMatch && jsonMatch[1]) {
    cleaned = jsonMatch[1].trim();
  } else {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  }
  return cleaned.trim();
}

/**
 * Robust Multi-Provider LLM Caller for Goals
 */
async function callLLMForGoals(systemPrompt: string, userPrompt: string): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  const enforcedSystem = `${systemPrompt}\n\nSTRICT INSTRUCTION: Output ONLY valid raw JSON without markdown code fences or conversational text.`;

  // 1. Try Groq
  if (groqApiKey) {
    const groqModels = [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "qwen/qwen3.6-27b",
      "allam-2-7b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ];

    for (const model of groqModels) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: enforcedSystem },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            response_format: { type: "json_object" },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            return cleanJsonOutput(content);
          }
        }
      } catch (err) {
        console.warn(`Groq ${model} failed for goal generation:`, err);
      }
    }
  }

  // 2. Try Gemini
  if (geminiApiKey) {
    const geminiModels = [
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-2.5-flash",
      "gemini-3.6-flash",
    ];
    for (const model of geminiModels) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: enforcedSystem }] },
              contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              generationConfig: {
                responseMimeType: "application/json",
                temperature: 0.2,
              },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return cleanJsonOutput(text);
          }
        }
      } catch (err) {
        console.warn(`Gemini ${model} failed for goal generation:`, err);
      }
    }
  }

  throw new Error("Could not generate goals plan: No LLM service responded successfully.");
}

// ─── Queries & Mutations ──────────────────────────────────────────────────

/**
 * Get all available goal templates from database.
 */
export const getTemplates = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("goalTemplates").collect();
    if (templates.length === 0) {
      // Return static seed fallback if DB hasn't been seeded yet
      return SEED_TEMPLATES;
    }
    return templates.sort((a, b) => a.order - b.order);
  },
});

/**
 * Seed or update the template database.
 */
export const seedTemplates = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("goalTemplates").collect();
    const existingMap = new Map(existing.map((t) => [t.templateId, t._id]));

    for (const item of SEED_TEMPLATES) {
      if (existingMap.has(item.templateId)) {
        await ctx.db.patch(existingMap.get(item.templateId)!, item);
      } else {
        await ctx.db.insert("goalTemplates", item);
      }
    }
    return { success: true, count: SEED_TEMPLATES.length };
  },
});

/**
 * Get Blueprint theme & meta for a given user/year/month (or annual if month is omitted).
 */
export const getMonthlyBlueprint = query({
  args: {
    userId: v.union(v.id("users"), v.string()),
    year: v.number(),
    month: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.month !== undefined) {
      return await ctx.db
        .query("monthlyBlueprints")
        .withIndex("by_user_year_month", (q) =>
          q.eq("userId", args.userId).eq("year", args.year).eq("month", args.month)
        )
        .first();
    } else {
      const allForYear = await ctx.db
        .query("monthlyBlueprints")
        .withIndex("by_user_year", (q) =>
          q.eq("userId", args.userId).eq("year", args.year)
        )
        .collect();
      return allForYear.find((b) => b.month === undefined) || null;
    }
  },
});

/**
 * Generate Structured Monthly or Annual Goals Plan with AI.
 */
export const generateMonthlyPlan = action({
  args: {
    userPrompt: v.string(),
    templateId: v.string(),
    month: v.optional(v.number()),
    year: v.number(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isArabic = args.language === "ar";
    const isYearly = args.month === undefined;
    
    // 1. Resolve template metadata
    const templates: any[] = await ctx.runQuery(api.aiGoals.getTemplates, {});
    const template = templates.find((t) => t.templateId === args.templateId) || templates[0] || SEED_TEMPLATES[0];

    const categorySpecs = template.categories
      .map(
        (c: any) =>
          `- ID: "${c.id}" | Title: "${isArabic ? c.titleAr || c.title : c.title}" | Description: "${
            isArabic ? c.descriptionAr || c.description || "" : c.description || ""
          }"`
      )
      .join("\n");

    const targetPeriodText = isYearly
      ? `Full Year ${args.year} (Annual Vision & Grand Milestones)`
      : `Month index ${args.month} (0=Jan..11=Dec), Year ${args.year}`;

    const systemPrompt = `You are an elite productivity strategist and goal architect.
Your mission is to transform the user's stated goals into a clear, realistic, and inspiring ${
      isYearly ? "Annual Blueprint" : "Monthly Blueprint"
    } organized using the chosen framework archetype.

======================================================================
CRITICAL PRINCIPLE — USER INPUT IS THE ONLY SOURCE OF TRUTH:
1. Base all goals and milestones EXCLUSIVELY on what the user explicitly specified.
2. NEVER invent, hallucinate, or force unrelated life categories. For example:
   - If the user talks about coding or building an app, DO NOT invent health courses (e.g. diabetes or asthma), financial goals, or random hobbies.
   - If the user talks about fitness, DO NOT invent software or business goals.
   - NEVER add courses, screening, or generic filler topics that the user never asked for.
3. If the user only specified ONE goal or focus area, generate goals ONLY for that specific topic. Break that single goal down into smart, actionable milestones.
4. If the user specified MULTIPLE goals, generate goals covering only those specific stated goals.
======================================================================

Selected Framework Archetype: "${template.name}" (${template.description})
Target Period: ${targetPeriodText}
Language: ${isArabic ? "Arabic (العربية الفصحى الراقية والواضحة)" : "English"}

Framework Category Reference:
${categorySpecs}

How to Apply the Framework Archetype:
- The framework is a structural lens and card design style to format the user's actual goals:
  * For phased/process frameworks (e.g., Weekly Sprint, Deep Work & Launch): Decompose the user's specific goals across the sequential phases (e.g. Week 1 Kickoff, Week 2 Build, Week 3 Polish, Week 4 Deliver; or Scope MVP, QA Polish, Launch).
  * For metric/OKR frameworks (e.g., OKR Ambition Engine): Frame the user's stated goals as Objectives with measurable Key Results as milestones.
  * For habit/behavior frameworks (e.g., Atomic Systems): Structure the user's goal into Target Deliverable (Outcome) + Daily Keystone Habits + Distraction Boundaries / Anti-Goals.
  * For life domain frameworks (e.g., Life Pillars, Balance Wheel, Health, Wealth):
    ONLY include the category or categories that match what the user actually asked for. OMIT all unmentioned categories. If none of the template's predefined category IDs fit the user's goal, use a clean relevant title and categoryId that directly reflects the user's focus (e.g. categoryId: "software_mvp", title: "Mobile App Development").

Strict JSON Output Schema:
{
  "themeTitle": "${isYearly ? "Short 3-6 word grand annual motto or theme reflecting user's goals" : "Short 3-6 word punchy theme reflecting user's goals"}",
  "motivationalQuote": "A memorable 1-sentence quote or driving principle directly relevant to user's goals",
  "sections": [
    {
      "categoryId": "Matching category ID from framework or a clean snake_case ID matching user's topic",
      "title": "Category title in ${isArabic ? "Arabic" : "English"}",
      "goals": [
        {
          "text": "Specific, actionable, outcome-driven goal statement directly matching user's input",
          "description": "Optional 1-sentence context or definition of done",
          "milestones": [
            "Actionable milestone / sub-step 1",
            "Actionable milestone / sub-step 2",
            "Actionable milestone / sub-step 3"
          ]
        }
      ]
    }
  ]
}

Guidelines:
1. Generate 1 to 3 relevant sections containing only the goals the user requested.
2. Provide 2-4 concrete, actionable sub-milestones per goal that actually guide execution.
3. Keep the tone practical, disciplined, energizing, and free of fluff.
4. All text content MUST strictly match the requested language (${isArabic ? "Arabic" : "English"}).`;

    const userContent = `User Aspirations & Goals for ${isYearly ? `Year ${args.year}` : `Month ${args.month}, ${args.year}`}:
"""
${args.userPrompt.trim()}
"""

Format these exact goals into the "${template.name}" framework JSON now.`;

    const rawJson = await callLLMForGoals(systemPrompt, userContent);
    const parsed = JSON.parse(rawJson);

    return {
      templateId: template.templateId,
      templateName: isArabic ? template.nameAr || template.name : template.name,
      themeTitle: parsed.themeTitle || (isArabic ? (isYearly ? `رؤية عام ${args.year}` : "خطة الشهر الطموحة") : (isYearly ? `${args.year} Annual Vision` : "Monthly Focus Blueprint")),
      motivationalQuote: parsed.motivationalQuote || "",
      sections: parsed.sections || [],
    };
  },
});

/**
 * Refine an existing generated plan through conversation.
 */
export const refineMonthlyPlan = action({
  args: {
    currentPlanJson: v.string(),
    instruction: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isArabic = args.language === "ar";
    const systemPrompt = `You are an elite productivity strategist.
The user has an existing goals blueprint and wants to tweak or refine it based on their instructions.

Language: ${isArabic ? "Arabic (العربية الفصحى الراقية)" : "English"}

CRITICAL RULES:
1. Apply the user's requested adjustments to the existing goals and milestones.
2. Strictly maintain the user's focused scope — NEVER invent unrelated life domains, medical courses, or generic filler.
3. Output ONLY the updated valid JSON matching the identical schema:
   {
     "themeTitle": "...",
     "motivationalQuote": "...",
     "sections": [
       {
         "categoryId": "...",
         "title": "...",
         "goals": [
           {
             "text": "...",
             "description": "...",
             "milestones": ["..."]
           }
         ]
       }
     ]
   }`;

    const userPrompt = `Existing Plan:
${args.currentPlanJson}

Refinement Instruction:
"""
${args.instruction}
"""

Return the refined JSON now.`;

    const rawJson = await callLLMForGoals(systemPrompt, userPrompt);
    return JSON.parse(rawJson);
  },
});

/**
 * Save / Apply Generated Blueprint & Goals to Database in batch.
 */
export const saveMonthlyBlueprint = mutation({
  args: {
    userId: v.union(v.id("users"), v.string()),
    year: v.number(),
    month: v.optional(v.number()),
    templateId: v.string(),
    themeTitle: v.string(),
    motivationalQuote: v.optional(v.string()),
    goals: v.array(
      v.object({
        text: v.string(),
        description: v.optional(v.string()),
        category: v.optional(v.string()),
        color: v.optional(v.string()),
        icon: v.optional(v.string()),
        milestones: v.optional(
          v.array(
            v.object({
              id: v.string(),
              text: v.string(),
              isCompleted: v.boolean(),
            })
          )
        ),
      })
    ),
    achievements: v.optional(
      v.array(
        v.object({
          text: v.string(),
          description: v.optional(v.string()),
          category: v.optional(v.string()),
          color: v.optional(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    // 1. Update or create blueprint
    let existingBlueprint = null;
    if (args.month !== undefined) {
      existingBlueprint = await ctx.db
        .query("monthlyBlueprints")
        .withIndex("by_user_year_month", (q) =>
          q.eq("userId", args.userId).eq("year", args.year).eq("month", args.month)
        )
        .first();
    } else {
      const allForYear = await ctx.db
        .query("monthlyBlueprints")
        .withIndex("by_user_year", (q) =>
          q.eq("userId", args.userId).eq("year", args.year)
        )
        .collect();
      existingBlueprint = allForYear.find((b) => b.month === undefined) || null;
    }

    if (existingBlueprint) {
      await ctx.db.patch(existingBlueprint._id, {
        templateId: args.templateId,
        themeTitle: args.themeTitle,
        motivationalQuote: args.motivationalQuote,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("monthlyBlueprints", {
        userId: args.userId,
        year: args.year,
        month: args.month,
        templateId: args.templateId,
        themeTitle: args.themeTitle,
        motivationalQuote: args.motivationalQuote,
        updatedAt: Date.now(),
      });
    }

    // 2. Batch insert goals
    const now = Date.now();
    for (let i = 0; i < args.goals.length; i++) {
      const g = args.goals[i];
      await ctx.db.insert("yearlyGoals", {
        userId: args.userId,
        year: args.year,
        month: args.month,
        text: g.text,
        description: g.description,
        category: g.category,
        color: g.color,
        icon: g.icon,
        templateId: args.templateId,
        milestones: g.milestones,
        order: i,
        isCompleted: false,
        createdAt: now + i,
      });
    }

    // 3. Batch insert target achievements (if any provided)
    if (args.achievements && args.achievements.length > 0) {
      for (let j = 0; j < args.achievements.length; j++) {
        const a = args.achievements[j];
        await ctx.db.insert("yearlyAchievements", {
          userId: args.userId,
          year: args.year,
          month: args.month,
          text: a.text,
          description: a.description,
          category: a.category,
          color: a.color,
          isCompleted: false,
          createdAt: now + j,
        });
      }
    }

    return {
      success: true,
      addedGoals: args.goals.length,
      addedAchievements: args.achievements ? args.achievements.length : 0,
    };
  },
});

/**
 * UI Design Templates for Goal Cards
 */
export const GOAL_UI_TEMPLATES = [
  {
    id: "roadmap",
    name: "Milestone Roadmap",
    nameAr: "خارطة طريق مرحلية",
    description: "Step-by-step progress roadmap with connected milestones track.",
    descriptionAr: "مسار تصاعدي متسلسل ممتاز للكورسات والمشاريع التدريجية.",
    icon: "git-commit-outline",
    badge: "Sequential",
    badgeAr: "مرحلي",
    color: "#3B82F6",
  },
  {
    id: "checklist",
    name: "Clean Checklist",
    nameAr: "قائمة إنجاز أنيقة",
    description: "Modern, focused checklist layout with quick status toggles.",
    descriptionAr: "تصميم أنيق وسريع للمهام المباشرة والأهداف التنفيذية.",
    icon: "checkmark-circle-outline",
    badge: "Actionable",
    badgeAr: "تنفيذي",
    color: "#10B981",
  },
  {
    id: "metric",
    name: "Target Metric & Counter",
    nameAr: "مقياس رقمي وإحصائي",
    description: "Progress gauge with target stats, percentage counters, and numerical goals.",
    descriptionAr: "شريط نسبة مئوية ومؤشرات رقمية للأهداف المقاسة بالأرقام أو الكميات.",
    icon: "analytics-outline",
    badge: "Quantifiable",
    badgeAr: "رقمي",
    color: "#F59E0B",
  },
  {
    id: "sprint",
    name: "Sprint Capsule",
    nameAr: "كبسولة السبرنت السريعة",
    description: "High-intensity agile card with sprint phase badges and high focus.",
    descriptionAr: "بطاقة رشيقة ومحفزة للأهداف المحددة بوقت وتحديات الأسبوع واليوم.",
    icon: "flash-outline",
    badge: "High Energy",
    badgeAr: "رشيق",
    color: "#EF4444",
  },
  {
    id: "pillar",
    name: "Deep Focus Pillar",
    nameAr: "ركيزة التركيز الاستراتيجي",
    description: "Strategic pillar card with colored focus spine and foundational sub-habits.",
    descriptionAr: "بطاقة استراتيجية راقية للأهداف المحورية والعادات التأسيسية الكبرى.",
    icon: "shield-checkmark-outline",
    badge: "Strategic",
    badgeAr: "استراتيجي",
    color: "#8B5CF6",
  },
];

/**
 * Intelligent Conversational Goal Architect Action.
 * Transforms user natural language (voice/text) into a tailored goal, sub-goals, header section suggestion, and UI template recommendation.
 */
export const architectGoalIntent = action({
  args: {
    userMessage: v.string(),
    timeframe: v.string(), // "day" | "month" | "year"
    year: v.number(),
    month: v.optional(v.number()),
    day: v.optional(v.number()),
    existingSections: v.optional(v.array(v.string())),
    previousGoalsInSession: v.optional(
      v.array(
        v.object({
          text: v.string(),
          category: v.string(),
          templateId: v.optional(v.string()),
        })
      )
    ),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isArabic = args.language === "ar";
    const timeframe = args.timeframe || (args.day !== undefined ? "day" : args.month !== undefined ? "month" : "year");

    const timeframeContext =
      timeframe === "day"
        ? `Day ${args.day}, Month ${(args.month ?? 0) + 1}, Year ${args.year} (Daily execution focus - immediate today goals and steps)`
        : timeframe === "month"
        ? `Month ${(args.month ?? 0) + 1}, Year ${args.year} (Monthly objective - 2-4 week milestone breakdown)`
        : `Full Year ${args.year} (Annual vision - quarterly or macro milestones)`;

    const existingSecsStr =
      args.existingSections && args.existingSections.length > 0
        ? `Existing Header Categories in this view: [${args.existingSections.map((s) => `"${s}"`).join(", ")}]`
        : "No existing header categories yet.";

    const prevGoalsStr =
      args.previousGoalsInSession && args.previousGoalsInSession.length > 0
        ? `Previous goals created in this architect session:\n${args.previousGoalsInSession
            .map((g) => `- "${g.text}" (Section: "${g.category}")`)
            .join("\n")}`
        : "No previous goals created yet in this session.";

    const systemPrompt = `You are an elite AI Goal Architect and executive productivity coach.
Your mission is to understand the user's natural language goal intent (in Arabic or English) and convert it into a precise, beautifully structured goal blueprint.

======================================================================
CRITICAL PRINCIPLES:
1. USER INTENT IS THE SOLE SOURCE OF TRUTH:
   - Base the goal STRICTLY and EXCLUSIVELY on what the user stated.
   - NEVER invent, hallucinate, or add unrelated domains (e.g., if user mentions a programming course, DO NOT invent health, diet, gym, or financial goals).
2. STRICT SUB-GOALS POLICY (NO AUTOMATIC SUB-GOALS):
   - DO NOT generate sub-goals or milestones automatically.
   - ALWAYS return "suggestedMilestones": [] (empty array).
   - The user will choose on demand whether to create sub-goals and talk to the AI about them.
   - EXCEPTION: Only include milestones if the user explicitly dictated numbered steps or specific milestone breakdowns in their initial message.
3. SECTION / HEADER TITLE INTELLIGENCE:
   - Analyze ${existingSecsStr}.
   - Determine whether this new goal logically fits into one of the existing sections or deserves a fresh, relevant new section header.
   - Provide a recommended "suggestedHeader", and "headerOptions":
     * Include matching or relevant existing sections as { "title": "...", "isExisting": true }.
     * Include a new suggested section as { "title": "...", "isExisting": false }.
4. UI TEMPLATE RECOMMENDATION:
   - Choose the best matching UI design template for this specific goal from:
     * "roadmap" -> for courses, sequential learning, phased projects, book chapters.
     * "checklist" -> for standard deliverables, actionable tasks, check-off items.
     * "metric" -> for quantifiable metrics (e.g. read 100 pages, save $500, run 30km, finish 15 lessons).
     * "sprint" -> for urgent, high-energy sprints, time-boxed weekly challenges.
     * "pillar" -> for daily foundational habits, identity goals, core focus.
5. LANGUAGE FIDELITY:
   - Respond strictly in the user's requested language (${isArabic ? "العربية الفصحى الواضحة والراقية" : "English"}).
   - Provide a motivating, brief 1-2 sentence "aiResponseText" explaining what you crafted.
======================================================================

Strict JSON Output Schema:
{
  "goalTitle": "Concise, punchy outcome title matching user intent",
  "description": "1 sentence definition of done or target clarity",
  "suggestedHeader": "Recommended section/category name",
  "suggestedHeaderIsExisting": false,
  "headerOptions": [
    { "title": "Section Name", "isExisting": true },
    { "title": "New Section Name", "isExisting": false }
  ],
  "suggestedMilestones": [],
  "suggestedTemplateId": "roadmap | checklist | metric | sprint | pillar",
  "color": "#2563EB",
  "icon": "school-outline",
  "aiResponseText": "${isArabic ? "رسالة ودية موجزة تشرح ما صممه الذكاء الاصطناعي ولماذا اختار هذا القالب" : "Brief friendly explanation of how the goal was architected"}"
}`;

    const userPrompt = `User Prompt / Voice Transcription:
"""
${args.userMessage.trim()}
"""

${existingSecsStr}
${prevGoalsStr}

Architect this goal into valid JSON now.`;

    const rawJson = await callLLMForGoals(systemPrompt, userPrompt);
    const parsed = JSON.parse(rawJson);

    return {
      goalTitle: parsed.goalTitle || (isArabic ? "هدف جديد" : "New Goal"),
      description: parsed.description || "",
      suggestedHeader: parsed.suggestedHeader || (isArabic ? "أهداف عامة" : "General Goals"),
      suggestedHeaderIsExisting: Boolean(parsed.suggestedHeaderIsExisting),
      headerOptions:
        Array.isArray(parsed.headerOptions) && parsed.headerOptions.length > 0
          ? parsed.headerOptions
          : [
              {
                title: parsed.suggestedHeader || (isArabic ? "أهداف عامة" : "General Goals"),
                isExisting: false,
              },
            ],
      suggestedMilestones: Array.isArray(parsed.suggestedMilestones)
        ? parsed.suggestedMilestones.map((m: any, idx: number) => ({
            id: m.id || `m_${Date.now()}_${idx}`,
            text: typeof m === "string" ? m : m.text || "",
            isCompleted: false,
          }))
        : [],
      suggestedTemplateId: parsed.suggestedTemplateId || "roadmap",
      color: parsed.color || "#EA580C",
      icon: parsed.icon || "flag-outline",
      aiResponseText: parsed.aiResponseText || "",
    };
  },
});

/**
 * Conversational Refinement of the active goal draft.
 */
export const refineGoalIntent = action({
  args: {
    currentDraft: v.object({
      goalTitle: v.string(),
      description: v.optional(v.string()),
      category: v.string(),
      templateId: v.string(),
      color: v.optional(v.string()),
      icon: v.optional(v.string()),
      milestones: v.array(
        v.object({
          id: v.string(),
          text: v.string(),
          isCompleted: v.boolean(),
        })
      ),
    }),
    instruction: v.string(),
    existingSections: v.optional(v.array(v.string())),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isArabic = args.language === "ar";
    const systemPrompt = `You are an elite AI Goal Architect.
The user wants to tweak or refine their current goal draft via natural language instruction.

Current Draft JSON:
${JSON.stringify(args.currentDraft, null, 2)}

Existing Sections: ${JSON.stringify(args.existingSections || [])}
Language: ${isArabic ? "Arabic (العربية)" : "English"}

Apply the user's requested refinements directly (e.g. adjusting milestones, sub-goals, title, description, category, or UI template).
Return the updated goal in identical JSON schema:
{
  "goalTitle": "...",
  "description": "...",
  "category": "...",
  "templateId": "roadmap | checklist | metric | sprint | pillar",
  "color": "...",
  "icon": "...",
  "milestones": [
    { "id": "...", "text": "...", "isCompleted": false }
  ],
  "aiResponseText": "${isArabic ? "رسالة توضيحية قصيرة بالتعديل الذي تم" : "Brief sentence explaining the refinement"}"
}`;

    const userPrompt = `Refinement Instruction:
"""
${args.instruction}
"""

Return the refined JSON now.`;

    const rawJson = await callLLMForGoals(systemPrompt, userPrompt);
    const parsed = JSON.parse(rawJson);

    return {
      goalTitle: parsed.goalTitle || args.currentDraft.goalTitle,
      description:
        parsed.description !== undefined ? parsed.description : args.currentDraft.description,
      category: parsed.category || args.currentDraft.category,
      templateId: parsed.templateId || args.currentDraft.templateId,
      color: parsed.color || args.currentDraft.color || "#EA580C",
      icon: parsed.icon || args.currentDraft.icon || "flag-outline",
      milestones: Array.isArray(parsed.milestones)
        ? parsed.milestones.map((m: any, idx: number) => ({
            id: m.id || `m_${Date.now()}_${idx}`,
            text: typeof m === "string" ? m : m.text || "",
            isCompleted: Boolean(m.isCompleted),
          }))
        : args.currentDraft.milestones,
      aiResponseText:
        parsed.aiResponseText ||
        (isArabic ? "تم تحديث الهدف وفقاً لطلبك." : "Goal updated according to your instruction."),
    };
  },
});

/**
 * On-Demand Sub-Goals Generation.
 * Only called when the user explicitly chooses to create sub-goals and instructs the AI about them.
 */
export const generateSubGoalsAction = action({
  args: {
    goalTitle: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    timeframe: v.string(), // "day" | "month" | "year"
    userInstructions: v.string(), // user's voice or text guidance
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const isArabic = args.language === "ar";
    const systemPrompt = `You are an elite productivity coach and goal architect.
The user wants to break down a specific goal into concrete, high-impact sub-goals / milestones.
The user has provided their SPECIFIC instructions for this breakdown.

Goal Details:
- Goal: "${args.goalTitle}"
- Description: "${args.description || ""}"
- Category: "${args.category}"
- Timeframe: ${args.timeframe}
- Language: ${isArabic ? "Arabic (العربية الفصحى)" : "English"}

CRITICAL RULES:
1. Base all sub-goals STRICTLY on the user's instructions regarding how they want this goal broken down.
2. DO NOT generate generic boilerplate, filler tasks, or unrelated advice.
3. Make each sub-goal a clear, concrete, outcome-oriented step (between 2 to 5 items).
4. All text MUST be in ${isArabic ? "Arabic" : "English"}.

Strict JSON Output Schema:
{
  "milestones": [
    { "id": "m1", "text": "Specific, actionable milestone 1" },
    { "id": "m2", "text": "Specific, actionable milestone 2" }
  ],
  "aiExplanation": "${isArabic ? "رسالة موجزة توضح ما تم صياغته وفقاً لتعليمات المستخدم" : "Short confirmation of how milestones were created"}"
}`;

    const userPrompt = `User's Specific Instructions for Sub-Goals:
"""
${args.userInstructions.trim()}
"""

Generate the tailored sub-goals JSON now.`;

    const rawJson = await callLLMForGoals(systemPrompt, userPrompt);
    const parsed = JSON.parse(rawJson);

    return {
      milestones: Array.isArray(parsed.milestones)
        ? parsed.milestones.map((m: any, idx: number) => ({
            id: m.id || `ms_${Date.now()}_${idx}`,
            text: typeof m === "string" ? m : m.text || "",
            isCompleted: false,
          }))
        : [],
      aiExplanation: parsed.aiExplanation || "",
    };
  },
});

/**
 * Save Architect Goals directly to database in batch.
 */
export const saveArchitectGoals = mutation({
  args: {
    userId: v.union(v.id("users"), v.string()),
    year: v.number(),
    month: v.optional(v.number()),
    day: v.optional(v.number()),
    goals: v.array(
      v.object({
        text: v.string(),
        description: v.optional(v.string()),
        category: v.string(),
        color: v.optional(v.string()),
        icon: v.optional(v.string()),
        templateId: v.optional(v.string()),
        milestones: v.optional(
          v.array(
            v.object({
              id: v.string(),
              text: v.string(),
              isCompleted: v.boolean(),
            })
          )
        ),
      })
    ),
    themeTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const createdIds: string[] = [];

    for (let i = 0; i < args.goals.length; i++) {
      const g = args.goals[i];
      const id = await ctx.db.insert("yearlyGoals", {
        userId: args.userId,
        year: args.year,
        month: args.month,
        day: args.day,
        text: g.text,
        description: g.description,
        category: g.category,
        color: g.color || "#EA580C",
        icon: g.icon || "flag-outline",
        templateId: g.templateId || "roadmap",
        milestones: g.milestones,
        order: i,
        isCompleted: false,
        createdAt: now + i,
      });
      createdIds.push(id);
    }

    if (args.themeTitle && args.day === undefined) {
      let existingBlueprint = null;
      if (args.month !== undefined) {
        existingBlueprint = await ctx.db
          .query("monthlyBlueprints")
          .withIndex("by_user_year_month", (q) =>
            q.eq("userId", args.userId).eq("year", args.year).eq("month", args.month)
          )
          .first();
      } else {
        const allForYear = await ctx.db
          .query("monthlyBlueprints")
          .withIndex("by_user_year", (q) =>
            q.eq("userId", args.userId).eq("year", args.year)
          )
          .collect();
        existingBlueprint = allForYear.find((b) => b.month === undefined) || null;
      }

      if (existingBlueprint) {
        await ctx.db.patch(existingBlueprint._id, {
          themeTitle: args.themeTitle,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("monthlyBlueprints", {
          userId: args.userId,
          year: args.year,
          month: args.month,
          templateId: args.goals[0]?.templateId || "roadmap",
          themeTitle: args.themeTitle,
          updatedAt: now,
        });
      }
    }

    return {
      success: true,
      addedGoals: createdIds.length,
    };
  },
});

