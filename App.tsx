import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar,
  ActivityIndicator,
  Platform,
  useColorScheme,
  Animated,
  Image,
} from 'react-native';
import {
  ActivityLevel,
  DietaryPreferences,
  DietType,
  FitnessGoal,
  Gender,
  LoggedExerciseItem,
  LoggedFoodItem,
  MealRecipe,
  SupplementId,
  UserProfile,
  WeeklyDietPlan,
} from './src/types/nutrition';
import {
  ACTIVITY_LABELS,
  calculateCalorieMetrics,
  DIET_TYPE_LABELS,
  GOAL_LABELS,
  SUPPLEMENT_CATALOG,
} from './src/utils/calorieCalculator';
import { generateAIDietPlan } from './src/services/geminiService';
import {
  ACCENT_PALETTES,
  AccentColorKey,
  resolveTheme,
  ThemeMode,
} from './src/theme/colors';
import { GymTrackLogo } from './src/components/GymTrackLogo';

type AppStage = 'intro' | 'auth' | 'onboarding' | 'main';
type AuthMode = 'login' | 'register';
type ActiveTab = 'diet' | 'routines' | 'fitness_log' | 'settings';
type SettingsSection = 'profile' | 'customize';
type UiTickStyle = 'modern' | 'classic'; // 'modern' = cuadrados limpios, 'classic' = círculos

const ALLERGY_OPTIONS = [
  'Gluten',
  'Lactosa',
  'Frutos secos',
  'Marisco',
  'Huevo',
  'Soja',
];

const makeAvatarSvgDataUri = (emoji: string, bg: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><circle cx="60" cy="60" r="60" fill="${bg}"/><text x="50%" y="54%" font-size="58" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`
  )}`;

const FITNESS_FOOD_AVATARS = [
  { id: 'dumbbell', label: 'Mancuerna', emoji: '🏋️', url: makeAvatarSvgDataUri('🏋️', '#0F172A') },
  { id: 'muscle', label: 'Fuerza', emoji: '💪', url: makeAvatarSvgDataUri('💪', '#065F46') },
  { id: 'shaker', label: 'Proteína', emoji: '🥤', url: makeAvatarSvgDataUri('🥤', '#1E3A8A') },
  { id: 'avocado', label: 'Aguacate', emoji: '🥑', url: makeAvatarSvgDataUri('🥑', '#14532D') },
  { id: 'salad', label: 'Comida Fit', emoji: '🥗', url: makeAvatarSvgDataUri('🥗', '#064E3B') },
  { id: 'meat', label: 'Pollo/Prot', emoji: '🍗', url: makeAvatarSvgDataUri('🍗', '#7C2D12') },
];

const ANIMAL_AVATARS = [
  { id: 'lion', label: 'León', emoji: '🦁', url: makeAvatarSvgDataUri('🦁', '#78350F') },
  { id: 'wolf', label: 'Lobo', emoji: '🐺', url: makeAvatarSvgDataUri('🐺', '#1E293B') },
  { id: 'gorilla', label: 'Gorila', emoji: '🦍', url: makeAvatarSvgDataUri('🦍', '#111827') },
  { id: 'shark', label: 'Tiburón', emoji: '🦈', url: makeAvatarSvgDataUri('🦈', '#0C4A6E') },
  { id: 'eagle', label: 'Águila', emoji: '🦅', url: makeAvatarSvgDataUri('🦅', '#451A03') },
  { id: 'bull', label: 'Toro', emoji: '🐂', url: makeAvatarSvgDataUri('🐂', '#7F1D1D') },
];

const PROFILE_PHOTO_PRESETS = [
  ...FITNESS_FOOD_AVATARS.map((a) => a.url),
  ...ANIMAL_AVATARS.map((a) => a.url),
];

const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface HistoricalDayRecord {
  dayOfMonth: number;
  monthIndex: number;
  monthName: string;
  year: number;
  weekdayIndex: number;
  weekdayShort: string;
  weekdayFull: string;
  isToday: boolean;
  movePct: number;
  dietPct: number;
  hydroPct: number;
  workoutDone: string;
  durationMin: number;
  stepsCount: number;
}

function buildDeviceCalendarDays(
  year: number,
  monthIndex: number
): HistoricalDayRecord[] {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const now = new Date();
  const workoutNames = [
    'Empuje (Pecho, Hombro, Tríceps)',
    'Tracción (Espalda y Bíceps)',
    'Pierna Completa Hipertrofia',
    'Cardio HIIT Metabólico & Core',
    'Torso Completo & Hombro 3D',
    'Glúteos, Femoral y Escaladora',
    'Recuperación Activa 10k Pasos',
  ];
  return Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dObj = new Date(year, monthIndex, dayNum);
    const wIdx = (dObj.getDay() + 6) % 7;
    const isToday =
      dObj.getFullYear() === now.getFullYear() &&
      dObj.getMonth() === now.getMonth() &&
      dObj.getDate() === now.getDate();
    return {
      dayOfMonth: dayNum,
      monthIndex,
      monthName: MONTH_NAMES_ES[monthIndex],
      year,
      weekdayIndex: wIdx,
      weekdayShort: ['L', 'M', 'X', 'J', 'V', 'S', 'D'][wIdx],
      weekdayFull: [
        'Lunes',
        'Martes',
        'Miércoles',
        'Jueves',
        'Viernes',
        'Sábado',
        'Domingo',
      ][wIdx],
      isToday,
      movePct: 0,
      dietPct: 0,
      hydroPct: 0,
      workoutDone: workoutNames[wIdx],
      durationMin: 48,
      stepsCount: 0,
    };
  });
}

const INITIAL_HISTORICAL_DAYS: HistoricalDayRecord[] = buildDeviceCalendarDays(
  new Date().getFullYear(),
  new Date().getMonth()
);

/**
 * Componente visual de 3 Anillos Concéntricos estilo Apple Fitness
 */
function ConcentricFitnessRings({
  size = 38,
  movePct,
  dietPct,
  hydroPct,
}: {
  size?: number;
  movePct: number;
  dietPct: number;
  hydroPct: number;
}) {
  const outer = size;
  const middle = Math.round(size * 0.72);
  const inner = Math.round(size * 0.44);
  const stroke = size > 80 ? 10 : size > 30 ? 3.5 : 2.5;

  return (
    <View
      style={{
        width: outer,
        height: outer,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          position: 'absolute',
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: stroke,
          borderColor: movePct >= 85 ? '#FA114F' : '#FA114F90',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: middle,
          height: middle,
          borderRadius: middle / 2,
          borderWidth: stroke,
          borderColor: dietPct >= 85 ? '#92E82A' : '#92E82A90',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          borderWidth: stroke,
          borderColor: hydroPct >= 85 ? '#00D7FF' : '#00D7FF90',
        }}
      />
    </View>
  );
}

export default function App() {
  const systemColorScheme = useColorScheme();

  // Personalización (Ajustes -> Personalizar)
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [accentKey, setAccentKey] = useState<AccentColorKey>('monochrome');
  const [uiTickStyle, setUiTickStyle] = useState<UiTickStyle>('modern'); // Cuadrados por defecto
  const [showRecipePhotos, setShowRecipePhotos] = useState<boolean>(true);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>(
    PROFILE_PHOTO_PRESETS[1]
  );

  // Rotación semanal de recetas (mezcla recetas nuevas con clásicas)
  const [currentWeekNumber, setCurrentWeekNumber] = useState<number>(1);
  const [dietSubView, setDietSubView] = useState<'meals' | 'shopping'>('meals');
  const [checkedShoppingMap, setCheckedShoppingMap] = useState<
    Record<string, boolean>
  >({});

  // Registro estilo Apple Fitness (Semanal y Mensual)
  const [fitnessViewMode, setFitnessViewMode] = useState<'week' | 'month'>(
    'week'
  );
  const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number>(21);

  const theme = useMemo(
    () => resolveTheme(systemColorScheme, themeMode, accentKey),
    [systemColorScheme, themeMode, accentKey]
  );

  const [appStage, setAppStage] = useState<AppStage>('intro');
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authUsername, setAuthUsername] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [usersDb, setUsersDb] = useState<
    Record<
      string,
      {
        username: string;
        password: string;
        onboardingCompleted: boolean;
        profile: UserProfile;
        preferences: DietaryPreferences;
        profilePhotoUrl: string;
      }
    >
  >({});
  const [onboardingStep, setOnboardingStep] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>('diet');
  const [settingsSection, setSettingsSection] =
    useState<SettingsSection>('profile');

  const logoScale = useRef(new Animated.Value(0.65)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 60,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoScale, logoOpacity]);

  const [profile, setProfile] = useState<UserProfile>({
    name: 'Alex',
    gender: 'male',
    age: 28,
    weightKg: 78,
    heightCm: 176,
    targetWeightKg: 72,
    activityLevel: 'moderate',
    goal: 'lose',
  });

  const [ageInput, setAgeInput] = useState('28');
  const [weightInput, setWeightInput] = useState('78');
  const [heightInput, setHeightInput] = useState('176');
  const [targetWeightInput, setTargetWeightInput] = useState('72');

  const [preferences, setPreferences] = useState<DietaryPreferences>({
    dietType: 'mediterranean',
    allergies: [],
    favoriteFoods: 'Pollo, aguacate, arroz basmati, frutos rojos',
    dislikedFoods: 'Coles de Bruselas, hígado',
    mealsPerDay: 4,
    cookingTime: 'normal',
    budget: 'moderate',
    wantsSupplements: true,
    selectedSupplements: ['whey_protein', 'creatine'],
    allowAiSupplementRecommendations: true,
  });

  const [geminiApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dietPlan, setDietPlan] = useState<WeeklyDietPlan | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [expandedMealId, setExpandedMealId] = useState<string | null>(null);

  const [loggedFoodsByDay, setLoggedFoodsByDay] = useState<
    Record<number, LoggedFoodItem[]>
  >({});
  const [loggedMealIds, setLoggedMealIds] = useState<Record<string, boolean>>(
    {}
  );
  const [loggedExercisesByDay, setLoggedExercisesByDay] = useState<
    Record<number, LoggedExerciseItem[]>
  >({});
  const [waterGlassesByDay, setWaterGlassesByDay] = useState<
    Record<number, number>
  >({});
  const [userRecipePhotos, setUserRecipePhotos] = useState<
    Record<string, string[]>
  >({});
  const [customRecipePhotoUrlInput, setCustomRecipePhotoUrlInput] = useState<
    Record<string, string>
  >({});

  const [customExerciseName, setCustomExerciseName] = useState('');
  const [customExerciseBurn, setCustomExerciseBurn] = useState('');

  const metrics = useMemo(
    () => calculateCalorieMetrics(profile, preferences),
    [profile, preferences]
  );

  // Selector cuadrado ("modern") o circular ("classic") con color azul claro minimalista (#38BDF8)
  const renderTickBox = (checked: boolean) => (
    <View
      style={[
        styles.tickBox,
        {
          borderRadius: uiTickStyle === 'modern' ? 5 : 99,
          borderColor: checked ? '#38BDF8' : theme.textMuted,
          backgroundColor: checked ? '#38BDF8' : 'transparent',
        },
      ]}
    >
      {checked && <Text style={styles.tickCheckMark}>✓</Text>}
    </View>
  );

  const syncNumericProfile = (
    field: 'age' | 'weightKg' | 'heightCm' | 'targetWeightKg',
    raw: string
  ) => {
    const cleaned = raw.replace(/[^0-9.]/g, '');
    if (field === 'age') setAgeInput(cleaned);
    if (field === 'weightKg') setWeightInput(cleaned);
    if (field === 'heightCm') setHeightInput(cleaned);
    if (field === 'targetWeightKg') setTargetWeightInput(cleaned);

    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      setProfile((prev) => ({ ...prev, [field]: num }));
    }
  };

  const toggleAllergy = (allergy: string) => {
    setPreferences((prev) => {
      const exists = prev.allergies.includes(allergy);
      return {
        ...prev,
        allergies: exists
          ? prev.allergies.filter((a) => a !== allergy)
          : [...prev.allergies, allergy],
      };
    });
  };

  const toggleSupplement = (suppId: SupplementId) => {
    setPreferences((prev) => {
      const exists = prev.selectedSupplements.includes(suppId);
      const next = exists
        ? prev.selectedSupplements.filter((s) => s !== suppId)
        : [...prev.selectedSupplements, suppId];
      return {
        ...prev,
        wantsSupplements:
          next.length > 0 || prev.allowAiSupplementRecommendations,
        selectedSupplements: next,
      };
    });
  };

  const handleFinishOnboardingAndGenerate = async () => {
    setIsGenerating(true);
    try {
      const plan = await generateAIDietPlan(
        profile,
        preferences,
        metrics,
        geminiApiKey
      );
      setDietPlan(plan);
      if (currentUser) {
        const key = currentUser.toLowerCase();
        setUsersDb((prev) => ({
          ...prev,
          [key]: {
            username: currentUser,
            password: prev[key]?.password || '',
            onboardingCompleted: true,
            profile,
            preferences,
            profilePhotoUrl,
          },
        }));
      }
      setSelectedDayIdx(0);
      setAppStage('main');
      setActiveTab('diet');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogMealInPlace = (meal: MealRecipe) => {
    const dayKey = selectedDayIdx;
    const already = !!loggedMealIds[meal.id];
    if (already) {
      setLoggedMealIds((prev) => {
        const next = { ...prev };
        delete next[meal.id];
        return next;
      });
      setLoggedFoodsByDay((prev) => ({
        ...prev,
        [dayKey]: (prev[dayKey] || []).filter((f) => f.id !== meal.id),
      }));
    } else {
      setLoggedMealIds((prev) => ({ ...prev, [meal.id]: true }));
      setLoggedFoodsByDay((prev) => ({
        ...prev,
        [dayKey]: [
          {
            id: meal.id,
            name: meal.title,
            mealType: meal.mealType,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
          ...(prev[dayKey] || []),
        ],
      }));
    }
    setSelectedHistoryIdx(21 + dayKey);
  };

  const handleLogWorkoutInPlace = (
    title: string,
    durationMinutes: number,
    caloriesToBurn: number
  ) => {
    const dayKey = selectedDayIdx;
    setLoggedExercisesByDay((prev) => ({
      ...prev,
      [dayKey]: [
        {
          id: `${Date.now()}-${Math.random()}`,
          name: title,
          durationMinutes,
          caloriesBurned: caloriesToBurn,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
        ...(prev[dayKey] || []),
      ],
    }));
    setSelectedHistoryIdx(21 + dayKey);
  };

  const handleAddCustomExercise = () => {
    const burn = parseInt(customExerciseBurn, 10);
    if (!customExerciseName.trim() || isNaN(burn) || burn <= 0) return;
    const dayKey = selectedDayIdx;
    setLoggedExercisesByDay((prev) => ({
      ...prev,
      [dayKey]: [
        {
          id: `${Date.now()}`,
          name: customExerciseName.trim(),
          durationMinutes: 40,
          caloriesBurned: burn,
          timestamp: new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
        ...(prev[dayKey] || []),
      ],
    }));
    setCustomExerciseName('');
    setCustomExerciseBurn('');
    setSelectedHistoryIdx(21 + dayKey);
  };

  const loggedFoods = loggedFoodsByDay[selectedDayIdx] || [];
  const loggedExercises = loggedExercisesByDay[selectedDayIdx] || [];
  const waterGlasses = waterGlassesByDay[selectedDayIdx] || 0;

  const computeDayRealtimeRings = (historyIndex: number) => {
    const baseRec =
      INITIAL_HISTORICAL_DAYS[historyIndex] || INITIAL_HISTORICAL_DAYS[21];
    if (historyIndex >= 21) {
      const wDay = historyIndex - 21;
      const dFoods = loggedFoodsByDay[wDay] || [];
      const dEx = loggedExercisesByDay[wDay] || [];
      const dWater = waterGlassesByDay[wDay] || 0;
      const cKcal = dFoods.reduce((a, b) => a + b.calories, 0);
      const bKcal = dEx.reduce((a, b) => a + b.caloriesBurned, 0);
      const wLiters = dWater * 0.25;
      return {
        ...baseRec,
        movePct: Math.min(
          100,
          Math.round((bKcal / metrics.targetCaloriesToBurn) * 100)
        ),
        dietPct: Math.min(
          100,
          Math.round((cKcal / metrics.targetCaloriesToConsume) * 100)
        ),
        hydroPct: Math.min(
          100,
          Math.round((wLiters / metrics.waterLitersPerDay) * 100)
        ),
        liveConsumedKcal: cKcal,
        liveBurnedKcal: bKcal,
        liveWaterLiters: wLiters,
        foods: dFoods,
        exercises: dEx,
      };
    }
    return {
      ...baseRec,
      liveConsumedKcal: Math.round(
        (baseRec.dietPct / 100) * metrics.targetCaloriesToConsume
      ),
      liveBurnedKcal: Math.round(
        (baseRec.movePct / 100) * metrics.targetCaloriesToBurn
      ),
      liveWaterLiters: Number(
        ((baseRec.hydroPct / 100) * metrics.waterLitersPerDay).toFixed(2)
      ),
      foods: [] as LoggedFoodItem[],
      exercises: [] as LoggedExerciseItem[],
    };
  };

  const totalCaloriesConsumed = loggedFoods.reduce(
    (acc, f) => acc + f.calories,
    0
  );
  const totalProteinConsumed = loggedFoods.reduce(
    (acc, f) => acc + f.protein,
    0
  );
  const totalCarbsConsumed = loggedFoods.reduce((acc, f) => acc + f.carbs, 0);
  const totalFatConsumed = loggedFoods.reduce((acc, f) => acc + f.fat, 0);
  const totalCaloriesBurned = loggedExercises.reduce(
    (acc, e) => acc + e.caloriesBurned,
    0
  );

  // ============================================================================
  // 1. PANTALLA INTRO LIMPIA (SOLO LOGO GT! Y FRASES DEBAJO, SIN PÁRRAFO)
  // ============================================================================
  if (appStage === 'intro') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.background}
        />
        <View style={styles.introContainer}>
          <View />
          <Animated.View
            style={{
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
              alignItems: 'center',
            }}
          >
            <GymTrackLogo
              size="large"
              showBrandName
              textColor={theme.textPrimary}
              subtitleColor={theme.textMuted}
            />
          </Animated.View>

          <View style={styles.introBottomArea}>
            {currentUser &&
            usersDb[currentUser.toLowerCase()]?.onboardingCompleted ? (
              <View style={{ width: '100%', gap: 10 }}>
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      marginBottom: 0,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Image
                      source={{ uri: profilePhotoUrl }}
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        borderWidth: 2,
                        borderColor: theme.accentPrimary,
                      }}
                    />
                    <View>
                      <Text
                        style={{
                          color: theme.textPrimary,
                          fontWeight: '900',
                          fontSize: 13.5,
                        }}
                      >
                        Hola, {profile.name}
                      </Text>
                      <Text
                        style={{
                          color: theme.textMuted,
                          fontWeight: '700',
                          fontSize: 11,
                        }}
                      >
                        @{currentUser} • Sesión guardada
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.editWizardPill,
                      {
                        backgroundColor: theme.surfaceElevated,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => {
                      setAuthMode('login');
                      setAppStage('auth');
                    }}
                  >
                    <Text
                      style={{
                        color: theme.textSecondary,
                        fontSize: 11,
                        fontWeight: '800',
                      }}
                    >
                      Cambiar cuenta
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.introStartButton,
                    { backgroundColor: theme.accentPrimary },
                  ]}
                  onPress={() => setAppStage('main')}
                >
                  <Text style={styles.introStartButtonText}>Entrar →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.introStartButton,
                  { backgroundColor: theme.accentPrimary },
                ]}
                onPress={() => setAppStage('auth')}
              >
                <Text style={styles.introStartButtonText}>
                  Registrarse / Iniciar Sesión →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // 1.5. PANTALLA DE ACCESO CON USUARIO Y CONTRASEÑA (GUARDADO POR USUARIO)
  // ============================================================================
  if (appStage === 'auth') {
    const handleAuthAction = async () => {
      const u = authUsername.trim();
      const p = authPassword.trim();
      if (!u || !p) {
        setAuthError('Introduce tu usuario y contraseña.');
        return;
      }
      const key = u.toLowerCase();
      if (authMode === 'login') {
        const acc = usersDb[key];
        if (!acc) {
          setAuthError('Ese usuario no existe aún. Pulsa en Crear Cuenta.');
          return;
        }
        if (acc.password !== p) {
          setAuthError('Contraseña incorrecta.');
          return;
        }
        setAuthError('');
        setCurrentUser(acc.username);
        setProfile(acc.profile);
        setPreferences(acc.preferences);
        setProfilePhotoUrl(acc.profilePhotoUrl);
        if (acc.onboardingCompleted) {
          const plan = await generateAIDietPlan(
            acc.profile,
            acc.preferences,
            calculateCalorieMetrics(acc.profile, acc.preferences),
            geminiApiKey
          );
          setDietPlan(plan);
          setAppStage('main');
        } else {
          setOnboardingStep(1);
          setAppStage('onboarding');
        }
      } else {
        if (usersDb[key]) {
          setAuthError('Ese usuario ya existe. Inicia sesión con tu contraseña.');
          return;
        }
        setAuthError('');
        setCurrentUser(u);
        const initialProfile: UserProfile = {
          ...profile,
          name: u,
        };
        setProfile(initialProfile);
        setUsersDb((prev) => ({
          ...prev,
          [key]: {
            username: u,
            password: p,
            onboardingCompleted: false,
            profile: initialProfile,
            preferences,
            profilePhotoUrl,
          },
        }));
        setOnboardingStep(1);
        setAppStage('onboarding');
      }
    };

    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <View style={styles.contentContainer}>
          <View style={styles.segmentedRow}>
            <TouchableOpacity
              style={[
                styles.segmentedBtn,
                {
                  backgroundColor:
                    authMode === 'login' ? theme.accentPrimary : theme.surface,
                  borderColor:
                    authMode === 'login' ? theme.accentPrimary : theme.border,
                },
              ]}
              onPress={() => {
                setAuthMode('login');
                setAuthError('');
              }}
            >
              <Text
                style={[
                  styles.segmentedBtnText,
                  {
                    color: authMode === 'login' ? '#090D16' : theme.textPrimary,
                  },
                ]}
              >
                🔑 Iniciar Sesión
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentedBtn,
                {
                  backgroundColor:
                    authMode === 'register'
                      ? theme.accentPrimary
                      : theme.surface,
                  borderColor:
                    authMode === 'register'
                      ? theme.accentPrimary
                      : theme.border,
                },
              ]}
              onPress={() => {
                setAuthMode('register');
                setAuthError('');
              }}
            >
              <Text
                style={[
                  styles.segmentedBtnText,
                  {
                    color:
                      authMode === 'register' ? '#090D16' : theme.textPrimary,
                  },
                ]}
              >
                ✨ Crear Cuenta
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.stepBadge, { color: theme.accentPrimary }]}>
              {authMode === 'login'
                ? 'ACCESO A TU CUENTA GUARDADA'
                : 'REGISTRO POR ÚNICA VEZ'}
            </Text>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              {authMode === 'login'
                ? 'Inicia sesión con tu usuario'
                : 'Crea tu usuario y contraseña'}
            </Text>
            {authError ? (
              <Text
                style={{
                  color: '#EF4444',
                  fontSize: 12,
                  fontWeight: '700',
                  marginBottom: 8,
                }}
              >
                ⚠️ {authError}
              </Text>
            ) : null}

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              👤 Usuario
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="Ej: kenku"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              value={authUsername}
              onChangeText={setAuthUsername}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              🔒 Contraseña
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  color: theme.textPrimary,
                },
              ]}
              placeholder="Contraseña"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              value={authPassword}
              onChangeText={setAuthPassword}
            />

            <TouchableOpacity
              style={[
                styles.primaryCtaButton,
                { backgroundColor: theme.accentPrimary, marginTop: 10 },
              ]}
              onPress={handleAuthAction}
            >
              <Text style={styles.primaryCtaText}>
                {authMode === 'login'
                  ? '🔑 Entrar a mi Cuenta →'
                  : '✨ Crear Cuenta y Configurar →'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // 2. ASISTENTE INICIAL ORDENADO EN 5 PASOS (CON TICS CUADRADOS MODERNOS)
  // ============================================================================
  if (appStage === 'onboarding') {
    return (
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: theme.background }]}
      >
        <StatusBar
          barStyle={theme.isDark ? 'light-content' : 'dark-content'}
          backgroundColor={theme.menuBackground}
        />

        <View
          style={[
            styles.onboardingHeader,
            {
              backgroundColor: theme.menuBackground,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <View style={styles.brandRow}>
            <GymTrackLogo size="small" />
            <View style={{ marginLeft: 10 }}>
              <Text
                style={[styles.headerBrandTitle, { color: theme.textPrimary }]}
              >
                GymTrack!
              </Text>
              <Text style={[styles.headerBrandSub, { color: theme.textMuted }]}>
                Paso {onboardingStep} de 5 • Configuración
              </Text>
            </View>
          </View>

          <View style={styles.stepDotsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      s <= onboardingStep ? theme.accentPrimary : theme.border,
                    width: s === onboardingStep ? 22 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
        >
          {onboardingStep === 1 && (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.stepBadge, { color: theme.accentPrimary }]}>
                PASO 1 DE 5 • SOBRE TI
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                ¿Cómo te llamas y cuál es tu perfil?
              </Text>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Tu Nombre
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  },
                ]}
                value={profile.name}
                onChangeText={(t) => setProfile((p) => ({ ...p, name: t }))}
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Género Biológico
              </Text>
              <View style={styles.segmentedRow}>
                {(['male', 'female'] as Gender[]).map((g) => {
                  const selected = profile.gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[
                        styles.segmentedBtn,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: selected
                            ? theme.accentPrimary
                            : theme.border,
                        },
                      ]}
                      onPress={() => setProfile((p) => ({ ...p, gender: g }))}
                    >
                      <Text
                        style={[
                          styles.segmentedBtnText,
                          {
                            color: selected
                              ? theme.accentPrimary
                              : theme.textMuted,
                          },
                        ]}
                      >
                        {g === 'male' ? '♂ Hombre' : '♀ Mujer'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Edad (años)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  },
                ]}
                keyboardType="numeric"
                value={ageInput}
                onChangeText={(v) => syncNumericProfile('age', v)}
              />
            </View>
          )}

          {onboardingStep === 2 && (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.stepBadge, { color: theme.accentPrimary }]}>
                PASO 2 DE 5 • MEDIDAS CORPORALES
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Introduce tu peso y altura
              </Text>

              <View style={styles.twoColRow}>
                <View style={styles.colHalf}>
                  <Text
                    style={[styles.inputLabel, { color: theme.textSecondary }]}
                  >
                    Peso Actual (kg)
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      },
                    ]}
                    keyboardType="numeric"
                    value={weightInput}
                    onChangeText={(v) => syncNumericProfile('weightKg', v)}
                  />
                </View>

                <View style={styles.colHalf}>
                  <Text
                    style={[styles.inputLabel, { color: theme.textSecondary }]}
                  >
                    Altura (cm)
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      },
                    ]}
                    keyboardType="numeric"
                    value={heightInput}
                    onChangeText={(v) => syncNumericProfile('heightCm', v)}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Peso Objetivo (kg)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                    color: theme.textPrimary,
                  },
                ]}
                keyboardType="numeric"
                value={targetWeightInput}
                onChangeText={(v) => syncNumericProfile('targetWeightKg', v)}
              />
            </View>
          )}

          {onboardingStep === 3 && (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.stepBadge, { color: theme.accentPrimary }]}>
                PASO 3 DE 5 • ACTIVIDAD Y OBJETIVO
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                ¿Cuánto entrenas y cuál es tu meta?
              </Text>

              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => {
                const selected = profile.activityLevel === level;
                const info = ACTIVITY_LABELS[level];
                return (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: selected
                          ? theme.accentPrimary
                          : theme.border,
                      },
                    ]}
                    onPress={() =>
                      setProfile((p) => ({ ...p, activityLevel: level }))
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionTitle,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {info.title}
                      </Text>
                      <Text
                        style={[
                          styles.optionSubtitle,
                          { color: theme.textMuted },
                        ]}
                      >
                        {info.subtitle}
                      </Text>
                    </View>
                    {renderTickBox(selected)}
                  </TouchableOpacity>
                );
              })}

              <Text
                style={[
                  styles.inputLabel,
                  { color: theme.textSecondary, marginTop: 12 },
                ]}
              >
                Tu Objetivo Corporal
              </Text>
              {(Object.keys(GOAL_LABELS) as FitnessGoal[]).map((gKey) => {
                const selected = profile.goal === gKey;
                const info = GOAL_LABELS[gKey];
                return (
                  <TouchableOpacity
                    key={gKey}
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: selected
                          ? theme.accentPrimary
                          : theme.border,
                      },
                    ]}
                    onPress={() => setProfile((p) => ({ ...p, goal: gKey }))}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionTitle,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {info.title}
                      </Text>
                      <Text
                        style={[
                          styles.optionSubtitle,
                          { color: theme.textMuted },
                        ]}
                      >
                        {info.subtitle}
                      </Text>
                    </View>
                    {renderTickBox(selected)}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {onboardingStep === 4 && (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.stepBadge, { color: theme.accentPrimary }]}>
                PASO 4 DE 5 • PREFERENCIAS ALIMENTICIAS
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                ¿Qué tipo de dieta y alimentos prefieres?
              </Text>

              {(Object.keys(DIET_TYPE_LABELS) as DietType[]).map((dKey) => {
                const info = DIET_TYPE_LABELS[dKey];
                const selected = preferences.dietType === dKey;
                return (
                  <TouchableOpacity
                    key={dKey}
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: selected
                          ? theme.accentPrimary
                          : theme.border,
                      },
                    ]}
                    onPress={() =>
                      setPreferences((p) => ({ ...p, dietType: dKey }))
                    }
                  >
                    <Text style={styles.dietIcon}>{info.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionTitle,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {info.title}
                      </Text>
                      <Text
                        style={[
                          styles.optionSubtitle,
                          { color: theme.textMuted },
                        ]}
                      >
                        {info.desc}
                      </Text>
                    </View>
                    {renderTickBox(selected)}
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                🚫 Alergias o Intolerancias
              </Text>
              <View style={styles.chipsContainer}>
                {ALLERGY_OPTIONS.map((allergy) => {
                  const active = preferences.allergies.includes(allergy);
                  return (
                    <TouchableOpacity
                      key={allergy}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: theme.border,
                        },
                        active && styles.chipActive,
                      ]}
                      onPress={() => toggleAllergy(allergy)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: theme.textMuted },
                          active && styles.chipTextActive,
                        ]}
                      >
                        {active ? `✓ Sin ${allergy}` : allergy}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {onboardingStep === 5 && (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.stepBadge, { color: theme.accentPrimary }]}>
                PASO 5 DE 5 • SUPLEMENTOS DE GIMNASIO E IA
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                ¿Qué suplementos tomas o quieres añadir?
              </Text>

              <TouchableOpacity
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: preferences.allowAiSupplementRecommendations
                      ? theme.accentPrimary
                      : theme.border,
                  },
                ]}
                onPress={() =>
                  setPreferences((p) => ({
                    ...p,
                    allowAiSupplementRecommendations:
                      !p.allowAiSupplementRecommendations,
                  }))
                }
              >
                <Text style={{ fontSize: 22, marginRight: 10 }}>🧠</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.optionTitle, { color: theme.textPrimary }]}
                  >
                    Permitir que la IA me recomiende suplementos extra
                  </Text>
                  <Text
                    style={[styles.optionSubtitle, { color: theme.textMuted }]}
                  >
                    Integrados en el apartado de Rutinas con explicación de su
                    aportación
                  </Text>
                </View>
                {renderTickBox(preferences.allowAiSupplementRecommendations)}
              </TouchableOpacity>

              {(Object.keys(SUPPLEMENT_CATALOG) as SupplementId[]).map(
                (suppId) => {
                  const info = SUPPLEMENT_CATALOG[suppId];
                  const selected =
                    preferences.selectedSupplements.includes(suppId);
                  return (
                    <TouchableOpacity
                      key={suppId}
                      style={[
                        styles.optionRow,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: selected
                            ? theme.accentPrimary
                            : theme.border,
                        },
                      ]}
                      onPress={() => toggleSupplement(suppId)}
                    >
                      <Text style={styles.dietIcon}>{info.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.optionTitle,
                            { color: theme.textPrimary },
                          ]}
                        >
                          {info.name}
                        </Text>
                        <Text
                          style={[
                            styles.optionSubtitle,
                            { color: theme.textMuted },
                          ]}
                        >
                          {info.shortDesc}
                        </Text>
                      </View>
                      {renderTickBox(selected)}
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          )}

          <View style={styles.wizardButtonsRow}>
            <TouchableOpacity
              style={[
                styles.wizardBackBtn,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
              onPress={() =>
                onboardingStep > 1
                  ? setOnboardingStep((s) => s - 1)
                  : setAppStage('intro')
              }
            >
              <Text
                style={[styles.wizardBackBtnText, { color: theme.textPrimary }]}
              >
                ← {onboardingStep > 1 ? 'Atrás' : 'Intro'}
              </Text>
            </TouchableOpacity>

            {onboardingStep < 5 ? (
              <TouchableOpacity
                style={[
                  styles.wizardNextBtn,
                  { backgroundColor: theme.accentPrimary },
                ]}
                onPress={() => setOnboardingStep((s) => s + 1)}
              >
                <Text style={styles.wizardNextBtnText}>
                  Siguiente ({onboardingStep}/5) →
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.wizardNextBtn,
                  { backgroundColor: theme.accentPrimary },
                ]}
                onPress={handleFinishOnboardingAndGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#090D16" />
                    <Text style={styles.wizardNextBtnText}>
                      Generando Plan IA...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.wizardNextBtnText}>
                    ✨ Entrar a GymTrack!
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ============================================================================
  // 3. DASHBOARD PRINCIPAL DE GYMTRACK!
  // ============================================================================
  const consumedPct = Math.min(
    100,
    Math.round((totalCaloriesConsumed / metrics.targetCaloriesToConsume) * 100)
  );
  const burnedPct = Math.min(
    100,
    Math.round((totalCaloriesBurned / metrics.targetCaloriesToBurn) * 100)
  );

  const selectedRecord = computeDayRealtimeRings(selectedHistoryIdx);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.background }]}
    >
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.menuBackground}
      />

      {/* Cabecera Superior con Logo GT!, Foto de Perfil y Botón "⚙️ Ajustes" */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.menuBackground,
            borderBottomColor: theme.border,
          },
        ]}
      >
        <View style={styles.brandRow}>
          <GymTrackLogo size="small" />
          <Image
            source={{ uri: profilePhotoUrl }}
            style={[
              styles.headerAvatar,
              { borderColor: theme.accentPrimary },
            ]}
          />
          <View style={{ marginLeft: 8 }}>
            <Text style={[styles.appTitle, { color: theme.textPrimary }]}>
              GymTrack!
            </Text>
            <Text style={[styles.appSubtitle, { color: theme.textMuted }]}>
              Hola, {profile.name}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.editWizardPill,
            {
              backgroundColor:
                activeTab === 'settings'
                  ? theme.accentPrimary
                  : theme.surfaceElevated,
              borderColor:
                activeTab === 'settings' ? theme.accentPrimary : theme.border,
            },
          ]}
          onPress={() => setActiveTab('settings')}
        >
          <Text
            style={[
              styles.editWizardPillText,
              {
                color:
                  activeTab === 'settings' ? '#090D16' : theme.textPrimary,
              },
            ]}
          >
            ⚙️ Ajustes
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= PESTAÑA 1: DIETAS (CON "MEDIDOR" Y ROTACIÓN SEMANAL DE RECETAS NUEVAS + VIEJAS) ================= */}
        {activeTab === 'diet' && dietPlan && (
          <View>
            {/* MEDIDOR SUPERIOR */}
            <View
              style={[
                styles.liveGaugeCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.accentPrimary,
                },
              ]}
            >
              <View style={styles.gaugeHeaderRow}>
                <Text
                  style={[styles.heroOverline, { color: theme.accentPrimary }]}
                >
                  ⚡ MEDIDOR
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setWaterGlassesByDay((prev) => ({
                      ...prev,
                      [selectedDayIdx]: (prev[selectedDayIdx] || 0) + 1,
                    }))
                  }
                  style={[
                    styles.waterMiniBadge,
                    { backgroundColor: theme.surfaceElevated },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.accentBlue,
                      fontSize: 11,
                      fontWeight: '800',
                    }}
                  >
                    💧 {(waterGlasses * 0.25).toFixed(2)}L /{' '}
                    {metrics.waterLitersPerDay}L (+1)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.gaugeBarGroup}>
                <View style={styles.gaugeBarLabels}>
                  <Text
                    style={[styles.gaugeLabelText, { color: theme.textPrimary }]}
                  >
                    🍽️ Calorías Consumidas
                  </Text>
                  <Text
                    style={[
                      styles.gaugeValueText,
                      { color: theme.accentPrimary },
                    ]}
                  >
                    {totalCaloriesConsumed} / {metrics.targetCaloriesToConsume}{' '}
                    kcal ({consumedPct}%)
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBarBg,
                    { backgroundColor: theme.surfaceElevated },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFillGreen,
                      {
                        width: `${consumedPct}%`,
                        backgroundColor: theme.accentPrimary,
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.gaugeBarGroup}>
                <View style={styles.gaugeBarLabels}>
                  <Text
                    style={[styles.gaugeLabelText, { color: theme.textPrimary }]}
                  >
                    🔥 Calorías Quemadas (Gym)
                  </Text>
                  <Text
                    style={[
                      styles.gaugeValueText,
                      { color: theme.accentOrange },
                    ]}
                  >
                    {totalCaloriesBurned} / {metrics.targetCaloriesToBurn} kcal
                    ({burnedPct}%)
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBarBg,
                    { backgroundColor: theme.surfaceElevated },
                  ]}
                >
                  <View
                    style={[
                      styles.progressBarFillOrange,
                      { width: `${burnedPct}%` },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.liveMacrosRow}>
                <View
                  style={[
                    styles.liveMacroBox,
                    { backgroundColor: theme.surfaceElevated },
                  ]}
                >
                  <Text
                    style={{
                      color: '#38BDF8',
                      fontWeight: '900',
                      fontSize: 13,
                    }}
                  >
                    {totalProteinConsumed} / {metrics.macros.proteinGrams}g
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                    Proteína
                  </Text>
                </View>
                <View
                  style={[
                    styles.liveMacroBox,
                    { backgroundColor: theme.surfaceElevated },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.accentPrimary,
                      fontWeight: '900',
                      fontSize: 13,
                    }}
                  >
                    {totalCarbsConsumed} / {metrics.macros.carbsGrams}g
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                    Carbos
                  </Text>
                </View>
                <View
                  style={[
                    styles.liveMacroBox,
                    { backgroundColor: theme.surfaceElevated },
                  ]}
                >
                  <Text
                    style={{
                      color: '#FBBF24',
                      fontWeight: '900',
                      fontSize: 13,
                    }}
                  >
                    {totalFatConsumed} / {metrics.macros.fatGrams}g
                  </Text>
                  <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                    Grasas
                  </Text>
                </View>
              </View>
            </View>

            {/* Selector de Semana (Mezcla recetas nuevas IA junto a clásicas favoritas) */}
            <View
              style={[
                styles.weekSwitcherBar,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.weekMiniBtn,
                  { backgroundColor: theme.surfaceElevated },
                ]}
                onPress={() =>
                  setCurrentWeekNumber((w) => Math.max(1, w - 1))
                }
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 11,
                    fontWeight: '800',
                  }}
                >
                  ◀ Sem. ant.
                </Text>
              </TouchableOpacity>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 12,
                    fontWeight: '900',
                  }}
                >
                  📅 Semana {currentWeekNumber} del Plan
                </Text>
                <Text style={{ color: theme.textMuted, fontSize: 10 }}>
                  Combina recetas nuevas IA + tus favoritas
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.weekMiniBtn,
                  { backgroundColor: theme.surfaceElevated },
                ]}
                onPress={() => setCurrentWeekNumber((w) => (w % 4) + 1)}
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontSize: 11,
                    fontWeight: '800',
                  }}
                >
                  Sem. sig. ▶
                </Text>
              </TouchableOpacity>
            </View>

            {/* Selector dentro de Dietas: Recetas de la Semana vs Lista de Compras Semanal */}
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segmentedBtn,
                  {
                    backgroundColor:
                      dietSubView === 'meals'
                        ? theme.accentPrimary
                        : theme.surface,
                    borderColor:
                      dietSubView === 'meals'
                        ? theme.accentPrimary
                        : theme.border,
                  },
                ]}
                onPress={() => setDietSubView('meals')}
              >
                <Text
                  style={[
                    styles.segmentedBtnText,
                    {
                      color:
                        dietSubView === 'meals'
                          ? theme.isDark
                            ? '#090D16'
                            : '#FFFFFF'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  🍽️ Recetas de la Semana
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentedBtn,
                  {
                    backgroundColor:
                      dietSubView === 'shopping'
                        ? theme.accentPrimary
                        : theme.surface,
                    borderColor:
                      dietSubView === 'shopping'
                        ? theme.accentPrimary
                        : theme.border,
                  },
                ]}
                onPress={() => setDietSubView('shopping')}
              >
                <Text
                  style={[
                    styles.segmentedBtnText,
                    {
                      color:
                        dietSubView === 'shopping'
                          ? theme.isDark
                            ? '#090D16'
                            : '#FFFFFF'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  🛒 Compras Semanales
                </Text>
              </TouchableOpacity>
            </View>

            {dietSubView === 'shopping' ? (
              <View>
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.stepBadge, { color: theme.accentPrimary }]}
                  >
                    🛒 LISTA DE LA COMPRA SEMANAL TOTAL
                  </Text>
                  <Text
                    style={[styles.sectionTitle, { color: theme.textPrimary }]}
                  >
                    Todo lo necesario para las recetas de la Semana{' '}
                    {currentWeekNumber}
                  </Text>
                  <Text
                    style={{
                      color: theme.textMuted,
                      fontSize: 12,
                      marginBottom: 10,
                    }}
                  >
                    Ingredientes sumados para los 7 días de Lunes a Domingo:
                  </Text>
                  {dietPlan.shoppingList.map((catGroup, gIdx) => (
                    <View key={gIdx} style={{ marginBottom: 12 }}>
                      <Text
                        style={{
                          color: theme.textPrimary,
                          fontWeight: '900',
                          fontSize: 13.5,
                          marginBottom: 6,
                        }}
                      >
                        {catGroup.category}
                      </Text>
                      {catGroup.items.map((shopItem, sIdx) => {
                        const sKey = `${catGroup.category}-${sIdx}`;
                        const checked = !!checkedShoppingMap[sKey];
                        return (
                          <TouchableOpacity
                            key={sKey}
                            style={[
                              styles.optionRow,
                              {
                                backgroundColor: theme.inputBg,
                                borderColor: checked ? '#38BDF8' : theme.border,
                              },
                            ]}
                            onPress={() =>
                              setCheckedShoppingMap((prev) => ({
                                ...prev,
                                [sKey]: !prev[sKey],
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.optionTitle,
                                {
                                  color: theme.textPrimary,
                                  flex: 1,
                                  textDecorationLine: checked
                                    ? 'line-through'
                                    : 'none',
                                  opacity: checked ? 0.65 : 1,
                                },
                              ]}
                            >
                              {shopItem}
                            </Text>
                            {renderTickBox(checked)}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <>
                {/* Selector de los 7 Días */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.daySelectorScroll}
                >
              {dietPlan.days.map((d, idx) => {
                const active = selectedDayIdx === idx;
                return (
                  <TouchableOpacity
                    key={d.dayName}
                    style={[
                      styles.dayTab,
                      {
                        backgroundColor: active
                          ? theme.accentPrimary
                          : theme.surface,
                        borderColor: active
                          ? theme.accentPrimary
                          : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedDayIdx(idx)}
                  >
                    <Text
                      style={[
                        styles.dayTabText,
                        { color: active ? '#090D16' : theme.textMuted },
                      ]}
                    >
                      {d.dayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Tarjetas de Comidas del Día (Sin imágenes IA predefinidas; incluye apartado para registrar tus propias fotos) */}
            {dietPlan.days[selectedDayIdx]?.meals.map((meal, mealIdx) => {
              const isExpanded = expandedMealId === meal.id;
              const mealKey = `w${currentWeekNumber}-${meal.id}`;
              const alreadyLogged = !!loggedMealIds[mealKey];
              const isNewThisWeek =
                currentWeekNumber > 1 &&
                (selectedDayIdx + currentWeekNumber + mealIdx) % 2 === 0;
              const myMealPhotos = userRecipePhotos[mealKey] || [];

              return (
                <View
                  key={meal.id}
                  style={[
                    styles.mealCard,
                    {
                      backgroundColor: theme.surface,
                      borderColor: alreadyLogged
                        ? theme.accentPrimary
                        : theme.border,
                    },
                  ]}
                >
                  <View style={styles.mealHeaderRow}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <View
                        style={[
                          styles.mealTypeBadge,
                          { backgroundColor: theme.surfaceElevated },
                        ]}
                      >
                        <Text
                          style={[
                            styles.mealTypeBadgeText,
                            { color: theme.accentBlue },
                          ]}
                        >
                          {meal.mealType} • {meal.time}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor: isNewThisWeek
                            ? theme.accentPrimary
                            : theme.surfaceElevated,
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                          borderRadius: 99,
                        }}
                      >
                        <Text
                          style={{
                            color: isNewThisWeek ? '#090D16' : theme.textMuted,
                            fontSize: 9,
                            fontWeight: '900',
                          }}
                        >
                          {isNewThisWeek ? '✨ NUEVA SEMANA' : '⭐ CLÁSICA'}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.mealCaloriesText,
                        { color: theme.accentPrimary },
                      ]}
                    >
                      🔥 {meal.calories} kcal
                    </Text>
                  </View>

                  <Text style={[styles.mealTitle, { color: theme.textPrimary }]}>
                    {meal.title}
                  </Text>
                  <Text
                    style={[
                      styles.mealDescription,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {meal.description}
                  </Text>

                  {meal.supplementPairing && (
                    <View
                      style={[
                        styles.supplementInlineTag,
                        {
                          backgroundColor: theme.surfaceElevated,
                          borderColor: theme.accentPrimary,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: theme.accentPrimary,
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        {meal.supplementPairing}
                      </Text>
                    </View>
                  )}

                  <View style={styles.mealMacrosRow}>
                    <Text
                      style={[
                        styles.mealMacroTag,
                        {
                          backgroundColor: theme.surfaceElevated,
                          color: theme.textSecondary,
                        },
                      ]}
                    >
                      🥩 Prot: {meal.protein}g
                    </Text>
                    <Text
                      style={[
                        styles.mealMacroTag,
                        {
                          backgroundColor: theme.surfaceElevated,
                          color: theme.textSecondary,
                        },
                      ]}
                    >
                      🌾 Carbs: {meal.carbs}g
                    </Text>
                    <Text
                      style={[
                        styles.mealMacroTag,
                        {
                          backgroundColor: theme.surfaceElevated,
                          color: theme.textSecondary,
                        },
                      ]}
                    >
                      🥑 Grasas: {meal.fat}g
                    </Text>
                  </View>

                  {isExpanded && (
                    <View
                      style={[
                        styles.recipeDetailsBox,
                        {
                          backgroundColor: theme.surfaceElevated,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.recipeSubheading,
                          { color: theme.accentPrimary },
                        ]}
                      >
                        🛒 Ingredientes:
                      </Text>
                      {meal.ingredients.map((ing, i) => (
                        <Text
                          key={i}
                          style={[
                            styles.recipeBullet,
                            { color: theme.textSecondary },
                          ]}
                        >
                          • {ing}
                        </Text>
                      ))}
                      <Text
                        style={[
                          styles.recipeSubheading,
                          { color: theme.accentPrimary, marginTop: 8 },
                        ]}
                      >
                        👨‍🍳 Preparación paso a paso:
                      </Text>
                      {meal.steps.map((step, i) => (
                        <Text
                          key={i}
                          style={[
                            styles.recipeBullet,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {i + 1}. {step}
                        </Text>
                      ))}
                    </View>
                  )}

                  {/* Apartado en la misma tarjeta para registrar tú tus propias fotos de cada receta */}
                  <View
                    style={[
                      styles.recipeDetailsBox,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                        marginTop: 8,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: theme.accentPrimary,
                        fontSize: 11,
                        fontWeight: '800',
                        marginBottom: 6,
                      }}
                    >
                      📸 Tus fotos registradas de esta receta ({myMealPhotos.length})
                    </Text>

                    {showRecipePhotos &&
                      myMealPhotos.map((uri, pIdx) => (
                        <Image
                          key={`${uri}-${pIdx}`}
                          source={{ uri }}
                          style={{
                            width: '100%',
                            height: 140,
                            borderRadius: 10,
                            marginBottom: 6,
                          }}
                          resizeMode="cover"
                        />
                      ))}

                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            flex: 1,
                            marginBottom: 0,
                            backgroundColor: theme.surface,
                            borderColor: theme.border,
                            color: theme.textPrimary,
                          },
                        ]}
                        placeholder="Pega URL o ruta de tu foto del plato..."
                        placeholderTextColor={theme.textMuted}
                        value={customRecipePhotoUrlInput[mealKey] || ''}
                        onChangeText={(txt) =>
                          setCustomRecipePhotoUrlInput((prev) => ({
                            ...prev,
                            [mealKey]: txt,
                          }))
                        }
                      />
                      <TouchableOpacity
                        style={[
                          styles.logMealBtn,
                          {
                            flex: 0,
                            paddingHorizontal: 12,
                            backgroundColor: theme.accentPrimary,
                            borderColor: theme.accentPrimary,
                          },
                        ]}
                        onPress={() => {
                          const raw = (
                            customRecipePhotoUrlInput[mealKey] || ''
                          ).trim();
                          if (!raw) return;
                          setUserRecipePhotos((prev) => ({
                            ...prev,
                            [mealKey]: [...(prev[mealKey] || []), raw],
                          }));
                          setCustomRecipePhotoUrlInput((prev) => ({
                            ...prev,
                            [mealKey]: '',
                          }));
                        }}
                      >
                        <Text
                          style={{
                            color: '#090D16',
                            fontWeight: '900',
                            fontSize: 11,
                          }}
                        >
                          + Subir Foto
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.mealActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.secondaryMealBtn,
                        { backgroundColor: theme.surfaceElevated },
                      ]}
                      onPress={() =>
                        setExpandedMealId(isExpanded ? null : meal.id)
                      }
                    >
                      <Text
                        style={[
                          styles.secondaryMealBtnText,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {isExpanded
                          ? 'Ocultar receta ▲'
                          : '👨‍🍳 Ver receta paso a paso ▼'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.logMealBtn,
                        {
                          borderColor: theme.accentPrimary,
                          backgroundColor: alreadyLogged
                            ? theme.accentPrimary
                            : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        handleLogMealInPlace({
                          ...meal,
                          id: `w${currentWeekNumber}-${meal.id}`,
                        });
                      }}
                    >
                      <Text
                        style={[
                          styles.logMealBtnText,
                          {
                            color: alreadyLogged
                              ? '#090D16'
                              : theme.accentPrimary,
                          },
                        ]}
                      >
                        {alreadyLogged ? '✓ Registrada (+)' : '+ Registrar hoy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  </View>
                );
              })}
              </>
            )}
          </View>
        )}

        {/* ================= PESTAÑA 2: RUTINAS (TODO LO DEL GIMNASIO + SUPLEMENTOS) ================= */}
        {activeTab === 'routines' && dietPlan && (
          <View>
            <View
              style={[
                styles.liveGaugeCard,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.accentOrange,
                },
              ]}
            >
              <Text
                style={[styles.heroOverline, { color: theme.accentOrange }]}
              >
                🏋️ MEDIDOR
              </Text>
              <View style={styles.gaugeBarLabels}>
                <Text
                  style={[styles.gaugeLabelText, { color: theme.textPrimary }]}
                >
                  🔥 Calorías Quemadas Hoy
                </Text>
                <Text
                  style={[
                    styles.gaugeValueText,
                    { color: theme.accentOrange },
                  ]}
                >
                  {totalCaloriesBurned} / {metrics.targetCaloriesToBurn} kcal (
                  {burnedPct}%)
                </Text>
              </View>
              <View
                style={[
                  styles.progressBarBg,
                  { backgroundColor: theme.surfaceElevated },
                ]}
              >
                <View
                  style={[
                    styles.progressBarFillOrange,
                    { width: `${burnedPct}%` },
                  ]}
                />
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.daySelectorScroll}
            >
              {dietPlan.days.map((d, idx) => {
                const active = selectedDayIdx === idx;
                return (
                  <TouchableOpacity
                    key={d.dayName}
                    style={[
                      styles.dayTab,
                      {
                        backgroundColor: active
                          ? theme.accentOrange
                          : theme.surface,
                        borderColor: active ? theme.accentOrange : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedDayIdx(idx)}
                  >
                    <Text
                      style={[
                        styles.dayTabText,
                        { color: active ? '#FFFFFF' : theme.textMuted },
                      ]}
                    >
                      {d.dayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {dietPlan.days[selectedDayIdx]?.recommendedWorkout && (
              <View
                style={[
                  styles.workoutCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.accentOrange,
                  },
                ]}
              >
                <View style={styles.mealHeaderRow}>
                  <Text style={styles.workoutBadge}>
                    🎯{' '}
                    {dietPlan.days[
                      selectedDayIdx
                    ].recommendedWorkout.focusMuscleGroup.toUpperCase()}
                  </Text>
                  <Text style={styles.workoutBurnText}>
                    -
                    {
                      dietPlan.days[selectedDayIdx].recommendedWorkout
                        .caloriesToBurn
                    }{' '}
                    kcal
                  </Text>
                </View>

                <Text style={[styles.mealTitle, { color: theme.textPrimary }]}>
                  {dietPlan.days[selectedDayIdx].recommendedWorkout.title}
                </Text>

                <View
                  style={[
                    styles.recipeDetailsBox,
                    {
                      backgroundColor: theme.surfaceElevated,
                      borderColor: theme.border,
                      marginTop: 8,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: theme.accentOrange,
                      fontWeight: '800',
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                  >
                    📋 Bloques de Ejercicios y Series:
                  </Text>
                  {dietPlan.days[
                    selectedDayIdx
                  ].recommendedWorkout.exercises.map((ex, i) => (
                    <Text
                      key={i}
                      style={[
                        styles.recipeBullet,
                        { color: theme.textPrimary, fontWeight: '600' },
                      ]}
                    >
                      {i + 1}. {ex}
                    </Text>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.logWorkoutBtn}
                  onPress={() => {
                    const w = dietPlan.days[selectedDayIdx].recommendedWorkout;
                    handleLogWorkoutInPlace(
                      w.title,
                      w.durationMinutes,
                      w.caloriesToBurn
                    );
                  }}
                >
                  <Text style={styles.logWorkoutBtnText}>
                    ✓ Completar y Registrar Rutina (-
                    {
                      dietPlan.days[selectedDayIdx].recommendedWorkout
                        .caloriesToBurn
                    }{' '}
                    kcal)
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                📝 Registro de Entrenamientos de Hoy
              </Text>
              <View style={styles.twoColRow}>
                <View style={styles.colHalf}>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      },
                    ]}
                    placeholder="Ejercicio / Cardio extra"
                    placeholderTextColor={theme.textMuted}
                    value={customExerciseName}
                    onChangeText={setCustomExerciseName}
                  />
                </View>
                <View style={styles.colHalf}>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      },
                    ]}
                    placeholder="Kcal quemadas"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={customExerciseBurn}
                    onChangeText={setCustomExerciseBurn}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.primaryCtaButton,
                  { backgroundColor: theme.accentOrange, marginTop: 4 },
                ]}
                onPress={handleAddCustomExercise}
              >
                <Text style={[styles.primaryCtaText, { color: '#FFFFFF' }]}>
                  + Añadir Ejercicio al Registro
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stack de Suplementos Deportivos Integrado en Rutinas */}
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.stepBadge, { color: theme.accentPrimary }]}>
                SUPLEMENTACIÓN DEPORTIVA INTEGRADA
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                ⚡ Tu Stack de Gimnasio y Aportación
              </Text>
              {dietPlan.supplementsProtocol.map((supp) => (
                <View
                  key={supp.id}
                  style={[
                    styles.recipeDetailsBox,
                    {
                      backgroundColor: theme.surfaceElevated,
                      borderColor:
                        supp.status === 'elegido'
                          ? theme.accentPrimary
                          : theme.accentBlue,
                      marginBottom: 10,
                    },
                  ]}
                >
                  <View style={styles.mealHeaderRow}>
                    <Text
                      style={{
                        color: theme.textPrimary,
                        fontWeight: '900',
                        fontSize: 14,
                      }}
                    >
                      {supp.icon} {supp.name}
                    </Text>
                    <Text
                      style={{
                        color:
                          supp.status === 'elegido'
                            ? theme.accentPrimary
                            : theme.accentBlue,
                        fontSize: 10,
                        fontWeight: '900',
                      }}
                    >
                      {supp.status === 'elegido' ? '✓ TUYO' : '✨ IA'}
                    </Text>
                  </View>
                  <Text
                    style={{
                      color: theme.accentPrimary,
                      fontWeight: '800',
                      fontSize: 12,
                      marginBottom: 2,
                    }}
                  >
                    ⚖️ Dosis: {supp.dosage}
                  </Text>
                  <Text
                    style={{
                      color: theme.accentBlue,
                      fontWeight: '800',
                      fontSize: 12,
                      marginBottom: 6,
                    }}
                  >
                    ⏰ Toma: {supp.timing}
                  </Text>
                  <Text
                    style={{
                      color: theme.textSecondary,
                      fontSize: 12.5,
                      lineHeight: 18,
                    }}
                  >
                    🔬 {supp.dietContribution}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ================= PESTAÑA 3: REGISTRO (ESTILO APPLE FITNESS SEMANAL Y MENSUAL) ================= */}
        {activeTab === 'fitness_log' && (
          <View>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segmentedBtn,
                  {
                    backgroundColor:
                      fitnessViewMode === 'week'
                        ? theme.accentPrimary
                        : theme.surface,
                    borderColor:
                      fitnessViewMode === 'week'
                        ? theme.accentPrimary
                        : theme.border,
                  },
                ]}
                onPress={() => setFitnessViewMode('week')}
              >
                <Text
                  style={[
                    styles.segmentedBtnText,
                    {
                      color:
                        fitnessViewMode === 'week'
                          ? '#090D16'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  📅 Vista Semanal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentedBtn,
                  {
                    backgroundColor:
                      fitnessViewMode === 'month'
                        ? theme.accentPrimary
                        : theme.surface,
                    borderColor:
                      fitnessViewMode === 'month'
                        ? theme.accentPrimary
                        : theme.border,
                  },
                ]}
                onPress={() => setFitnessViewMode('month')}
              >
                <Text
                  style={[
                    styles.segmentedBtnText,
                    {
                      color:
                        fitnessViewMode === 'month'
                          ? '#090D16'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  🗓️ Calendario del Dispositivo
                </Text>
              </TouchableOpacity>
            </View>

            {fitnessViewMode === 'week' ? (
              <View
                style={[
                  styles.fitnessWeekStrip,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                {INITIAL_HISTORICAL_DAYS.slice(21, 28).map((d, idx) => {
                  const realIdx = 21 + idx;
                  const rt = computeDayRealtimeRings(realIdx);
                  const active = selectedHistoryIdx === realIdx;
                  return (
                    <TouchableOpacity
                      key={d.dayOfMonth}
                      style={[
                        styles.fitnessDayCell,
                        active && {
                          backgroundColor: theme.surfaceElevated,
                          borderColor: theme.accentPrimary,
                          borderWidth: 1.5,
                        },
                      ]}
                      onPress={() => {
                        setSelectedDayIdx(idx);
                        setSelectedHistoryIdx(realIdx);
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: d.isToday
                            ? '#38BDF8'
                            : active
                            ? theme.accentPrimary
                            : theme.textMuted,
                        }}
                      >
                        {d.weekdayShort}
                      </Text>
                      <ConcentricFitnessRings
                        size={34}
                        movePct={rt.movePct}
                        dietPct={rt.dietPct}
                        hydroPct={rt.hydroPct}
                      />
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: d.isToday ? '#38BDF8' : theme.textPrimary,
                        }}
                      >
                        {d.dayOfMonth}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[styles.stepBadge, { color: theme.accentPrimary }]}
                >
                  CALENDARIO DEL DISPOSITIVO •{' '}
                  {MONTH_NAMES_ES[new Date().getMonth()].toUpperCase()}{' '}
                  {new Date().getFullYear()} ({INITIAL_HISTORICAL_DAYS.length}{' '}
                  DÍAS)
                </Text>
                <View style={styles.fitnessMonthGrid}>
                  {INITIAL_HISTORICAL_DAYS.map((d, idx) => {
                    const rt = computeDayRealtimeRings(idx);
                    const active = selectedHistoryIdx === idx;
                    return (
                      <TouchableOpacity
                        key={d.dayOfMonth}
                        style={[
                          styles.fitnessMonthCell,
                          {
                            backgroundColor: theme.surfaceElevated,
                            borderColor: d.isToday
                              ? '#38BDF8'
                              : active
                              ? theme.accentPrimary
                              : 'transparent',
                          },
                        ]}
                        onPress={() => {
                          if (idx >= 21) setSelectedDayIdx(idx - 21);
                          setSelectedHistoryIdx(idx);
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: '800',
                            color: d.isToday ? '#38BDF8' : theme.textMuted,
                          }}
                        >
                          {d.weekdayShort} {d.dayOfMonth}
                          {d.isToday ? ' HOY' : ''}
                        </Text>
                        <ConcentricFitnessRings
                          size={28}
                          movePct={rt.movePct}
                          dietPct={rt.dietPct}
                          hydroPct={rt.hydroPct}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Tarjeta Principal de Anillos del Día Seleccionado */}
            <View
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.stepBadge, { color: theme.accentPrimary }]}>
                REGISTRO GUARDADO • {selectedRecord.weekdayFull.toUpperCase()}{' '}
                DÍA {selectedRecord.dayOfMonth}
              </Text>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                Anillos de Actividad
              </Text>

              <View style={styles.ringsDetailRow}>
                <ConcentricFitnessRings
                  size={122}
                  movePct={selectedRecord.movePct}
                  dietPct={selectedRecord.dietPct}
                  hydroPct={selectedRecord.hydroPct}
                />
                <View style={{ flex: 1, marginLeft: 18, gap: 10 }}>
                  <View>
                    <Text
                      style={{
                        color: '#FA114F',
                        fontSize: 11,
                        fontWeight: '900',
                      }}
                    >
                      🔴 QUEMA / MOVIMIENTO
                    </Text>
                    <Text
                      style={{
                        color: theme.textPrimary,
                        fontSize: 17,
                        fontWeight: '900',
                      }}
                    >
                      {Math.round(
                        (selectedRecord.movePct / 100) *
                          metrics.targetCaloriesToBurn
                      )}{' '}
                      / {metrics.targetCaloriesToBurn} KCAL (
                      {selectedRecord.movePct}%)
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        color: '#92E82A',
                        fontSize: 11,
                        fontWeight: '900',
                      }}
                    >
                      🟢 DIETA CUMPLIDA
                    </Text>
                    <Text
                      style={{
                        color: theme.textPrimary,
                        fontSize: 17,
                        fontWeight: '900',
                      }}
                    >
                      {Math.round(
                        (selectedRecord.dietPct / 100) *
                          metrics.targetCaloriesToConsume
                      )}{' '}
                      / {metrics.targetCaloriesToConsume} KCAL (
                      {selectedRecord.dietPct}%)
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        color: '#00D7FF',
                        fontSize: 11,
                        fontWeight: '900',
                      }}
                    >
                      🔵 HIDRATACIÓN & STACK
                    </Text>
                    <Text
                      style={{
                        color: theme.textPrimary,
                        fontSize: 17,
                        fontWeight: '900',
                      }}
                    >
                      {selectedRecord.hydroPct}% Completado
                    </Text>
                  </View>
                </View>
              </View>

              <View
                style={[
                  styles.recipeDetailsBox,
                  {
                    backgroundColor: theme.surfaceElevated,
                    borderColor: theme.border,
                    marginTop: 12,
                    marginBottom: 0,
                  },
                ]}
              >
                <Text
                  style={{
                    color: theme.textPrimary,
                    fontWeight: '800',
                    fontSize: 13,
                  }}
                >
                  🏋️ Rutina guardada ese día: {selectedRecord.workoutDone} (
                  {selectedRecord.durationMin} min)
                </Text>
                <Text
                  style={{
                    color: theme.textMuted,
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  👣 Pasos: {selectedRecord.stepsCount.toLocaleString()} •
                  Suplementación completada ✓
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ================= PESTAÑA 4: MENÚ DE AJUSTES AVANZADO ================= */}
        {activeTab === 'settings' && (
          <View>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                style={[
                  styles.segmentedBtn,
                  {
                    backgroundColor:
                      settingsSection === 'profile'
                        ? theme.accentPrimary
                        : theme.surface,
                    borderColor:
                      settingsSection === 'profile'
                        ? theme.accentPrimary
                        : theme.border,
                  },
                ]}
                onPress={() => setSettingsSection('profile')}
              >
                <Text
                  style={[
                    styles.segmentedBtnText,
                    {
                      color:
                        settingsSection === 'profile'
                          ? '#090D16'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  👤 Perfil y Datos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.segmentedBtn,
                  {
                    backgroundColor:
                      settingsSection === 'customize'
                        ? theme.accentPrimary
                        : theme.surface,
                    borderColor:
                      settingsSection === 'customize'
                        ? theme.accentPrimary
                        : theme.border,
                  },
                ]}
                onPress={() => setSettingsSection('customize')}
              >
                <Text
                  style={[
                    styles.segmentedBtnText,
                    {
                      color:
                        settingsSection === 'customize'
                          ? '#090D16'
                          : theme.textPrimary,
                    },
                  ]}
                >
                  🎨 Personalizar
                </Text>
              </TouchableOpacity>
            </View>

            {settingsSection === 'profile' && (
              <View>
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      marginTop: 10,
                    },
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: theme.textPrimary }]}
                  >
                    📸 Foto de Perfil
                  </Text>
                  <View style={styles.profilePhotoSection}>
                    <Image
                      source={{ uri: profilePhotoUrl }}
                      style={[
                        styles.profileLargeAvatar,
                        { borderColor: theme.accentPrimary },
                      ]}
                    />
                    <View style={{ flex: 1, marginLeft: 14 }}>
                      <Text
                        style={{
                          color: theme.textPrimary,
                          fontWeight: '800',
                          fontSize: 16,
                        }}
                      >
                        {profile.name}
                      </Text>
                      <Text
                        style={{
                          color: theme.textMuted,
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        IMC: {metrics.bmi} • Meta: {profile.targetWeightKg} kg
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={[styles.inputLabel, { color: theme.textSecondary }]}
                  >
                    🏋️‍♂️🥗 Gimnasio y Comida (6):
                  </Text>
                  <View style={styles.avatarPresetsRow}>
                    {FITNESS_FOOD_AVATARS.map((av) => (
                      <TouchableOpacity
                        key={av.id}
                        style={{ alignItems: 'center', gap: 4 }}
                        onPress={() => setProfilePhotoUrl(av.url)}
                      >
                        <Image
                          source={{ uri: av.url }}
                          style={[
                            styles.avatarPresetThumb,
                            {
                              borderColor:
                                profilePhotoUrl === av.url
                                  ? theme.accentPrimary
                                  : 'transparent',
                            },
                          ]}
                        />
                        <Text
                          style={{
                            fontSize: 9.5,
                            fontWeight: '800',
                            color:
                              profilePhotoUrl === av.url
                                ? theme.accentPrimary
                                : theme.textMuted,
                          }}
                        >
                          {av.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text
                    style={[
                      styles.inputLabel,
                      { color: theme.textSecondary, marginTop: 10 },
                    ]}
                  >
                    🦁🐺 Animales (6):
                  </Text>
                  <View style={styles.avatarPresetsRow}>
                    {ANIMAL_AVATARS.map((av) => (
                      <TouchableOpacity
                        key={av.id}
                        style={{ alignItems: 'center', gap: 4 }}
                        onPress={() => setProfilePhotoUrl(av.url)}
                      >
                        <Image
                          source={{ uri: av.url }}
                          style={[
                            styles.avatarPresetThumb,
                            {
                              borderColor:
                                profilePhotoUrl === av.url
                                  ? theme.accentPrimary
                                  : 'transparent',
                            },
                          ]}
                        />
                        <Text
                          style={{
                            fontSize: 9.5,
                            fontWeight: '800',
                            color:
                              profilePhotoUrl === av.url
                                ? theme.accentPrimary
                                : theme.textMuted,
                          }}
                        >
                          {av.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: theme.textPrimary }]}
                  >
                    ⚖️ Personalizar Datos Físicos y Dieta
                  </Text>

                  <Text
                    style={[styles.inputLabel, { color: theme.textSecondary }]}
                  >
                    Nombre
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.border,
                        color: theme.textPrimary,
                      },
                    ]}
                    value={profile.name}
                    onChangeText={(t) => setProfile((p) => ({ ...p, name: t }))}
                  />

                  <View style={styles.twoColRow}>
                    <View style={styles.colHalf}>
                      <Text
                        style={[
                          styles.inputLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Peso Actual (kg)
                      </Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.border,
                            color: theme.textPrimary,
                          },
                        ]}
                        keyboardType="numeric"
                        value={weightInput}
                        onChangeText={(v) => syncNumericProfile('weightKg', v)}
                      />
                    </View>
                    <View style={styles.colHalf}>
                      <Text
                        style={[
                          styles.inputLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Altura (cm)
                      </Text>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.border,
                            color: theme.textPrimary,
                          },
                        ]}
                        keyboardType="numeric"
                        value={heightInput}
                        onChangeText={(v) => syncNumericProfile('heightCm', v)}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.primaryCtaButton,
                      { backgroundColor: theme.accentPrimary },
                    ]}
                    onPress={handleFinishOnboardingAndGenerate}
                  >
                    <Text style={styles.primaryCtaText}>
                      🔄 Guardar y Recalcular Plan IA
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {settingsSection === 'customize' && (
              <View>
                {/* Selector entre Estilo Moderno (Cuadrados) y Clásico (Círculos) */}
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      marginTop: 10,
                    },
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: theme.textPrimary }]}
                  >
                    🔲 Estilo de Selectores (Tics)
                  </Text>
                  {(
                    [
                      [
                        'modern',
                        '🔲 Moderno (Cuadrados limpios)',
                        'Casillas cuadradas de bordes definidos',
                      ],
                      [
                        'classic',
                        '⚪ Clásico (Círculos)',
                        'Selectores circulares tradicionales',
                      ],
                    ] as const
                  ).map(([sKey, title, sub]) => {
                    const active = uiTickStyle === sKey;
                    return (
                      <TouchableOpacity
                        key={sKey}
                        style={[
                          styles.optionRow,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: active
                              ? theme.accentPrimary
                              : theme.border,
                          },
                        ]}
                        onPress={() => setUiTickStyle(sKey)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.optionTitle,
                              { color: theme.textPrimary },
                            ]}
                          >
                            {title}
                          </Text>
                          <Text
                            style={[
                              styles.optionSubtitle,
                              { color: theme.textMuted },
                            ]}
                          >
                            {sub}
                          </Text>
                        </View>
                        {renderTickBox(active)}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: theme.textPrimary }]}
                  >
                    🌓 Modo de Apariencia
                  </Text>
                  {(
                    [
                      [
                        'system',
                        '📱 Predeterminado del Dispositivo',
                        'Cambia automáticamente según iOS / Android',
                      ],
                      [
                        'light',
                        '☀️ Modo Claro (Fondo Blanco)',
                        'Interfaz luminosa de alto contraste',
                      ],
                      [
                        'dark',
                        '🌙 Modo Oscuro (Dark Pro)',
                        'Ideal para entrenar y ahorrar batería OLED',
                      ],
                    ] as const
                  ).map(([modeKey, title, sub]) => {
                    const active = themeMode === modeKey;
                    return (
                      <TouchableOpacity
                        key={modeKey}
                        style={[
                          styles.optionRow,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: active
                              ? theme.accentPrimary
                              : theme.border,
                          },
                        ]}
                        onPress={() => setThemeMode(modeKey)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.optionTitle,
                              { color: theme.textPrimary },
                            ]}
                          >
                            {title}
                          </Text>
                          <Text
                            style={[
                              styles.optionSubtitle,
                              { color: theme.textMuted },
                            ]}
                          >
                            {sub}
                          </Text>
                        </View>
                        {renderTickBox(active)}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: theme.textPrimary }]}
                  >
                    🎨 Tema de Color de GymTrack!
                  </Text>
                  {(Object.keys(ACCENT_PALETTES) as AccentColorKey[]).map(
                    (key) => {
                      const pal = ACCENT_PALETTES[key];
                      const selected = accentKey === key;
                      return (
                        <TouchableOpacity
                          key={key}
                          style={[
                            styles.optionRow,
                            {
                              backgroundColor: theme.inputBg,
                              borderColor: selected
                                ? pal.primary
                                : theme.border,
                            },
                          ]}
                          onPress={() => setAccentKey(key)}
                        >
                          <View
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              backgroundColor: pal.primary,
                              marginRight: 12,
                            }}
                          />
                          <Text
                            style={[
                              styles.optionTitle,
                              { color: theme.textPrimary, flex: 1 },
                            ]}
                          >
                            {pal.name}
                          </Text>
                          {renderTickBox(selected)}
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>

                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text
                    style={[styles.sectionTitle, { color: theme.textPrimary }]}
                  >
                    📸 Visualización de Recetas
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.optionRow,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: showRecipePhotos
                          ? theme.accentPrimary
                          : theme.border,
                      },
                    ]}
                    onPress={() => setShowRecipePhotos((v) => !v)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.optionTitle,
                          { color: theme.textPrimary },
                        ]}
                      >
                        Mostrar Fotos IA en las Recetas
                      </Text>
                      <Text
                        style={[
                          styles.optionSubtitle,
                          { color: theme.textMuted },
                        ]}
                      >
                        {showRecipePhotos
                          ? 'Activado: se muestran las fotos generadas por IA'
                          : 'Desactivado: vista compacta solo con texto'}
                      </Text>
                    </View>
                    {renderTickBox(showRecipePhotos)}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Barra de Navegación Inferior (Dietas | Rutinas | Registro [Anillos Apple Fitness] | Ajustes) */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: theme.menuBackground,
            borderTopColor: theme.border,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('diet')}
        >
          <Text style={styles.navIcon}>🥗</Text>
          <Text
            style={[
              styles.navLabel,
              { color: theme.textMuted },
              activeTab === 'diet' && { color: theme.accentPrimary },
            ]}
          >
            Dietas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('routines')}
        >
          <Text style={styles.navIcon}>🏋️</Text>
          <Text
            style={[
              styles.navLabel,
              { color: theme.textMuted },
              activeTab === 'routines' && { color: theme.accentPrimary },
            ]}
          >
            Rutinas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('fitness_log')}
        >
          <ConcentricFitnessRings
            size={20}
            movePct={95}
            dietPct={95}
            hydroPct={95}
          />
          <Text
            style={[
              styles.navLabel,
              { color: theme.textMuted, marginTop: 3 },
              activeTab === 'fitness_log' && { color: theme.accentPrimary },
            ]}
          >
            Registro
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={styles.navIcon}>⚙️</Text>
          <Text
            style={[
              styles.navLabel,
              { color: theme.textMuted },
              activeTab === 'settings' && { color: theme.accentPrimary },
            ]}
          >
            Ajustes
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  introContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 64,
  },
  introBottomArea: {
    width: '100%',
    alignItems: 'center',
  },
  introStartButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  introStartButtonText: {
    color: '#090D16',
    fontSize: 16,
    fontWeight: '900',
  },
  onboardingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    marginLeft: 8,
  },
  headerBrandTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  headerBrandSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  stepDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stepDot: {
    height: 8,
    borderRadius: 4,
  },
  stepBadge: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  tickBox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  tickCheckMark: {
    color: '#090D16',
    fontSize: 13,
    fontWeight: '900',
  },
  wizardButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 24,
  },
  wizardBackBtn: {
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardBackBtnText: {
    fontWeight: '800',
    fontSize: 14,
  },
  wizardNextBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardNextBtnText: {
    color: '#090D16',
    fontWeight: '900',
    fontSize: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  editWizardPill: {
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
  },
  editWizardPillText: {
    fontWeight: '800',
    fontSize: 12,
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 15,
    paddingBottom: 36,
  },
  liveGaugeCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  gaugeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  waterMiniBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  gaugeBarGroup: {
    marginBottom: 8,
  },
  gaugeBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gaugeLabelText: {
    fontSize: 12,
    fontWeight: '800',
  },
  gaugeValueText: {
    fontSize: 12,
    fontWeight: '900',
  },
  liveMacrosRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  liveMacroBox: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  weekSwitcherBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  weekMiniBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  heroOverline: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 6,
  },
  twoColRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  segmentedBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  segmentedBtnText: {
    fontWeight: '800',
    fontSize: 13,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  dietIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  chipActive: {
    backgroundColor: '#EF444420',
    borderColor: '#EF4444',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#EF4444',
  },
  primaryCtaButton: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryCtaText: {
    color: '#090D16',
    fontSize: 14,
    fontWeight: '900',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  daySelectorScroll: {
    marginBottom: 12,
  },
  dayTab: {
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 12,
    marginRight: 8,
  },
  dayTabText: {
    fontWeight: '800',
    fontSize: 13,
  },
  mealCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  mealImageContainer: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#1E293B',
    position: 'relative',
  },
  mealImage: {
    width: '100%',
    height: '100%',
  },
  newRecipeTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiPhotoBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  aiPhotoBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  mealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  mealTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealTypeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  mealCaloriesText: {
    fontWeight: '900',
    fontSize: 14,
  },
  mealTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  mealDescription: {
    fontSize: 13,
    marginBottom: 8,
  },
  supplementInlineTag: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 10,
  },
  mealMacrosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  mealMacroTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  recipeDetailsBox: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  recipeSubheading: {
    fontWeight: '800',
    fontSize: 13,
    marginBottom: 4,
  },
  recipeBullet: {
    fontSize: 13,
    marginBottom: 3,
    lineHeight: 18,
  },
  mealActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  secondaryMealBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryMealBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logMealBtn: {
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  logMealBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  workoutCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 15,
    marginBottom: 16,
  },
  workoutBadge: {
    color: '#F97316',
    fontWeight: '900',
    fontSize: 11,
  },
  workoutBurnText: {
    color: '#F97316',
    fontWeight: '900',
    fontSize: 15,
  },
  logWorkoutBtn: {
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  logWorkoutBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  fitnessWeekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    padding: 8,
    marginBottom: 14,
  },
  fitnessDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  fitnessMonthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  fitnessMonthCell: {
    width: '12.8%',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 3,
  },
  ringsDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  progressBarBg: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFillGreen: {
    height: '100%',
  },
  progressBarFillOrange: {
    height: '100%',
    backgroundColor: '#F97316',
  },
  profilePhotoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  profileLargeAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
  },
  avatarPresetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  avatarPresetThumb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2.5,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 9,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
});
