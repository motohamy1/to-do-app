/**
 * Goal Template Definitions & UI Styles
 * Client-safe pure TypeScript module (no convex/server dependencies)
 */

export interface GoalCategory {
  id: string;
  title: string;
  titleAr: string;
  icon: string;
  color: string;
  description: string;
  descriptionAr: string;
}

export interface SeedGoalTemplate {
  templateId: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  badge: string;
  badgeAr: string;
  bg: string;
  ink: string;
  accent: string;
  accentSecondary: string;
  color: string;
  gradientColors: string[];
  artType: string;
  order: number;
  isDefault?: boolean;
  categories: GoalCategory[];
}

export const SEED_TEMPLATES: SeedGoalTemplate[] = [
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
        description: "Savings rate, smart budget allocation, and passive asset growth.",
        descriptionAr: "الادخار، ضبط النفقات، ومتابعة الاستثمارات.",
      },
    ],
  },
  {
    templateId: "academic_mastery",
    name: "Academic & Exam Sprint",
    nameAr: "التميز الأكاديمي والامتحانات",
    description: "Laser-focused study sprint designed for students, certifications, and research.",
    descriptionAr: "خطة مركزة للتحضير للاختبارات، إنهاء المناهج، والأبحاث الأكاديمية.",
    icon: "school-outline",
    badge: "Study",
    badgeAr: "دراسي",
    bg: "#E0E7FF",
    ink: "#1E1B4B",
    accent: "#4F46E5",
    accentSecondary: "#3730A3",
    color: "#4F46E5",
    gradientColors: ["#E0E7FF", "#4F46E5"],
    artType: "gridDots",
    order: 2,
    categories: [
      {
        id: "syllabus_lectures",
        title: "Syllabus & Coursework",
        titleAr: "المقررات والمحاضرات",
        icon: "library-outline",
        color: "#4F46E5",
        description: "Chapters covered, lecture reviews, and mandatory summaries.",
        descriptionAr: "إنهاء الفصول الدراسية، مراجعة المحاضرات، والملخصات.",
      },
      {
        id: "problem_solving",
        title: "Practice & Past Exams",
        titleAr: "حل المسائل ونماذج الاختبارات",
        icon: "create-outline",
        color: "#2563EB",
        description: "Problem banks, previous year exam solving, and mock sessions.",
        descriptionAr: "حل الأسئلة والتطبيقات العملية والامتحانات السابقة.",
      },
      {
        id: "revision_retention",
        title: "Spaced Revision & Flashcards",
        titleAr: "المراجعة التراكمية والحفظ",
        icon: "repeat-outline",
        color: "#0891B2",
        description: "Active recall cycles and flashcard completions.",
        descriptionAr: "التكرار المتباعد لترسيخ المعلومات والمراجعة الدورية.",
      },
    ],
  },
  {
    templateId: "software_engineering",
    name: "Engineer & Builder Sprint",
    nameAr: "الإنتاج البرمجي والتقني",
    description: "Built for developers shipping side projects, open source, and leveling up system design.",
    descriptionAr: "مصمم للمطورين لإطلاق التطبيقات، كتابة الكود، وإتقان هندسة النظم.",
    icon: "code-slash-outline",
    badge: "Tech",
    badgeAr: "تقني",
    bg: "#ECFCCB",
    ink: "#1A2E05",
    accent: "#65A30D",
    accentSecondary: "#4D7C0F",
    color: "#65A30D",
    gradientColors: ["#ECFCCB", "#65A30D"],
    artType: "diagonalStripes",
    order: 3,
    categories: [
      {
        id: "feature_shipping",
        title: "Features & Releases",
        titleAr: "إطلاق الميزات والمنتجات",
        icon: "rocket-outline",
        color: "#16A34A",
        description: "New features coded, PRs merged, and live releases deployed.",
        descriptionAr: "كتابة الميزات الجديدة، دمج الكود، وإطلاق التحديثات.",
      },
      {
        id: "architecture_quality",
        title: "Refactoring & Architecture",
        titleAr: "البنية والتحسين البرمجي",
        icon: "git-branch-outline",
        color: "#0D9488",
        description: "Clean code, tests coverage, and latency optimizations.",
        descriptionAr: "إعادة هيكلة الكود، كتابة الاختبارات، وتحسين الأداء.",
      },
      {
        id: "tech_deep_dive",
        title: "Tech Study & Algorithms",
        titleAr: "الخوارزميات والتعلم العميق",
        icon: "terminal-outline",
        color: "#2563EB",
        description: "CS fundamentals, system design deep dives, and LeetCode.",
        descriptionAr: "هندسة النظم، هياكل البيانات، ومفاهيم الحوسبة المتقدمة.",
      },
    ],
  },
  {
    templateId: "fitness_athletic",
    name: "Athletic Conditioning & Health",
    nameAr: "اللياقة البدنية والصحة الرياضية",
    description: "Endurance, muscle growth, body composition, and daily nutritional discipline.",
    descriptionAr: "زيادة اللياقة والقوة البدنية، الالتزام بالتمارين، والنظام الغذائي الصحي.",
    icon: "barbell-outline",
    badge: "Fitness",
    badgeAr: "رياضي",
    bg: "#FFE4E6",
    ink: "#4C0519",
    accent: "#E11D48",
    accentSecondary: "#BE123C",
    color: "#E11D48",
    gradientColors: ["#FFE4E6", "#E11D48"],
    artType: "solid",
    order: 4,
    categories: [
      {
        id: "strength_training",
        title: "Gym & Strength Training",
        titleAr: "تمارين المقاومة والحديد",
        icon: "barbell-outline",
        color: "#E11D48",
        description: "Scheduled lift sessions, progressive overload, and form mastery.",
        descriptionAr: "جلسات رفع الأثقال، زيادة الأوزان التدريجية، وتمارين القوة.",
      },
      {
        id: "cardio_endurance",
        title: "Cardio & Stamina",
        titleAr: "الكارديو والتحمل",
        icon: "flame-outline",
        color: "#EA580C",
        description: "Running distances, HIIT workouts, and daily step minimums.",
        descriptionAr: "الجري، التمارين الهوائية، وتحقيق الحد الأدنى للخطوات يومياً.",
      },
      {
        id: "nutrition_recovery",
        title: "Nutrition & Deep Sleep",
        titleAr: "التغذية والاستشفاء",
        icon: "water-outline",
        color: "#059669",
        description: "Daily protein intake, water volume, and 7.5h+ sleep discipline.",
        descriptionAr: "الالتزام بالبروتين والماء والنوم الكافي لتسريع الاستشفاء.",
      },
    ],
  },
  {
    templateId: "business_growth",
    name: "Creator & Business Launchpad",
    nameAr: "ريادة الأعمال والمحتوى",
    description: "Audience building, revenue acceleration, and product marketing.",
    descriptionAr: "بناء الجمهور، زيادة المبيعات والإيرادات، وتسويق المنتجات.",
    icon: "trending-up-outline",
    badge: "Growth",
    badgeAr: "نمو",
    bg: "#FEF3C7",
    ink: "#451A03",
    accent: "#D97706",
    accentSecondary: "#B45309",
    color: "#D97706",
    gradientColors: ["#FEF3C7", "#D97706"],
    artType: "gridDots",
    order: 5,
    categories: [
      {
        id: "audience_content",
        title: "Content & Community",
        titleAr: "المحتوى وبناء الجمهور",
        icon: "megaphone-outline",
        color: "#D97706",
        description: "Published articles, newsletter issues, and social distribution.",
        descriptionAr: "نشر المقالات والمنشورات والنشرات البريدية لبناء الثقة.",
      },
      {
        id: "sales_pipeline",
        title: "Revenue & Sales Deals",
        titleAr: "المبيعات والإيرادات",
        icon: "cash-outline",
        color: "#16A34A",
        description: "Client outreach, product sales targets, and conversion metrics.",
        descriptionAr: "التواصل مع العملاء، إبرام الصفقات، وتحقيق الأهداف المالية.",
      },
      {
        id: "customer_success",
        title: "Product Experience",
        titleAr: "تجربة العملاء والتطوير",
        icon: "heart-outline",
        color: "#DB2777",
        description: "User feedback loops, onboardings, and reducing churn.",
        descriptionAr: "خدمة العملاء، الاستماع لآرائهم، وتحسين جودة المنتج.",
      },
    ],
  },
];

export interface GoalUITemplate {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  icon: string;
  badge: string;
  badgeAr: string;
  color: string;
}

export const GOAL_UI_TEMPLATES: GoalUITemplate[] = [
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
