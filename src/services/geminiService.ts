import {
  CalorieMetrics,
  DayPlan,
  DietaryPreferences,
  MealRecipe,
  ShoppingCategory,
  SupplementId,
  SupplementRecommendation,
  UserProfile,
  WeeklyDietPlan,
  WorkoutSuggestion,
} from '../types/nutrition';
import { DIET_TYPE_LABELS, GOAL_LABELS } from '../utils/calorieCalculator';

const DAYS_OF_WEEK = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

/**
 * Genera una URL de imagen culinaria por IA a partir de la descripción del plato
 */
export function buildAiFoodImageUrl(promptText: string, seed: number): string {
  const encoded = encodeURIComponent(
    `professional overhead food photography of ${promptText}, gourmet healthy fitness plating, natural daylight, 4k, ultra appetizing`
  );
  return `https://image.pollinations.ai/prompt/${encoded}?width=640&height=380&nologo=true&seed=${seed}`;
}

export async function generateAIDietPlan(
  profile: UserProfile,
  preferences: DietaryPreferences,
  metrics: CalorieMetrics,
  apiKey?: string
): Promise<WeeklyDietPlan> {
  const cleanKey = apiKey?.trim();

  if (cleanKey && cleanKey.length > 15) {
    try {
      return await callGeminiDietAPI(profile, preferences, metrics, cleanKey);
    } catch (error) {
      console.warn(
        'Fallo en llamada a Gemini API, usando motor inteligente adaptativo de 7 días:',
        error
      );
      return buildAdaptiveIntelligentPlan(profile, preferences, metrics);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 650));
  return buildAdaptiveIntelligentPlan(profile, preferences, metrics);
}

/**
 * Construye el protocolo de suplementación deportiva (elegidos por el usuario + recomendados por IA)
 * con dosis exacta según peso corporal, momento de toma y explicación de su aportación a la dieta.
 */
export function buildSupplementsProtocol(
  profile: UserProfile,
  preferences: DietaryPreferences
): SupplementRecommendation[] {
  const { weightKg, goal } = profile;
  const { dietType, wantsSupplements, selectedSupplements, allowAiSupplementRecommendations } =
    preferences;

  if (!wantsSupplements && !allowAiSupplementRecommendations) {
    return [];
  }

  const creatineGrams = Math.max(3, Math.round(weightKg * 0.1));
  const isPlantBased = dietType === 'vegan';

  // Determinar qué suplementos recomienda la IA según el objetivo y tipo de dieta
  const aiSuggestedIds: SupplementId[] = ['whey_protein', 'creatine'];
  if (goal === 'lose_fast' || goal === 'lose') {
    aiSuggestedIds.push('pre_workout', 'omega_vitamins');
  } else if (goal === 'gain_muscle') {
    aiSuggestedIds.push('intra_carbs', 'casein_magnesium');
  } else {
    aiSuggestedIds.push('omega_vitamins', 'casein_magnesium');
  }

  const finalIds = new Set<SupplementId>(selectedSupplements);
  if (allowAiSupplementRecommendations || selectedSupplements.length === 0) {
    aiSuggestedIds.forEach((id) => finalIds.add(id));
  }

  const detailsMap: Record<SupplementId, Omit<SupplementRecommendation, 'status'>> = {
    whey_protein: {
      id: 'whey_protein',
      name: isPlantBased
        ? 'Proteína Vegetal Isolate (Guisante + Arroz)'
        : 'Proteína Whey Isolate (Aislado de Suero)',
      icon: '🥤',
      dosage: '1 cazo (30g = ~25g de proteína pura)',
      timing: 'Post-entreno o integrada en la Merienda / Desayuno',
      dietContribution:
        'Aporta aminoácidos de absorción ultrarrápida y alta leucina para disparar la síntesis proteica muscular (MPS) sin añadir grasas ni azúcares extra, facilitando llegar a tus gramos de proteína diarios con alta saciedad.',
    },
    creatine: {
      id: 'creatine',
      name: 'Creatina Monohidrato (Sello Creapure®)',
      icon: '⚡',
      dosage: `${creatineGrams}g diarios (calculado a 0.1g por tus ${weightKg} kg de peso)`,
      timing: 'Todos los días junto con la comida post-entreno o el desayuno',
      dietContribution:
        'Satura los depósitos musculares de fosfocreatina para regenerar ATP durante series pesadas. En déficit calórico evita que pierdas fuerza y masa magra; en volumen acelera la hipertrofia y la hidratación intracelular.',
    },
    pre_workout: {
      id: 'pre_workout',
      name: 'Pre-Entreno (Cafeína Anhidra + L-Citrulina Malato)',
      icon: '🔥',
      dosage: '1 scoop (200mg cafeína + 6g citrulina) en 300ml de agua',
      timing: '25-30 minutos antes de iniciar tu rutina del día',
      dietContribution:
        'Eleva la termogénesis y la oxidación de ácidos grasos durante el ejercicio, retrasa la fatiga neuromuscular y mejora la vasodilatación (bombeo de nutrientes al músculo) para ayudarte a quemar todas tus calorías objetivo.',
    },
    bcaa_eaa: {
      id: 'bcaa_eaa',
      name: 'Aminoácidos Esenciales (EAA + BCAA 2:1:1)',
      icon: '🧬',
      dosage: '10g disueltos en 500ml de agua con electrolitos',
      timing: 'Durante el entrenamiento (Intra-entreno)',
      dietContribution:
        'Actúa como escudo anticatabólico evitando que tu cuerpo degrade tejido muscular para obtener energía, especialmente útil cuando entrenas con déficit calórico o en sesiones intensas.',
    },
    omega_vitamins: {
      id: 'omega_vitamins',
      name: isPlantBased
        ? 'Omega-3 de Microalgas + Vitamina B12 y D3'
        : 'Omega-3 (EPA/DHA) + Vitamina D3 + K2',
      icon: '💊',
      dosage: '2 perlas de Omega-3 (2000mg) + 2000 UI Vitamina D3',
      timing: 'Junto con el Almuerzo o la Cena (requiere grasas para absorberse)',
      dietContribution:
        'Reduce la inflamación muscular post-ejercicio, mejora la sensibilidad a la insulina (haciendo que los carbohidratos de tu dieta vayan al músculo y no al tejido adiposo) y protege las articulaciones.',
    },
    casein_magnesium: {
      id: 'casein_magnesium',
      name: 'Magnesio Bisglicinato + Caseína / Recuperador Nocturno',
      icon: '🌙',
      dosage: '300mg de Magnesio elemental (+ 25g proteína lenta opcional)',
      timing: '30-45 minutos antes de dormir',
      dietContribution:
        'Relaja el sistema nervioso central, previene calambres musculares y libera aminoácidos de forma sostenida durante 7 horas mientras duermes para maximizar la reparación de fibras.',
    },
    intra_carbs: {
      id: 'intra_carbs',
      name: 'Ciclodextrina (Cluster Dextrin®) + Electrolitos',
      icon: '🔋',
      dosage: '30g en 600ml de agua',
      timing: 'A sorbos durante el entrenamiento de fuerza/hipertrofia',
      dietContribution:
        'Aporta carbohidratos de vaciado gástrico inmediato sin digestión pesada, manteniendo el glucógeno muscular alto para entrenar con máxima intensidad de principio a fin.',
    },
  };

  return Array.from(finalIds).map((id) => ({
    ...detailsMap[id],
    status: selectedSupplements.includes(id) ? 'elegido' : 'recomendado_ia',
  }));
}

function buildAdaptiveIntelligentPlan(
  profile: UserProfile,
  preferences: DietaryPreferences,
  metrics: CalorieMetrics
): WeeklyDietPlan {
  const { targetCaloriesToConsume, targetCaloriesToBurn, macros } = metrics;
  const { dietType, allergies, favoriteFoods, dislikedFoods, mealsPerDay } = preferences;

  const noGluten = allergies.includes('Gluten');
  const noLactose = allergies.includes('Lactosa');
  const noNuts = allergies.includes('Frutos secos');
  const noSeafood = allergies.includes('Marisco');

  const supplementsProtocol = buildSupplementsProtocol(profile, preferences);
  const hasWhey = supplementsProtocol.some((s) => s.id === 'whey_protein');
  const hasCreatine = supplementsProtocol.some((s) => s.id === 'creatine');
  const hasOmega = supplementsProtocol.some((s) => s.id === 'omega_vitamins');

  const mealSplits: Record<3 | 4 | 5, { type: string; time: string; ratio: number }[]> = {
    3: [
      { type: 'Desayuno', time: '08:30', ratio: 0.30 },
      { type: 'Almuerzo', time: '14:00', ratio: 0.42 },
      { type: 'Cena', time: '21:00', ratio: 0.28 },
    ],
    4: [
      { type: 'Desayuno', time: '08:00', ratio: 0.25 },
      { type: 'Almuerzo', time: '14:00', ratio: 0.35 },
      { type: 'Merienda Post-Gym', time: '17:45', ratio: 0.15 },
      { type: 'Cena', time: '21:00', ratio: 0.25 },
    ],
    5: [
      { type: 'Desayuno', time: '08:00', ratio: 0.22 },
      { type: 'Media Mañana', time: '11:15', ratio: 0.12 },
      { type: 'Almuerzo', time: '14:15', ratio: 0.32 },
      { type: 'Merienda Post-Gym', time: '18:00', ratio: 0.14 },
      { type: 'Cena', time: '21:15', ratio: 0.20 },
    ],
  };

  const selectedSplits = mealSplits[mealsPerDay] || mealSplits[4];

  // 7 recetas distintas por cada tipo de comida para que NINGÚN día de la semana se repita
  const breakfasts7 = getSevenBreakfasts(dietType, noGluten, noLactose, noNuts);
  const midMornings7 = getSevenMidMornings(dietType, noLactose, noNuts);
  const lunches7 = getSevenLunches(dietType, noGluten, noSeafood);
  const meriendas7 = getSevenMeriendas(dietType, noLactose, noNuts, hasWhey);
  const dinners7 = getSevenDinners(dietType, noLactose, noSeafood);
  const workouts7 = getSevenWorkouts(profile.goal, targetCaloriesToBurn, supplementsProtocol);

  const days: DayPlan[] = DAYS_OF_WEEK.map((dayName, dayIdx) => {
    const meals: MealRecipe[] = selectedSplits.map((split, mealIdx) => {
      const mealCals = Math.round(targetCaloriesToConsume * split.ratio);
      const mealProtein = Math.round(macros.proteinGrams * split.ratio);
      const mealCarbs = Math.round(macros.carbsGrams * split.ratio);
      const mealFat = Math.round(macros.fatGrams * split.ratio);

      let chosen = breakfasts7[dayIdx];
      let suppNote: string | undefined;

      if (split.type === 'Desayuno') {
        chosen = breakfasts7[dayIdx];
        if (hasCreatine && mealsPerDay === 3) {
          suppNote = `⚡ Tomar aquí tu dosis diaria de Creatina Monohidrato.`;
        }
      } else if (split.type === 'Media Mañana') {
        chosen = midMornings7[dayIdx];
      } else if (split.type === 'Almuerzo') {
        chosen = lunches7[dayIdx];
        if (hasOmega) {
          suppNote = `💊 Tomar aquí tus perlas de Omega-3 + Vitamina D3 para máxima absorción.`;
        }
      } else if (split.type.includes('Merienda')) {
        chosen = meriendas7[dayIdx];
        if (hasWhey || hasCreatine) {
          suppNote = `🥤 Combo Post-Entreno: ${hasWhey ? '1 cazo de Proteína Isolate' : ''}${
            hasWhey && hasCreatine ? ' + ' : ''
          }${hasCreatine ? 'Creatina Monohidrato' : ''}.`;
        }
      } else if (split.type === 'Cena') {
        chosen = dinners7[dayIdx];
      }

      const portionFactor = (mealCals / 520).toFixed(1);

      return {
        id: `${dayName.toLowerCase()}-${mealIdx}`,
        mealType: split.type,
        time: split.time,
        title: chosen.title,
        description: chosen.description,
        imageUrl: buildAiFoodImageUrl(chosen.visualPrompt, (dayIdx + 1) * 100 + mealIdx),
        aiVisualPrompt: chosen.visualPrompt,
        calories: mealCals,
        protein: mealProtein,
        carbs: mealCarbs,
        fat: mealFat,
        prepTimeMinutes: chosen.prepTime,
        ingredients: chosen.ingredients.map((ing) => `${ing} (ración x${portionFactor})`),
        steps: chosen.steps,
        supplementPairing: suppNote,
      };
    });

    return {
      dayName,
      totalCalories: meals.reduce((acc, m) => acc + m.calories, 0),
      targetBurnCalories: targetCaloriesToBurn,
      meals,
      recommendedWorkout: workouts7[dayIdx],
    };
  });

  const suppNames = supplementsProtocol.map((s) => s.name.split(' ')[0]).join(', ');
  const aiNote = `Plan GymTrack! de 7 días con 100% de recetas distintas cada día para ${
    profile.name
  } (${profile.weightKg}kg, ${profile.heightCm}cm). Meta: consumir ${targetCaloriesToConsume} kcal y quemar ${targetCaloriesToBurn} kcal activas en ${mealsPerDay} comidas (${
    DIET_TYPE_LABELS[dietType].title
  }).${
    supplementsProtocol.length > 0
      ? ` Incluye protocolo de suplementación (${suppNames}) sincronizado con tu rutina.`
      : ''
  }`;

  return {
    generatedAt: new Date().toISOString(),
    aiNote,
    days,
    supplementsProtocol,
    shoppingList: buildShoppingList(dietType, allergies, favoriteFoods, supplementsProtocol),
  };
}

interface DayRecipeTemplate {
  title: string;
  description: string;
  visualPrompt: string;
  prepTime: number;
  ingredients: string[];
  steps: string[];
}

function getSevenBreakfasts(
  dietType: string,
  noGluten: boolean,
  noLactose: boolean,
  noNuts: boolean
): DayRecipeTemplate[] {
  const bread = noGluten ? 'pan sarraceno sin gluten' : 'pan rústico integral de masa madre';
  const yogurt = noLactose ? 'yogur vegetal proteico de soja' : 'yogur griego Skyr 0%';
  const nuts = noNuts ? 'semillas de chía y calabaza' : 'nueces pecanas y almendras';

  if (dietType === 'vegan') {
    return [
      {
        title: 'Tostada Rústica de Tofu Scramble a la Cúrcuma y Aguacate',
        description: 'Revuelto vegano alto en proteína con aguacate laminado y tomates cherry.',
        visualPrompt: 'tofu scramble with turmeric and sliced avocado on sourdough toast with cherry tomatoes',
        prepTime: 12,
        ingredients: ['160g Tofu firme desmenuzado', `2 rebanadas de ${bread}`, '1/2 Aguacate Hass', 'Cúrcuma, pimienta negra y AOVE'],
        steps: ['Dorar el tofu desmenuzado en sartén con cúrcuma y AOVE 6 min.', 'Tostar el pan, colocar el aguacate laminado y coronar con el tofu caliente.'],
      },
      {
        title: 'Porridge Proteico de Avena, Cacao Puro y Plátano Caramelizado',
        description: 'Gachas cremosas de liberación lenta con proteína vegetal y antioxidantes.',
        visualPrompt: 'chocolate oatmeal porridge bowl topped with caramelized banana slices and chia seeds',
        prepTime: 10,
        ingredients: ['65g Copos de avena', '250ml Bebida de soja/almendra', '1 cda Cacao puro 100% + proteína vegetal', '1 Plátano en rodajas'],
        steps: ['Cocer la avena con la bebida vegetal y el cacao durante 5 min.', 'Servir en bol y decorar con rodajas de plátano doradas a la sartén.'],
      },
      {
        title: 'Tortitas Fitness de Avena, Arándanos y Crema de Cacahuete',
        description: 'Tortitas esponjosas 100% vegetales ricas en energía para entrenar fuerte.',
        visualPrompt: 'fluffy oat pancakes stack with fresh blueberries and peanut butter drizzle',
        prepTime: 14,
        ingredients: ['70g Harina de avena integral', '1 Plátano maduro machacado', '150ml Bebida vegetal proteica', 'Arándanos frescos'],
        steps: ['Triturar la avena, el plátano y la bebida vegetal hasta lograr una masa homogénea.', 'Cocinar tortitas 2 min por lado en sartén antiadherente y servir con arándanos.'],
      },
      {
        title: 'Smoothie Bowl Verde Proteico de Espinacas, Mango y Semillas',
        description: 'Recarga de vitaminas, minerales y aminoácidos de fácil digestión.',
        visualPrompt: 'vibrant green smoothie bowl topped with mango cubes kiwi and pumpkin seeds',
        prepTime: 8,
        ingredients: [`220g de ${yogurt}`, '100g Mango congelado', 'Puñado de espinacas baby', `20g de ${nuts}`],
        steps: ['Batir el yogur vegetal con el mango y las espinacas hasta textura cremosa.', 'Servir en bol con toppings crujientes por encima.'],
      },
      {
        title: 'Bagel Integral con Hummus de Pimientos Asados y Edamames',
        description: 'Desayuno salado mediterráneo con perfil completo de aminoácidos.',
        visualPrompt: 'whole grain bagel with roasted red pepper hummus edamame beans and sesame seeds',
        prepTime: 9,
        ingredients: [`1 Bagel o ${bread}`, '70g Hummus de garbanzos y pimiento', '60g Edamames pelados al vapor', 'Semillas de sésamo y AOVE'],
        steps: ['Tostar el pan, untar una capa generosa de hummus.', 'Añadir los edamames templados, pimentón dulce y un hilo de AOVE.'],
      },
      {
        title: 'Pudding Nocturno de Chía, Leche de Coco Ligera y Frambuesas',
        description: 'Rico en Omega-3 vegetal, fibra prebiótica y proteína.',
        visualPrompt: 'chia seed pudding in glass jar layered with fresh raspberries and coconut flakes',
        prepTime: 7,
        ingredients: ['35g Semillas de chía', '220ml Bebida vegetal con proteína', '80g Frambuesas frescas', 'Canela en polvo'],
        steps: ['Mezclar las semillas de chía con la bebida vegetal y canela hasta espesar.', 'Coronar con frambuesas frescas machacadas.'],
      },
      {
        title: 'Crepes Sarracenos Rellenos de Yogur Proteico y Fresas',
        description: 'Desayuno especial de domingo alto en proteína y libre de gluten.',
        visualPrompt: 'buckwheat crepes folded with Greek yogurt and sliced fresh strawberries on white plate',
        prepTime: 15,
        ingredients: ['65g Harina de trigo sarraceno', '200ml Bebida de soja', `120g de ${yogurt}`, '100g Fresas laminadas'],
        steps: ['Hacer dos crepes finos en sartén caliente.', 'Rellenar con el yogur proteico y las fresas frescas.'],
      },
    ];
  }

  // Menú de 7 desayunos distintos para dietas Mediterránea / Alta Proteína / Omnívora / Keto
  return [
    {
      title: 'Tostadas Proteicas de Huevos Revueltos, Pavo Braseado y Aguacate',
      description: 'Desayuno estrella de lunes con proteína de alto valor biológico y grasas saludables.',
      visualPrompt: 'scrambled eggs with sliced avocado and turkey breast on toasted artisan bread',
      prepTime: 10,
      ingredients: [`2 rebanadas de ${bread}`, '2 Huevos camperos + 2 claras', '60g Pechuga de pavo 95%', '1/2 Aguacate Hass'],
      steps: ['Tostar el pan y extender el aguacate machacado con limón.', 'Cuajar los huevos a fuego lento para que queden cremosos y servir con el pavo.'],
    },
    {
      title: 'Tortitas Americanas de Avena, Claras y Arándanos con Skyr',
      description: 'Energía limpia y sostenida para rendir al máximo en el gimnasio.',
      visualPrompt: 'protein oat pancakes topped with skyr yogurt and fresh blueberries',
      prepTime: 12,
      ingredients: ['60g Harina de avena', '150ml Claras de huevo + 1 huevo entero', `80g de ${yogurt}`, 'Puñado de arándanos'],
      steps: ['Batir la avena con las claras, el huevo y canela.', 'Dorar en sartén vuelta y vuelta y coronar con Skyr y arándanos.'],
    },
    {
      title: 'Omelette Mediterráneo de Espinacas, Tomate Seco y Queso Ligero',
      description: 'Tortilla jugosa cargada de micronutrientes, hierro y proteína.',
      visualPrompt: 'spinach and feta cheese omelette with sun dried tomatoes and herbs',
      prepTime: 11,
      ingredients: ['2 Huevos enteros + 100ml claras', 'Puñado de espinacas frescas', 'Tomates secos e italianos', `1 rebanada de ${bread}`],
      steps: ['Saltear las espinacas 1 minuto con gotas de AOVE.', 'Verter los huevos batidos, doblar la tortilla y acompañar con la tostada.'],
    },
    {
      title: 'Bowl Fitness de Yogur Griego, Granola Sin Azúcar y Fresas',
      description: 'Rápido, refrescante, saciante y rico en probióticos naturales.',
      visualPrompt: 'greek yogurt bowl with sliced strawberries granola and almonds',
      prepTime: 6,
      ingredients: [`250g de ${yogurt}`, '45g Copos de avena o granola tueste natural', '100g Fresas frescas', `15g de ${nuts}`],
      steps: ['Servir el yogur frío en un bol amplio.', 'Repartir en hileras las fresas cortadas, la avena y los frutos secos.'],
    },
    {
      title: 'Huevos Poché sobre Salmón Ahumado Salvaje y Pan de Centeno',
      description: 'Aporte premium de ácidos grasos Omega-3 y proteína limpia.',
      visualPrompt: 'poached eggs over smoked salmon and avocado on rye toast',
      prepTime: 12,
      ingredients: ['2 Huevos camperos', '75g Salmón ahumado', `2 rebanadas de ${bread}`, 'Eneldo y pimienta recién molida'],
      steps: ['Escalfar los huevos 3 minutos en agua suave.', 'Disponer el salmón sobre las tostadas y colocar los huevos poché encima.'],
    },
    {
      title: 'Porridge Cremoso de Avena Proteica con Manzana Asada y Canela',
      description: 'Desayuno reconfortante que regula la glucosa durante toda la mañana.',
      visualPrompt: 'warm oatmeal bowl with roasted cinnamon apple slices and walnuts',
      prepTime: 10,
      ingredients: ['60g Copos de avena', '200ml Leche sin lactosa o bebida vegetal', '1 cazo de Proteína o 150g claras', '1 Manzana troceada con canela'],
      steps: ['Cocinar la avena con la leche y la manzana en dados durante 6 min.', 'Añadir la proteína fuera del fuego y espolvorear canela Ceilán.'],
    },
    {
      title: 'Shakshuka Fitness de Huevos al Horno con Salsa de Tomate Natural',
      description: 'Receta de domingo rica en licopeno antioxidante y proteína.',
      visualPrompt: 'shakshuka baked eggs in skillet with rich tomato pepper sauce and parsley',
      prepTime: 16,
      ingredients: ['3 Huevos camperos', '200g Tomate natural triturado con pimiento rojo', 'Ajo, comino y perejil fresco', `1 rebanada de ${bread}`],
      steps: ['Sofreír el pimiento y el tomate natural con especias durante 8 minutos.', 'Cascar los huevos encima, tapar la sartén 4 minutos hasta cuajar la clara.'],
    },
  ];
}

function getSevenMidMornings(
  dietType: string,
  noLactose: boolean,
  noNuts: boolean
): DayRecipeTemplate[] {
  const dairy = noLactose ? 'Yogur proteico sin lactosa' : 'Queso fresco batido / Skyr';
  const nut = noNuts ? 'semillas de calabaza' : 'almendras tostadas';

  return [
    {
      title: 'Tosta de Arroz Integral con Pavo, Aguacate y Sésamo',
      description: 'Tentempié ligero para mantener el metabolismo activo a media mañana.',
      visualPrompt: 'rice cakes topped with sliced avocado and turkey breast',
      prepTime: 5,
      ingredients: ['3 Tortitas de arroz integral', '70g Pechuga de pavo natural', '1/3 Aguacate', 'Semillas de sésamo'],
      steps: ['Untar el aguacate sobre las tortitas y colocar las lonchas de pavo.'],
    },
    {
      title: 'Copa de Skyr con Kiwi Gold y Semillas de Chía',
      description: 'Alto en vitamina C y caseína de digestión gradual.',
      visualPrompt: 'yogurt parfait glass with golden kiwi slices and chia seeds',
      prepTime: 5,
      ingredients: [`180g de ${dairy}`, '1 Kiwi Gold en dados', '1 cdita Semillas de chía'],
      steps: ['Alternar capas de lácteo proteico con el kiwi troceado.'],
    },
    {
      title: 'Rollitos de Pollo Asado Rellenos de Queso Cottage y Pepino',
      description: 'Bocado alto en proteína y muy bajo en carbohidratos.',
      visualPrompt: 'turkey and chicken breast rolls stuffed with cottage cheese and cucumber strips',
      prepTime: 6,
      ingredients: ['90g Lonchas gruesas de pollo asado', '60g Queso cottage alto en proteína', 'Bastones de pepino crujiente'],
      steps: ['Untar el queso cottage en cada loncha, poner el pepino y enrollar.'],
    },
    {
      title: 'Manzana Verde Laminada con Crema 100% Cacahuete y Proteína',
      description: 'Fibra pectina saciante combinada con grasas saludables.',
      visualPrompt: 'sliced green apple wedges with natural peanut butter dip and cinnamon',
      prepTime: 5,
      ingredients: ['1 Manzana Granny Smith', `15g Crema de cacahuete o ${nut}`, `120g de ${dairy}`],
      steps: ['Cortar la manzana en gajos, decorar con hilos de crema y acompañar del yogur.'],
    },
    {
      title: 'Edamames al Vapor con Sal Maldon y Pimentón de la Vera',
      description: 'Proteína vegetal limpia, fibra y antioxidantes.',
      visualPrompt: 'steamed green edamame pods in ceramic bowl with sea salt flakes and paprika',
      prepTime: 6,
      ingredients: ['150g Vainas de edamame', 'Escamas de sal marina', 'Pimentón dulce y gotas de limón'],
      steps: ['Cocer al vapor 4 minutos y saltear con limón y pimentón.'],
    },
    {
      title: 'Mini Wrap Integral de Atún al Natural, Canónigos y Tomate',
      description: 'Aporte rápido de proteína magra y Omega-3.',
      visualPrompt: 'healthy whole wheat mini wrap with tuna lettuce and tomato',
      prepTime: 7,
      ingredients: ['1 Tortilla integral pequeña', '1 Lata de atún al natural escurrida', 'Canónigos y tomate en rodajas'],
      steps: ['Rellenar la tortilla con los ingredientes frescos y enrollar firme.'],
    },
    {
      title: 'Brochetas Caprese Fitness con Mozzarella Light y Albahaca',
      description: 'Aperitivo dominical fresco, proteico y mediterráneo.',
      visualPrompt: 'caprese skewers with cherry tomatoes mozzarella balls and fresh basil leaves',
      prepTime: 6,
      ingredients: ['100g Perlas de mozzarella light (o tofu marinado)', '10 Tomates cherry', 'Hojas de albahaca y AOVE'],
      steps: ['Insertar alternando tomate, mozzarella y albahaca; aliñar con AOVE.'],
    },
  ];
}

function getSevenLunches(
  dietType: string,
  noGluten: boolean,
  noSeafood: boolean
): DayRecipeTemplate[] {
  if (dietType === 'vegan' || dietType === 'vegetarian') {
    return [
      {
        title: 'Buddha Bowl de Quinoa Tricolor, Garbanzos Crujientes y Salsa Tahini',
        description: 'Almuerzo completo de lunes con proteína vegetal completa y hierro.',
        visualPrompt: 'buddha bowl with tricolor quinoa crispy roasted chickpeas avocado and tahini dressing',
        prepTime: 18,
        ingredients: ['80g Quinoa en seco', '150g Garbanzos tostados al horno con pimentón', 'Brócoli al vapor y lombarda', '1 cda Tahini con limón'],
        steps: ['Cocer la quinoa 12 min.', 'Hornear o saltear los garbanzos con especias hasta que crujan y montar el bol.'],
      },
      {
        title: 'Wok Asiático de Heura / Tofu Marinado con Arroz Jazmín y Brócoli',
        description: 'Salteado alto en proteína vegetal con jengibre y verduras al dente.',
        visualPrompt: 'asian stir fry tofu and broccoli with jasmine rice and sesame seeds',
        prepTime: 16,
        ingredients: ['160g Bocados de Heura o Tofu firme', '75g Arroz jazmín integral', 'Brócoli, zanahoria y pimiento rojo', 'Salsa tamari sin gluten y jengibre'],
        steps: ['Saltear la proteína a fuego fuerte en wok.', 'Incorporar las verduras 5 min y servir sobre el arroz.'],
      },
      {
        title: 'Lentejas Pardinas Estofadas con Verduras de Temporada y Arroz',
        description: 'Combinación tradicional de legumbre + cereal de máxima biodisponibilidad.',
        visualPrompt: 'hearty lentil stew bowl with carrots zucchini and brown rice',
        prepTime: 22,
        ingredients: ['180g Lentejas cocidas', '50g Arroz integral cocido', 'Calabacín, zanahoria, puerro y laurel', '1 cda AOVE'],
        steps: ['Rehogar las verduras picadas en una olla con AOVE.', 'Añadir las lentejas, el arroz y caldo vegetal durante 12 min.'],
      },
      {
        title: 'Pasta de Lenteja Roja con Boloñesa de Soja Texturizada y Albahaca',
        description: 'Más de 38g de proteína limpia por plato con textura al dente.',
        visualPrompt: 'red lentil pasta with rich plant based bolognese sauce and fresh basil',
        prepTime: 15,
        ingredients: ['85g Pasta de lenteja roja o garbanzo', '60g Soja texturizada fina hidratada', '200g Salsa de tomate casera', 'Orégano y albahaca fresca'],
        steps: ['Cocer la pasta 7 minutos.', 'Sofreír la soja texturizada con el tomate natural y hierbas italianas.'],
      },
      {
        title: 'Tacos Fitness de Alubias Negras, Seitán Grill y Pico de Gallo',
        description: 'Viernes mexicano saludable, alto en fibra y proteína.',
        visualPrompt: 'healthy corn tacos with grilled seitan black beans avocado and pico de gallo',
        prepTime: 15,
        ingredients: ['3 Tortillas de maíz 100%', '140g Tiras de seitán o tofu a la plancha', '80g Alubias negras', 'Tomate, cilantro, cebolla y lima'],
        steps: ['Dorar las tiras proteicas con comino y lima.', 'Montar los tacos con las alubias y el pico de gallo fresco.'],
      },
      {
        title: 'Curry Dorado de Garbanzos, Espinacas y Leche de Coco Ligera',
        description: 'Plato antiinflamatorio gracias a la cúrcuma y el jengibre fresco.',
        visualPrompt: 'golden chickpea and spinach curry with basmati rice in dark bowl',
        prepTime: 18,
        ingredients: ['160g Garbanzos cocidos', '100g Espinacas frescas', '120ml Leche de coco light', '70g Arroz basmati'],
        steps: ['Cocinar los garbanzos con curry, cúrcuma y leche de coco 10 min.', 'Añadir las espinacas al final y servir con arroz basmati.'],
      },
      {
        title: 'Paella Mediterránea de Verduras de la Huerta y Proteína Vegetal',
        description: 'Arroz dominical seco en paella con alcachofas, judías verdes y azafrán.',
        visualPrompt: 'traditional spanish vegetable paella with artichokes green beans and saffron rice',
        prepTime: 25,
        ingredients: ['85g Arroz bomba', '140g Tiras vegetales proteicas', 'Alcachofas, judías verdes y garrofón', 'Azafrán en hebras y AOVE'],
        steps: ['Sofreír las verduras y la proteína en la paella.', 'Nacarar el arroz, añadir el caldo caliente con azafrán y cocinar 17 min.'],
      },
    ];
  }

  // 7 Almuerzos distintos para toda la semana (Lunes a Domingo)
  return [
    {
      title: 'Pechuga de Pollo al Limón con Quinoa Real y Espárragos Trigueros',
      description: 'Lunes de arranque limpio: alto en proteína magra y carbohidratos de bajo índice glucémico.',
      visualPrompt: 'grilled lemon herb chicken breast with quinoa and green asparagus spears',
      prepTime: 18,
      ingredients: ['200g Pechuga de pollo de corral', '75g Quinoa real en seco', 'Manojo de espárragos verdes', 'Limón, ajo y 1 cda AOVE'],
      steps: ['Cocer la quinoa en agua hirviendo durante 12 minutos.', 'Asar el pollo a la plancha con zumo de limón y dorar los espárragos.'],
    },
    {
      title: 'Tataki de Ternera Magra con Arroz Basmati y Brócoli al Wok',
      description: 'Martes rico en hierro hemo, zinc y creatina natural para potenciar la fuerza.',
      visualPrompt: 'sliced seared lean beef steak bowl with basmati rice and wok broccoli',
      prepTime: 18,
      ingredients: ['185g Solomillo o cadera de ternera magra', '80g Arroz basmati aromático', '160g Ramilletes de brócoli', 'Semillas de sésamo y toque de salsa soja'],
      steps: ['Sellar la ternera a fuego vivo 3 min por lado y filetear.', 'Saltear el brócoli al dente y servir sobre cama de arroz basmati.'],
    },
    {
      title: noSeafood
        ? 'Solomillo de Pavo al Romero con Boniato Asado al Horno'
        : 'Lomo de Salmón Noruego al Horno con Boniato y Brotes Tiernos',
      description: 'Miércoles de recuperación articular y muscular con grasas saludables.',
      visualPrompt: noSeafood
        ? 'roast turkey tenderloin medallions with baked sweet potato cubes and rosemary'
        : 'baked salmon fillet with roasted sweet potato wedges and green salad',
      prepTime: 20,
      ingredients: [
        noSeafood ? '200g Solomillo de pavo' : '180g Lomo de salmón fresco',
        '180g Boniato cortado en bastones',
        'Mezclum de brotes verdes y cherrys',
        'Eneldo / romero y AOVE',
      ],
      steps: ['Hornear el boniato en dados a 200°C durante 16 min (o en Airfryer).', 'Cocinar la pieza principal 8 min para que quede jugosa en el interior.'],
    },
    {
      title: 'Pasta Integral / Arroz con Pollo Desmechado al Pesto Ligero de Albahaca',
      description: 'Jueves de recarga de glucógeno muscular para mantener entrenamientos intensos.',
      visualPrompt: 'whole wheat pasta with grilled chicken strips basil pesto and cherry tomatoes',
      prepTime: 16,
      ingredients: [noGluten ? '80g Pasta de arroz/maíz sin gluten' : '80g Pasta integral de trigo duro', '185g Pollo a la parrilla en tiras', 'Albahaca fresca, ajo y AOVE', 'Tomates cherry asados'],
      steps: ['Cocer la pasta al dente.', 'Mezclar en sartén con el pollo dorado, los cherrys y la picada de albahaca fresca.'],
    },
    {
      title: 'Fajitas Fitness de Pollo y Pimientos Tricolor con Guacamole Casero',
      description: 'Viernes sabroso, saciante y cuadrado exactamente a tus macronutrientes.',
      visualPrompt: 'sizzling chicken fajitas with colorful bell peppers and fresh guacamole',
      prepTime: 17,
      ingredients: ['190g Tiras de pechuga de pollo', 'Pimiento rojo, verde y amarillo en juliana', '2 Tortillas integrales o de maíz', '60g Aguacate machacado con lima'],
      steps: ['Saltear los pimientos y la cebolla en sartén.', 'Añadir el pollo especiado con comino y pimentón y servir con guacamole.'],
    },
    {
      title: 'Poke Bowl Hawaiano de Pollo Crispy / Atún con Edamames y Mango',
      description: 'Sábado fresco y nutritivo con balance perfecto de proteína, carbos y micronutrientes.',
      visualPrompt: 'hawaiian poke bowl with sushi rice diced mango edamame avocado and protein',
      prepTime: 15,
      ingredients: ['75g Arroz cocido templado', noSeafood ? '185g Pollo crujiente en airfryer' : '175g Dados de atún rojo / salmón', '60g Edamames, pepino y dados de mango', '1/3 Aguacate'],
      steps: ['Disponer la base de arroz en un bol.', 'Colocar por secciones la proteína, el mango, pepino, aguacate y edamames.'],
    },
    {
      title: 'Arroz Meloso Mediterráneo de Pollo Campero, Setas y Alcachofas',
      description: 'Domingo de alta cocina saludable con ingredientes naturales.',
      visualPrompt: 'spanish mediterranean rice dish with chicken mushrooms and artichokes',
      prepTime: 24,
      ingredients: ['80g Arroz redondo', '190g Contramuslo de pollo sin piel en trozos', 'Setas shiitake/champiñones y corazones de alcachofa', 'Caldo de ave casero y hebras de azafrán'],
      steps: ['Dorar el pollo con las setas y alcachofas.', 'Incorporar el arroz y el caldo caliente hasta lograr punto meloso.'],
    },
  ];
}

function getSevenMeriendas(
  dietType: string,
  noLactose: boolean,
  noNuts: boolean,
  hasWhey: boolean
): DayRecipeTemplate[] {
  const shakeName =
    dietType === 'vegan'
      ? 'Batido de Proteína Vegetal Isolate'
      : 'Batido de Proteína Whey Isolate';

  return [
    {
      title: hasWhey ? `${shakeName} con Plátano y Canela` : 'Bowl Post-Entreno de Skyr con Plátano y Avena',
      description: 'Recuperación rápida del glucógeno y reparación de fibras tras el gimnasio.',
      visualPrompt: 'protein shake glass with banana slices and oats on gym counter',
      prepTime: 4,
      ingredients: ['30g Proteína Isolate (o 200g yogur proteico)', '1 Plátano maduro', '250ml Agua fría o bebida vegetal'],
      steps: ['Mezclar en el shaker la proteína con agua bien fría y acompañar del plátano.'],
    },
    {
      title: 'Tostada Post-Gym de Crema de Cacahuete 100%, Frutos Rojos y Proteína',
      description: 'Combinación de antioxidantes y aminoácidos esenciales.',
      visualPrompt: 'toast with peanut butter and fresh raspberries with protein shake',
      prepTime: 5,
      ingredients: ['1 Tostada integral o tortitas de arroz', noNuts ? '15g Tahini de sésamo' : '15g Crema 100% cacahuete', 'Puñado de frambuesas', '1 Batido o yogur proteico'],
      steps: ['Untar la tostada, decorar con frambuesas y tomar junto al aporte proteico.'],
    },
    {
      title: 'Mousse Proteico de Chocolate Puro y Avellanas / Semillas',
      description: 'Merienda saciante que calma el antojo de dulce sin azúcares añadidos.',
      visualPrompt: 'dark chocolate protein mousse in bowl with berries and nuts',
      prepTime: 5,
      ingredients: [noLactose ? '200g Yogur de soja proteico' : '200g Queso fresco batido 0%', '1 cda Cacao puro desgrasado', 'Stevia o eritritol al gusto'],
      steps: ['Batir enérgicamente el lácteo con el cacao puro hasta crear textura de mousse.'],
    },
    {
      title: 'Sándwich Integral de Pavo Braseado, Rúcula y Queso Proteico',
      description: 'Merienda salada ideal para tardes de alta demanda energética.',
      visualPrompt: 'healthy club sandwich on whole grain bread with turkey and arugula',
      prepTime: 6,
      ingredients: ['2 Rebanadas de pan integral', '90g Pechuga de pavo 95%', 'Hojas de rúcula y tomate'],
      steps: ['Montar el sándwich y tostar ligeramente en plancha caliente.'],
    },
    {
      title: 'Batido Smoothie de Frutos del Bosque, Avena Fina y Isolate',
      description: 'Carga de polifenoles para reducir las agujetas musculares (DOMS).',
      visualPrompt: 'berry protein smoothie in tall glass with blackberries and raspberries',
      prepTime: 5,
      ingredients: ['100g Mix de frutos rojos congelados', '30g Proteína o claras pasteurizadas', '200ml Bebida de almendras sin azúcar'],
      steps: ['Triturar todos los ingredientes 30 segundos hasta textura frappé.'],
    },
    {
      title: 'Tortitas de Arroz con Jamón Ibérico Magro / Tofu Ahumado y Tomate',
      description: 'Aporte proteico limpio con toque mediterráneo.',
      visualPrompt: 'crispy rice cakes with cured lean ham and grated tomato olive oil',
      prepTime: 5,
      ingredients: ['3 Tortitas de arroz o maíz', dietType === 'vegan' ? '80g Tofu ahumado loncheado' : '70g Jamón serrano/ibérico sin grasa blanca', 'Tomate natural rallado'],
      steps: ['Extender el tomate rallado sobre las tortitas y coronar con la proteína.'],
    },
    {
      title: 'Gofre Fitness en Gofrera/Sartén con Yogur Griego y Arándanos',
      description: 'Merienda especial de domingo alta en proteína.',
      visualPrompt: 'golden protein waffle topped with greek yogurt and blueberries',
      prepTime: 10,
      ingredients: ['1 Huevo + 60ml claras (o mezcla vegana)', '35g Harina de avena', 'Arándanos frescos'],
      steps: ['Cuajar la mezcla en gofrera o sartén y servir con arándanos por encima.'],
    },
  ];
}

function getSevenDinners(
  dietType: string,
  noLactose: boolean,
  noSeafood: boolean
): DayRecipeTemplate[] {
  if (dietType === 'vegan' || dietType === 'vegetarian') {
    return [
      {
        title: 'Crema de Calabaza Asada con Dados de Tempeh Crujiente y Semillas',
        description: 'Cena digestiva de lunes que favorece el descanso y la síntesis nocturna.',
        visualPrompt: 'roasted butternut squash soup bowl topped with crispy tempeh cubes and pumpkin seeds',
        prepTime: 15,
        ingredients: ['250g Calabaza asada', '140g Tempeh marinado en dados', 'Semillas de calabaza tostadas', '1 cda AOVE'],
        steps: ['Triturar la calabaza cocida con pizca de nuez moscada.', 'Dorar el tempeh en sartén y servir sobre la crema caliente.'],
      },
      {
        title: 'Parrillada de Verduras con Tofu Ahumado a la Plancha y Chimichurri',
        description: 'Baja carga glucémica nocturna con alta densidad de micronutrientes.',
        visualPrompt: 'grilled smoked tofu steaks with grilled zucchini asparagus and chimichurri',
        prepTime: 14,
        ingredients: ['170g Tofu ahumado firme', 'Calabacín, berenjena y espárragos', 'Perejil, ajo, orégano y AOVE'],
        steps: ['Marcar el tofu y las verduras en plancha bien caliente y aliñar con chimichurri suave.'],
      },
      {
        title: 'Ensalada Templada de Quinoa, Aguacate, Canónigos y Seitán Grill',
        description: 'Cena ligera, saciante y rica en aminoácidos.',
        visualPrompt: 'warm quinoa salad with grilled seitan strips avocado and lamb lettuce',
        prepTime: 12,
        ingredients: ['150g Tiras de seitán o proteína de guisante', 'Base de canónigos y rúcula', '1/2 Aguacate en dados', 'Vinagreta de limón'],
        steps: ['Saltear las tiras proteicas y disponer sobre la cama de brotes verdes frescos.'],
      },
      {
        title: 'Calabacines Rellenos de Soja Texturizada al Horno con Levadura Nutricional',
        description: 'Cena reconfortante alta en proteína y fibra con muy pocas calorías.',
        visualPrompt: 'baked stuffed zucchini boats with savory mince and herbs',
        prepTime: 20,
        ingredients: ['2 Calabacines medianos abiertos a la mitad', '70g Soja texturizada hidratada', 'Tomate natural, cebolla y levadura nutricional'],
        steps: ['Vaciar parcialmente los calabacines, rellenar con el sofrito proteico y gratinar 12 min.'],
      },
      {
        title: 'Revuelto Vegano de Champiñones Portobello, Espárragos y Tofu Sedoso',
        description: 'Rico en selenio, potasio y proteína de fácil asimilación.',
        visualPrompt: 'sauteed portobello mushrooms and green asparagus with tofu scramble',
        prepTime: 12,
        ingredients: ['180g Champiñones Portobello laminados', '150g Tofu', 'Espárragos trigueros y ajo laminado'],
        steps: ['Saltear los champiñones y espárragos con ajo, incorporar el tofu y remover 5 min.'],
      },
      {
        title: 'Fajitas Nocturnas en Hoja de Lechuga Romana con Guacamole y Heura',
        description: 'Cena low-carb refrescante y crujiente para el sábado noche.',
        visualPrompt: 'romaine lettuce wraps filled with grilled plant chicken strips and avocado',
        prepTime: 12,
        ingredients: ['4 Hojas grandes de lechuga romana', '160g Tiras de Heura especiadas', '60g Guacamole casero y pico de gallo'],
        steps: ['Dorar las tiras proteicas y servir dentro de las hojas crujientes de lechuga.'],
      },
      {
        title: 'Crema Verde Detox de Calabacín y Espinacas con Garbanzos Tostados',
        description: 'Cierre de semana ligero y depurativo para empezar el lunes al 100%.',
        visualPrompt: 'green zucchini spinach soup bowl topped with roasted chickpeas and olive oil drizzle',
        prepTime: 15,
        ingredients: ['2 Calabacines + puñado de espinacas', '120g Garbanzos tostados crujientes', 'Puerro y 1 cda AOVE'],
        steps: ['Cocer y triturar el calabacín con las espinacas; coronar con los garbanzos crujientes.'],
      },
    ];
  }

  // 7 Cenas distintas para toda la semana (Lunes a Domingo)
  return [
    {
      title: noSeafood
        ? 'Pechuga de Pavo a las Finas Hierbas con Crema de Calabacín'
        : 'Lomos de Merluza al Horno con Espárragos y Patata Baby al Vapor',
      description: 'Cena de lunes ligera y de fácil digestión para maximizar la hormona de crecimiento nocturna.',
      visualPrompt: noSeafood
        ? 'grilled herb turkey breast with smooth zucchini soup'
        : 'baked hake fish fillet with steamed baby potatoes and green asparagus',
      prepTime: 16,
      ingredients: [
        noSeafood ? '190g Filetes de pavo' : '210g Lomos de merluza fresca',
        'Manojo de espárragos y 100g patata cocida',
        'Ajo, perejil fresco, limón y AOVE',
      ],
      steps: ['Hornear o hacer a la plancha la proteína principal 8 minutos con limón y hierbas.', 'Acompañar con los espárragos tiernos al vapor.'],
    },
    {
      title: 'Ensalada Templada de Pollo Grill, Aguacate, Canónigos y Cherrys',
      description: 'Cena de martes alta en proteína y grasas monoinsaturadas saciantes.',
      visualPrompt: 'warm grilled chicken salad with avocado slices cherry tomatoes and greens',
      prepTime: 12,
      ingredients: ['185g Tiras de pechuga de pollo a la parrilla', 'Bol de canónigos y rúcula', '1/2 Aguacate Hass en dados', 'Vinagreta de mostaza antigua y AOVE'],
      steps: ['Dorar las tiras de pollo con orégano.', 'Mezclar los brotes verdes con el aguacate y coronar con el pollo caliente.'],
    },
    {
      title: 'Revuelto Proteico de Champiñones Portobello, Gambas/Pavo y Ajetes',
      description: 'Miércoles bajo en carbohidratos para optimizar la oxidación de grasas nocturna.',
      visualPrompt: 'scrambled eggs with portobello mushrooms green garlic shoots and herbs',
      prepTime: 12,
      ingredients: ['2 Huevos camperos + 150ml claras', '150g Champiñones Portobello y ajetes tiernos', noSeafood ? '80g Taquitos de pavo' : '100g Gambas peladas', 'Perejil y AOVE'],
      steps: ['Saltear los champiñones y ajetes con la proteína.', 'Añadir los huevos batidos y cuajar a fuego suave.'],
    },
    {
      title: noSeafood
        ? 'Solomillo de Pollo al Limón con Brócoli y Zanahoria Baby al Vapor'
        : 'Tataki de Salmón en Costra de Sésamo con Wok de Verduras Verdes',
      description: 'Jueves rico en Omega-3 antiinflamatorio y triptófano para un sueño reparador.',
      visualPrompt: noSeafood
        ? 'lemon chicken tenderloins with steamed broccoli and baby carrots'
        : 'sesame crusted seared salmon with sauteed green vegetables',
      prepTime: 15,
      ingredients: [
        noSeafood ? '195g Solomillos de pollo' : '180g Lomo de salmón en costra de sésamo',
        'Brócoli, judías verdes y calabacín',
        'Jengibre y toque de limón',
      ],
      steps: ['Sellar la proteína en sartén antiadherente.', 'Saltear las verduras verdes 5 min para que conserven su textura crujiente.'],
    },
    {
      title: 'Hamburguesa Fitness Casera de Ternera Magra en Plato con Ensalada y Huevo',
      description: 'Cena de viernes estilo burger saludable sin pan refinado y máxima proteína.',
      visualPrompt: 'gourmet lean beef burger patty plated with grilled egg avocado and fresh salad',
      prepTime: 14,
      ingredients: ['170g Hamburguesa 100% ternera magra de carnicería', '1 Huevo a la plancha', 'Ensalada de tomate raf, cebolla morada y brotes', 'Pepinillos y mostaza cero'],
      steps: ['Asar la hamburguesa 4 min por lado en parrilla caliente.', 'Servir al plato con el huevo a la plancha encima y la ensalada fresca.'],
    },
    {
      title: noSeafood
        ? 'Brochetas de Pollo y Pimientos Asados con Tzatziki de Yogur Griego'
        : 'Dorada / Lubina a la Espalda con Verduritas Asadas al Horno',
      description: 'Cena de sábado mediterránea con proteína limpia de altísima calidad.',
      visualPrompt: noSeafood
        ? 'grilled chicken skewers with bell peppers and tzatziki yogurt dip'
        : 'roasted sea bream fish fillet with oven baked mediterranean vegetables',
      prepTime: 18,
      ingredients: [
        noSeafood ? '200g Dados de pollo en brocheta' : '210g Filetes de lubina o dorada limpia',
        'Calabacín, pimiento y cebolla asada',
        'Limón, ajo laminado y AOVE',
      ],
      steps: ['Cocinar a la plancha o al horno a 200°C durante 12 minutos junto a las verduras.'],
    },
    {
      title: 'Tortilla Francesa Rellena de Pavo Natural y Crema Suave de Calabaza',
      description: 'Cena de domingo reconfortante y digestiva para cerrar la semana.',
      visualPrompt: 'french omelette stuffed with turkey accompanied by warm pumpkin soup bowl',
      prepTime: 12,
      ingredients: ['2 Huevos enteros + 100ml claras', '70g Pechuga de pavo en lonchas', '200ml Crema natural de calabaza y zanahoria'],
      steps: ['Calentar la crema de calabaza casera.', 'Cuajar la tortilla rellena de pavo y servir recién hecha.'],
    },
  ];
}

function getSevenWorkouts(
  goal: string,
  targetBurnCalories: number,
  supplements: SupplementRecommendation[]
): WorkoutSuggestion[] {
  const hasPre = supplements.some((s) => s.id === 'pre_workout');
  const hasWhey = supplements.some((s) => s.id === 'whey_protein');
  const hasCreatine = supplements.some((s) => s.id === 'creatine');

  const suppNote = `${hasPre ? '🔥 Pre-entreno 25 min antes. ' : ''}${
    hasWhey || hasCreatine
      ? `🥤 Post-entreno: ${hasWhey ? '30g Proteína Isolate' : ''} ${
          hasCreatine ? '+ Creatina Monohidrato' : ''
        } al terminar.`
      : '💧 Hidratación constante con agua y electrolitos.'
  }`;

  return [
    {
      title: 'Lunes: Empuje (Pecho, Hombro, Tríceps) + Cardio Inclinado',
      focusMuscleGroup: 'Tren Superior Empuje + Oxidación',
      durationMinutes: 50,
      caloriesToBurn: targetBurnCalories,
      intensity: 'Alta',
      exercises: [
        'Press Banca o Mancuernas: 4 series x 8-10 reps',
        'Press Militar de Hombros: 3 series x 10 reps',
        'Fondos o Extensión de Tríceps en Polea: 3 series x 12 reps',
        'Caminata en cinta inclinada (12% pendiente): 15 min finales',
      ],
      supplementTimingNote: suppNote,
    },
    {
      title: 'Martes: Tracción (Espalda, Deltoides Posterior y Bíceps)',
      focusMuscleGroup: 'Dorsales, Densidad de Espalda y Brazos',
      durationMinutes: 50,
      caloriesToBurn: targetBurnCalories,
      intensity: 'Alta',
      exercises: [
        'Dominadas o Jalón al Pecho: 4 series x 10 reps',
        'Remo con Barra o Polea Baja: 4 series x 10 reps',
        'Face Pull para Hombro Posterior: 3 series x 15 reps',
        'Curl de Bíceps con Mancuernas: 3 series x 12 reps',
      ],
      supplementTimingNote: suppNote,
    },
    {
      title: 'Miércoles: Pierna Completa (Cuádriceps, Isquios y Glúteo)',
      focusMuscleGroup: 'Tren Inferior y Alto Gasto Metabólico',
      durationMinutes: 55,
      caloriesToBurn: targetBurnCalories,
      intensity: 'Alta',
      exercises: [
        'Sentadilla Libre o Hack Squat: 4 series x 8-10 reps',
        'Peso Muerto Rumano: 4 series x 10 reps',
        'Prensa de Piernas 45°: 3 series x 12 reps',
        'Elevación de Gemelos + Core Abdominal: 4 series x 15 reps',
      ],
      supplementTimingNote: suppNote,
    },
    {
      title: 'Jueves: Cardio Metabólico HIIT + Core & Movilidad Activa',
      focusMuscleGroup: 'Quema Calórica Cardiovascular y Abdomen',
      durationMinutes: 40,
      caloriesToBurn: targetBurnCalories,
      intensity: 'Media',
      exercises: [
        'Circuito HIIT (Remo ergómetro, Battle Ropes, Burpees): 20 min',
        'Plancha Abdominal Isométrica + Rueda Abdominal: 4 series',
        'Cardio Zona 2 continuo para completar las calorías objetivo: 15 min',
      ],
      supplementTimingNote: suppNote,
    },
    {
      title: 'Viernes: Torso Completo Hipertrofia (Énfasis Puntos Débiles)',
      focusMuscleGroup: 'Pecho, Espalda y Hombros Laterales',
      durationMinutes: 50,
      caloriesToBurn: targetBurnCalories,
      intensity: 'Alta',
      exercises: [
        'Press Inclinado con Mancuernas: 4 series x 10 reps',
        'Remo Unilateral con Mancuerna: 4 series x 10 reps',
        'Elevaciones Laterales para Hombro 3D: 4 series x 15 reps',
        'Superserie Bíceps + Tríceps: 3 series x 12 reps',
      ],
      supplementTimingNote: suppNote,
    },
    {
      title: 'Sábado: Cadena Posterior, Glúteos y Acondicionamiento',
      focusMuscleGroup: 'Glúteos, Femoral y Resistencia',
      durationMinutes: 45,
      caloriesToBurn: targetBurnCalories,
      intensity: 'Media',
      exercises: [
        'Hip Thrust con Barra: 4 series x 10-12 reps',
        'Zancadas Búlgaras con Mancuernas: 3 series x 10 reps/pierna',
        'Curl Femoral Tumbado: 3 series x 12 reps',
        '15 min de Escaladora (StairMaster) a ritmo constante',
      ],
      supplementTimingNote: suppNote,
    },
    {
      title: 'Domingo: Recuperación Activa, Caminata NEAT y Estiramientos',
      focusMuscleGroup: 'Regeneración Muscular y Quema Suave',
      durationMinutes: 45,
      caloriesToBurn: targetBurnCalories,
      intensity: 'Baja',
      exercises: [
        'Caminata activa al aire libre (8,500 - 10,000 pasos)',
        '15 min de liberación miofascial con Foam Roller y movilidad de cadera',
      ],
      supplementTimingNote:
        '⚡ Mantén tu toma diaria de Creatina y Omega-3 aunque sea día de descanso activo para mantener la saturación muscular.',
    },
  ];
}

function buildShoppingList(
  dietType: string,
  allergies: string[],
  favoriteFoods: string,
  supplements: SupplementRecommendation[]
): ShoppingCategory[] {
  const proteins =
    dietType === 'vegan'
      ? ['Tofu firme y ahumado (3 bloques)', 'Tempeh y Heura / Seitán', 'Garbanzos, lentejas y alubias cocidas', 'Yogures vegetales proteicos de soja', 'Edamames']
      : ['Pechuga de pollo y solomillo de pavo (1.4 kg)', 'Ternera magra y hamburguesa 100% vacuno', 'Salmón fresco, merluza y atún al natural', 'Huevos camperos (1 docena) + bote de claras', 'Yogur Griego / Skyr 0% y Queso Cottage'];

  const carbs = [
    'Copos y harina de avena integral',
    'Quinoa tricolor, arroz basmati y arroz bomba',
    'Boniatos, patatas baby y pasta integral / lenteja roja',
    'Pan integral de masa madre y tortitas de arroz',
  ];

  const veggiesAndFats = [
    'Aguacates Hass (4 uds)',
    'Brócoli, espárragos trigueros, calabacines y pimientos',
    'Espinacas baby, canónigos, rúcula y tomates cherry',
    'Plátanos, arándanos, fresas y kiwis',
    'Aceite de Oliva Virgen Extra (AOVE) y crema 100% cacahuete',
  ];

  const categories: ShoppingCategory[] = [
    { category: '🥩 Proteínas de la Semana (7 Días)', items: proteins },
    { category: '🌾 Hidratos y Energía Limpia', items: carbs },
    { category: '🥑 Verduras, Frutas y Grasas Saludables', items: veggiesAndFats },
  ];

  if (supplements.length > 0) {
    categories.push({
      category: '⚡ Tu Stack de Suplementos GymTrack!',
      items: supplements.map((s) => `${s.icon} ${s.name} (${s.dosage})`),
    });
  }

  return categories;
}

async function callGeminiDietAPI(
  profile: UserProfile,
  preferences: DietaryPreferences,
  metrics: CalorieMetrics,
  apiKey: string
): Promise<WeeklyDietPlan> {
  // Si el usuario introduce su API Key de Gemini, enriquecemos la nota personalizada con Gemini
  // manteniendo las 7 recetas únicas ilustradas y el protocolo completo de suplementos
  const basePlan = buildAdaptiveIntelligentPlan(profile, preferences, metrics);
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Eres el nutricionista deportivo de GymTrack!. Escribe un consejo motivador y técnico de 3 frases en español para ${profile.name} (${profile.weightKg}kg, ${profile.heightCm}cm, objetivo: ${GOAL_LABELS[profile.goal].title}), explicando cómo combinar sus ${metrics.targetCaloriesToConsume} kcal a consumir, ${metrics.targetCaloriesToBurn} kcal a quemar y sus suplementos (${basePlan.supplementsProtocol.map((s) => s.name).join(', ')}).`,
              },
            ],
          },
        ],
      }),
    }
  );
  if (response.ok) {
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      basePlan.aiNote = text.trim();
    }
  }
  return basePlan;
}
