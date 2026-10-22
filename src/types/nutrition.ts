export type Gender = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'      // Poco o ningún ejercicio
  | 'light'          // Ejercicio ligero 1-3 días/sem
  | 'moderate'       // Ejercicio moderado 3-5 días/sem
  | 'active'         // Ejercicio fuerte 6-7 días/sem
  | 'very_active';   // Atleta o trabajo físico intenso

export type FitnessGoal =
  | 'lose_fast'      // Pérdida de grasa acelerada (-600 kcal)
  | 'lose'           // Pérdida de peso saludable (-400 kcal)
  | 'maintain'       // Mantener peso y recomposición (0 kcal)
  | 'gain_muscle';   // Ganar masa muscular (+350 kcal)

export type DietType =
  | 'mediterranean'
  | 'omnivore'
  | 'high_protein'
  | 'vegetarian'
  | 'vegan'
  | 'keto'
  | 'paleo';

export type SupplementId =
  | 'whey_protein'
  | 'creatine'
  | 'pre_workout'
  | 'bcaa_eaa'
  | 'omega_vitamins'
  | 'casein_magnesium'
  | 'intra_carbs';

export interface UserProfile {
  name: string;
  gender: Gender;
  age: number;
  weightKg: number;
  heightCm: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;
}

export interface DietaryPreferences {
  dietType: DietType;
  allergies: string[];
  favoriteFoods: string;
  dislikedFoods: string;
  mealsPerDay: 3 | 4 | 5;
  cookingTime: 'quick' | 'normal' | 'elaborate';
  budget: 'economical' | 'moderate' | 'premium';
  wantsSupplements: boolean;
  selectedSupplements: SupplementId[];
  allowAiSupplementRecommendations: boolean;
}

export interface MacroDistribution {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
}

export interface CalorieMetrics {
  bmr: number;                     // Tasa Metabólica Basal (kcal en reposo)
  tdee: number;                    // Gasto Energético Total Diario (kcal)
  targetCaloriesToConsume: number; // Calorías recomendadas a consumir al día
  targetCaloriesToBurn: number;    // Calorías activas recomendadas a quemar al día
  dailyDeficitOrSurplus: number;   // Balance diario (- déficit / + superávit)
  bmi: number;                     // Índice de Masa Corporal
  bmiCategory: string;
  macros: MacroDistribution;
  estimatedWeeksToGoal: number;
  waterLitersPerDay: number;
}

export interface MealRecipe {
  id: string;
  mealType: string; // Desayuno, Media Mañana, Almuerzo, Merienda, Cena
  time: string;
  title: string;
  description: string;
  imageUrl: string;
  aiVisualPrompt: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTimeMinutes: number;
  ingredients: string[];
  steps: string[];
  supplementPairing?: string; // Qué suplemento acompaña a esta comida si aplica
}

export interface WorkoutSuggestion {
  title: string;
  focusMuscleGroup: string;
  durationMinutes: number;
  caloriesToBurn: number;
  intensity: 'Baja' | 'Media' | 'Alta';
  exercises: string[];
  supplementTimingNote: string;
}

export interface SupplementRecommendation {
  id: SupplementId;
  name: string;
  icon: string;
  dosage: string;
  timing: string;
  status: 'elegido' | 'recomendado_ia';
  dietContribution: string; // Explicación detallada de su aportación a la dieta y al objetivo
}

export interface DayPlan {
  dayName: string; // Lunes, Martes, etc.
  totalCalories: number;
  targetBurnCalories: number;
  meals: MealRecipe[];
  recommendedWorkout: WorkoutSuggestion;
}

export interface ShoppingCategory {
  category: string;
  items: string[];
}

export interface WeeklyDietPlan {
  generatedAt: string;
  aiNote: string;
  days: DayPlan[];
  supplementsProtocol: SupplementRecommendation[];
  shoppingList: ShoppingCategory[];
}

export interface LoggedFoodItem {
  id: string;
  name: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
}

export interface LoggedExerciseItem {
  id: string;
  name: string;
  durationMinutes: number;
  caloriesBurned: number;
  timestamp: string;
}
