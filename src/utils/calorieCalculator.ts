import {
  ActivityLevel,
  CalorieMetrics,
  DietaryPreferences,
  DietType,
  FitnessGoal,
  MacroDistribution,
  SupplementId,
  UserProfile,
} from '../types/nutrition';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { title: string; subtitle: string }> = {
  sedentary: {
    title: 'Sedentario',
    subtitle: 'Trabajo de oficina, poco o ningún ejercicio',
  },
  light: {
    title: 'Ligero',
    subtitle: 'Ejercicio suave o caminatas 1-3 días/semana',
  },
  moderate: {
    title: 'Moderado',
    subtitle: 'Entrenamiento moderado 3-5 días/semana',
  },
  active: {
    title: 'Activo',
    subtitle: 'Entrenamiento intenso 6-7 días/semana',
  },
  very_active: {
    title: 'Muy Activo / Atleta',
    subtitle: 'Doble sesión o trabajo físico muy exigente',
  },
};

export const GOAL_LABELS: Record<FitnessGoal, { title: string; subtitle: string; badge: string }> = {
  lose_fast: {
    title: 'Definición / Perder grasa rápido',
    subtitle: 'Déficit de ~600 kcal/día con prioridad proteica',
    badge: '-0.6 kg/sem',
  },
  lose: {
    title: 'Perder peso de forma saludable',
    subtitle: 'Déficit sostenible de ~400 kcal/día',
    badge: '-0.4 kg/sem',
  },
  maintain: {
    title: 'Mantener peso y vitalidad',
    subtitle: 'Balance normocalórico y recomposición corporal',
    badge: 'Equilibrio',
  },
  gain_muscle: {
    title: 'Ganar masa muscular (Volumen limpio)',
    subtitle: 'Superávit controlado de +350 kcal/día',
    badge: '+0.35 kg/sem',
  },
};

export const DIET_TYPE_LABELS: Record<DietType, { title: string; desc: string; icon: string }> = {
  mediterranean: {
    title: 'Mediterránea',
    desc: 'Equilibrada con aceite de oliva, pescado, legumbres y verduras frescas',
    icon: '🫒',
  },
  omnivore: {
    title: 'Omnívora Flexible',
    desc: 'Todo tipo de alimentos saludables adaptados a tus macros',
    icon: '🥩',
  },
  high_protein: {
    title: 'Alta en Proteína / Fitness',
    desc: 'Enfocada en saciedad, fuerza y preservación muscular',
    icon: '💪',
  },
  vegetarian: {
    title: 'Vegetariana',
    desc: 'Sin carne ni pescado; incluye huevos, lácteos y proteína vegetal',
    icon: '🥚',
  },
  vegan: {
    title: 'Vegana (100% Plant-Based)',
    desc: 'Exclusivamente alimentos de origen vegetal ricos en nutrientes',
    icon: '🌱',
  },
  keto: {
    title: 'Cetogénica (Keto)',
    desc: 'Muy baja en carbohidratos y alta en grasas saludables',
    icon: '🥑',
  },
  paleo: {
    title: 'Paleo / Real Food',
    desc: 'Alimentos enteros sin ultraprocesados, harinas refinadas ni lácteos',
    icon: '🔥',
  },
};

export const SUPPLEMENT_CATALOG: Record<
  SupplementId,
  { name: string; shortDesc: string; icon: string }
> = {
  whey_protein: {
    name: 'Proteína (Whey Isolate / Vegetal)',
    shortDesc: 'Síntesis proteica rápida y recuperación muscular post-entreno',
    icon: '🥤',
  },
  creatine: {
    name: 'Creatina Monohidrato (Creapure®)',
    shortDesc: 'Aumenta fuerza explosiva, ATP celular y volumen muscular',
    icon: '⚡',
  },
  pre_workout: {
    name: 'Pre-Entreno / Cafeína + Citrulina',
    shortDesc: 'Foco mental, vasodilatación y mayor quema calórica al entrenar',
    icon: '🔥',
  },
  bcaa_eaa: {
    name: 'Aminoácidos (EAA / BCAA)',
    shortDesc: 'Protege el músculo en déficit calórico o entrenamientos largos',
    icon: '🧬',
  },
  omega_vitamins: {
    name: 'Omega-3 + Multivitamínico D3',
    shortDesc: 'Salud articular, antiinflamatorio y optimización hormonal',
    icon: '💊',
  },
  casein_magnesium: {
    name: 'Caseína / Magnesio Bisglicinato',
    shortDesc: 'Recuperación muscular nocturna y descanso profundo',
    icon: '🌙',
  },
  intra_carbs: {
    name: 'Ciclodextrina / Carbos Intra-Entreno',
    shortDesc: 'Energía rápida sin pesadez estomacal para máximo rendimiento',
    icon: '🔋',
  },
};

export function calculateCalorieMetrics(
  profile: UserProfile,
  preferences?: DietaryPreferences
): CalorieMetrics {
  const { gender, weightKg, heightCm, age, activityLevel, goal, targetWeightKg } = profile;

  // 1. Ecuación de Mifflin-St Jeor para TMB (BMR)
  const baseBmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = Math.round(gender === 'male' ? baseBmr + 5 : baseBmr - 161);

  // 2. Gasto Energético Total Diario (TDEE)
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.375;
  const tdee = Math.round(bmr * multiplier);

  // 3. Calorías activas recomendadas a quemar al día
  const baseActiveBurnByActivity: Record<ActivityLevel, number> = {
    sedentary: 250,
    light: 350,
    moderate: 480,
    active: 620,
    very_active: 780,
  };

  let targetCaloriesToBurn = Math.round(
    baseActiveBurnByActivity[activityLevel] * (weightKg / 72)
  );

  if (goal === 'lose_fast') {
    targetCaloriesToBurn += 140;
  } else if (goal === 'lose') {
    targetCaloriesToBurn += 90;
  } else if (goal === 'gain_muscle') {
    targetCaloriesToBurn = Math.max(280, targetCaloriesToBurn);
  }

  // 4. Ajuste calórico a consumir según objetivo
  const goalAdjustments: Record<FitnessGoal, number> = {
    lose_fast: -600,
    lose: -400,
    maintain: 0,
    gain_muscle: 350,
  };

  const dailyDeficitOrSurplus = goalAdjustments[goal];
  const minSafeCalories = gender === 'male' ? 1450 : 1200;
  const targetCaloriesToConsume = Math.max(
    minSafeCalories,
    Math.round(tdee + dailyDeficitOrSurplus)
  );

  // 5. Cálculo de IMC (BMI)
  const heightMeters = heightCm / 100;
  const bmi = Number((weightKg / (heightMeters * heightMeters)).toFixed(1));
  let bmiCategory = 'Peso saludable';
  if (bmi < 18.5) bmiCategory = 'Bajo peso';
  else if (bmi < 25) bmiCategory = 'Peso saludable';
  else if (bmi < 30) bmiCategory = 'Sobrepeso';
  else bmiCategory = 'Obesidad';

  // 6. Distribución de Macronutrientes según tipo de dieta y objetivo
  const dietType = preferences?.dietType || 'mediterranean';
  const macros = calculateMacros(targetCaloriesToConsume, dietType, goal);

  // 7. Estimación de semanas para alcanzar el peso objetivo
  const weightDiff = Math.abs(weightKg - targetWeightKg);
  const weeklyRateKg =
    goal === 'lose_fast'
      ? 0.6
      : goal === 'lose'
      ? 0.4
      : goal === 'gain_muscle'
      ? 0.35
      : 0.25;
  const estimatedWeeksToGoal =
    weightDiff < 0.3 ? 0 : Math.max(1, Math.round(weightDiff / weeklyRateKg));

  // 8. Agua diaria recomendada (añade +0.4L si toma creatina)
  const takesCreatine = preferences?.selectedSupplements?.includes('creatine');
  const waterLitersPerDay = Number(
    (weightKg * 0.035 + targetCaloriesToBurn / 1000 + (takesCreatine ? 0.4 : 0)).toFixed(1)
  );

  return {
    bmr,
    tdee,
    targetCaloriesToConsume,
    targetCaloriesToBurn,
    dailyDeficitOrSurplus,
    bmi,
    bmiCategory,
    macros,
    estimatedWeeksToGoal,
    waterLitersPerDay,
  };
}

function calculateMacros(
  totalCalories: number,
  dietType: DietType,
  goal: FitnessGoal
): MacroDistribution {
  let proteinPct = 30;
  let carbsPct = 40;
  let fatPct = 30;

  if (dietType === 'keto') {
    proteinPct = 25;
    carbsPct = 7;
    fatPct = 68;
  } else if (dietType === 'high_protein') {
    proteinPct = 35;
    carbsPct = 40;
    fatPct = 25;
  } else if (dietType === 'mediterranean') {
    proteinPct = 26;
    carbsPct = 44;
    fatPct = 30;
  } else if (dietType === 'vegan' || dietType === 'vegetarian') {
    proteinPct = 25;
    carbsPct = 48;
    fatPct = 27;
  } else if (dietType === 'paleo') {
    proteinPct = 33;
    carbsPct = 30;
    fatPct = 37;
  }

  if (dietType !== 'keto') {
    if (goal === 'lose_fast' || goal === 'lose') {
      proteinPct += 4;
      carbsPct -= 4;
    } else if (goal === 'gain_muscle') {
      carbsPct += 4;
      fatPct -= 4;
    }
  }

  const proteinGrams = Math.round((totalCalories * (proteinPct / 100)) / 4);
  const carbsGrams = Math.round((totalCalories * (carbsPct / 100)) / 4);
  const fatGrams = Math.round((totalCalories * (fatPct / 100)) / 9);

  return {
    proteinGrams,
    carbsGrams,
    fatGrams,
    proteinPct,
    carbsPct,
    fatPct,
  };
}
