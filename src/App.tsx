import React, { useState, useEffect, useMemo } from 'react';
import { BirdId, Jama, PakshaType, DayOfWeek } from './types';
import { BIRDS } from './data/panchaPakshiData';
import { recalculateJamas } from './utils/calculator';
import { getBaseJamasForDay, PANCHA_PAKSHI_DAYS } from './data/panchaPakshiRegistry';
import { PakshaDaySelector } from './components/PakshaDaySelector';
import { BirdSelector } from './components/BirdSelector';
import { SunriseSunsetBar } from './components/SunriseSunsetBar';
import { CurrentStatusBanner } from './components/CurrentStatusBanner';
import { JamaCard } from './components/JamaCard';
import { MasterTableView } from './components/MasterTableView';
import { TimeLookupModal } from './components/TimeLookupModal';
import { RealTimeCalendarModal } from './components/RealTimeCalendarModal';
import { ActivityChartView } from './components/ActivityChartView';
import { getLunarDayInfo } from './utils/lunarCalendar';
import { useLanguage } from './context/LanguageContext';
import { useTheme } from './context/ThemeContext';
import {
  getLocationTimezoneInfo,
  getTargetLocationCurrentMoment,
  shiftTimeHHMM,
  getLocalToISTShiftMinutes,
  IST_OFFSET_MINUTES,
  TimeDisplayMode,
  LocationTimezoneInfo,
} from './utils/timezoneService';
import { OFFLINE_CITIES } from './utils/locationService';
import {
  Sun,
  Moon,
  Table,
  Layers,
  Search,
  Calendar,
  TrendingUp,
  MapPin,
} from 'lucide-react';

export default function App() {
  const {
    language,
    setLanguage,
    t,
    getBirdName,
    getPakshaName,
    getDayName,
  } = useLanguage();

  const { theme, setTheme, isDark } = useTheme();

  const [selectedBird, setSelectedBird] = useState<BirdId>(() => {
    const saved = localStorage.getItem('pancha_selected_bird');
    if (saved && (saved in BIRDS)) return saved as BirdId;
    return 'vulture';
  });

  // Active Paksha and Day state (defaults to real-time astronomical running Pirai and Day)
  const [selectedPaksha, setSelectedPaksha] = useState<PakshaType>(() => {
    const saved = localStorage.getItem('pancha_selected_paksha');
    if (saved === 'valarpirai' || saved === 'theipirai') return saved as PakshaType;
    return getLunarDayInfo(new Date()).paksha;
  });
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(() => {
    const saved = localStorage.getItem('pancha_selected_day');
    if (saved) return saved as DayOfWeek;
    return getLunarDayInfo(new Date()).dayOfWeek;
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem('pancha_selected_calendar_date');
    if (saved) {
      const d = new Date(saved);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [customDaysVersion, setCustomDaysVersion] = useState<number>(0);

  const [activeTab, setActiveTab] = useState<'jamas' | 'chart' | 'master'>('jamas');
  const [jamaFilter, setJamaFilter] = useState<'all' | 'day' | 'night'>('all');
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);

  // Location and Timezone states
  const [locationName, setLocationName] = useState<string>(() => {
    return localStorage.getItem('pancha_location_name') || '';
  });
  const [locationTimezoneOffset, setLocationTimezoneOffset] = useState<number | null>(() => {
    const saved = localStorage.getItem('pancha_location_tz_offset');
    return saved !== null ? parseInt(saved, 10) : null;
  });
  const [locationTzAbbrev, setLocationTzAbbrev] = useState<string>(() => {
    return localStorage.getItem('pancha_location_tz_abbrev') || 'IST';
  });
  const [timeDisplayMode, setTimeDisplayMode] = useState<TimeDisplayMode>(() => {
    const saved = localStorage.getItem('pancha_time_display_mode');
    return saved === 'ist' || saved === 'local' ? (saved as TimeDisplayMode) : 'local';
  });

  // Raw location local times (before optional IST shift)
  const [rawLocalSunrise, setRawLocalSunrise] = useState<string>(() => {
    return localStorage.getItem('pancha_raw_local_sunrise') || '06:00';
  });
  const [rawLocalSunset, setRawLocalSunset] = useState<string>(() => {
    return localStorage.getItem('pancha_raw_local_sunset') || '18:00';
  });
  const [rawLocalNextSunrise, setRawLocalNextSunrise] = useState<string>(() => {
    return localStorage.getItem('pancha_raw_local_next_sunrise') || '06:00';
  });

  // Active displayed sunrise/sunset (either local or shifted to IST depending on timeDisplayMode)
  const [sunriseTime, setSunriseTime] = useState<string>(() => {
    return localStorage.getItem('pancha_sunrise') || '06:00';
  });
  const [sunsetTime, setSunsetTime] = useState<string>(() => {
    return localStorage.getItem('pancha_sunset') || '18:00';
  });
  const [nextSunriseTime, setNextSunriseTime] = useState<string>(() => {
    return localStorage.getItem('pancha_next_sunrise') || '06:00';
  });
  const [isCustomSchedule, setIsCustomSchedule] = useState<boolean>(() => {
    return localStorage.getItem('pancha_is_custom') === 'true';
  });

  // Detect whether currently selected location is outside IST
  const isOtherLocation = useMemo(() => {
    return Boolean(
      locationTimezoneOffset !== null &&
      Math.abs(locationTimezoneOffset - IST_OFFSET_MINUTES) > 15
    );
  }, [locationTimezoneOffset]);

  // Formatted difference from IST (e.g. "-9h 30m from IST")
  const timeDifferenceText = useMemo(() => {
    if (!isOtherLocation || locationTimezoneOffset === null) return '';
    const diffFromIST = locationTimezoneOffset - IST_OFFSET_MINUTES;
    const diffHours = Math.floor(Math.abs(diffFromIST) / 60);
    const diffMins = Math.abs(diffFromIST) % 60;
    const diffSign = diffFromIST >= 0 ? '+' : '-';
    return `${diffSign}${diffHours}h${diffMins > 0 ? ` ${diffMins}m` : ''} from IST`;
  }, [isOtherLocation, locationTimezoneOffset]);

  // Save basic selections to localStorage
  useEffect(() => {
    localStorage.setItem('pancha_selected_bird', selectedBird);
  }, [selectedBird]);

  useEffect(() => {
    localStorage.setItem('pancha_selected_paksha', selectedPaksha);
  }, [selectedPaksha]);

  useEffect(() => {
    localStorage.setItem('pancha_selected_day', selectedDay);
  }, [selectedDay]);

  // Active Day Configuration lookup
  const activeDayId = `${selectedPaksha}_${selectedDay}`;
  const dayMeta = PANCHA_PAKSHI_DAYS.find((d) => d.id === activeDayId);

  // Base Jamas for current day
  const baseJamasResult = useMemo(() => {
    return getBaseJamasForDay(activeDayId);
  }, [activeDayId, customDaysVersion]);

  // If user hasn't explicitly set custom schedule, sync with day default sunrise/sunset
  useEffect(() => {
    if (!isCustomSchedule && baseJamasResult.defaultSunset) {
      const defSR = baseJamasResult.defaultSunrise || '06:00';
      const defSS = baseJamasResult.defaultSunset || '18:00';
      const defNSR = baseJamasResult.defaultNextSunrise || '06:00';
      setSunriseTime(defSR);
      setSunsetTime(defSS);
      setNextSunriseTime(defNSR);
      setRawLocalSunrise(defSR);
      setRawLocalSunset(defSS);
      setRawLocalNextSunrise(defNSR);
    }
  }, [activeDayId, isCustomSchedule, baseJamasResult.defaultSunrise, baseJamasResult.defaultSunset, baseJamasResult.defaultNextSunrise]);

  // Recalculated Jamas based on active sunrise/sunset
  const activeJamasList: Jama[] = useMemo(() => {
    if (isCustomSchedule) {
      return recalculateJamas(sunriseTime, sunsetTime, nextSunriseTime, baseJamasResult.jamas);
    }
    return baseJamasResult.jamas;
  }, [isCustomSchedule, sunriseTime, sunsetTime, nextSunriseTime, baseJamasResult.jamas]);

  // Live minute ticker for current moment (syncs with local time or IST depending on mode)
  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    const d = new Date();
    if (isOtherLocation && timeDisplayMode === 'local' && locationTimezoneOffset !== null) {
      const localMom = getTargetLocationCurrentMoment(locationTimezoneOffset, d);
      return localMom.localMinutesFromMidnight;
    }
    const istMom = getTargetLocationCurrentMoment(IST_OFFSET_MINUTES, d);
    return istMom.localMinutesFromMidnight;
  });

  useEffect(() => {
    const updateTick = () => {
      const now = new Date();
      if (isOtherLocation && timeDisplayMode === 'local' && locationTimezoneOffset !== null) {
        const localMom = getTargetLocationCurrentMoment(locationTimezoneOffset, now);
        setCurrentMinutes(localMom.localMinutesFromMidnight);
      } else {
        const istMom = getTargetLocationCurrentMoment(IST_OFFSET_MINUTES, now);
        setCurrentMinutes(istMom.localMinutesFromMidnight);
      }
    };
    updateTick();
    const interval = setInterval(updateTick, 15000);
    return () => clearInterval(interval);
  }, [isOtherLocation, timeDisplayMode, locationTimezoneOffset]);

  // Find running Jama based on current time
  const runningJamaNumber = useMemo(() => {
    if (!activeJamasList || activeJamasList.length === 0) return 1;
    const cycleStartMin = activeJamasList[0]?.startMinutesFromMidnight ?? 360;
    const effectiveMinutes = currentMinutes < cycleStartMin ? currentMinutes + 1440 : currentMinutes;

    for (const j of activeJamasList) {
      if (effectiveMinutes >= j.startMinutesFromMidnight && effectiveMinutes < j.endMinutesFromMidnight) {
        return j.jamaNumber;
      }
    }
    return activeJamasList[0]?.jamaNumber ?? 1;
  }, [activeJamasList, currentMinutes]);

  // Expanded Jama: ONLY the running Jama expands by default, other jamas are contracted!
  const [expandedJamaNumber, setExpandedJamaNumber] = useState<number | null>(null);

  // Keep expandedJamaNumber synchronized with runningJamaNumber
  useEffect(() => {
    setExpandedJamaNumber(runningJamaNumber);
  }, [runningJamaNumber, activeDayId]);

  const currentBirdInfo = BIRDS[selectedBird];
  const currentBirdDisplayName = getBirdName(selectedBird);

  // Location & Schedule Application Handler
  const handleApplySunriseSunset = (
    sRise: string,
    sSet: string,
    nRise: string,
    locName?: string,
    lat?: number,
    lng?: number,
    timezone?: string,
    timezoneOffset?: number
  ) => {
    let tzInfo: LocationTimezoneInfo;
    if (typeof lat === 'number' && typeof lng === 'number') {
      tzInfo = getLocationTimezoneInfo({ lat, lng, timezone, timezoneOffset });
    } else if (locName) {
      const matched = OFFLINE_CITIES.find(
        (c) =>
          c.name.toLowerCase() === locName.toLowerCase() ||
          (c.tamilName && c.tamilName === locName) ||
          locName.toLowerCase().includes(c.name.toLowerCase())
      );
      if (matched) {
        tzInfo = getLocationTimezoneInfo(matched);
      } else {
        tzInfo = getLocationTimezoneInfo({
          lat: 0,
          lng: 0,
          timezoneOffset: timezoneOffset ?? IST_OFFSET_MINUTES,
        });
      }
    } else {
      tzInfo = {
        offsetMinutes: IST_OFFSET_MINUTES,
        tzAbbreviation: 'IST',
        isOtherLocation: false,
        timeDifferenceText: 'Same as IST',
      };
    }

    setLocationTimezoneOffset(tzInfo.offsetMinutes);
    setLocationTzAbbrev(tzInfo.tzAbbreviation);
    localStorage.setItem('pancha_location_tz_offset', String(tzInfo.offsetMinutes));
    localStorage.setItem('pancha_location_tz_abbrev', tzInfo.tzAbbreviation);

    // TARGET LOCATION DATE & DAY CALCULATION:
    // "while choosing other locations time, date and day calculated by its local time and date, day"
    const localMoment = getTargetLocationCurrentMoment(tzInfo.offsetMinutes, new Date());
    setSelectedDay(localMoment.dayOfWeek);
    setSelectedPaksha(localMoment.paksha);
    setSelectedCalendarDate(localMoment.localDate);
    localStorage.setItem('pancha_selected_day', localMoment.dayOfWeek);
    localStorage.setItem('pancha_selected_paksha', localMoment.paksha);
    localStorage.setItem('pancha_selected_calendar_date', localMoment.localDate.toISOString());

    // Save Raw Local Times
    setRawLocalSunrise(sRise);
    setRawLocalSunset(sSet);
    setRawLocalNextSunrise(nRise);
    localStorage.setItem('pancha_raw_local_sunrise', sRise);
    localStorage.setItem('pancha_raw_local_sunset', sSet);
    localStorage.setItem('pancha_raw_local_next_sunrise', nRise);

    // Apply active times based on current timeDisplayMode
    if (tzInfo.isOtherLocation && timeDisplayMode === 'ist') {
      const shiftMin = getLocalToISTShiftMinutes(tzInfo.offsetMinutes);
      const istSR = shiftTimeHHMM(sRise, shiftMin);
      const istSS = shiftTimeHHMM(sSet, shiftMin);
      const istNSR = shiftTimeHHMM(nRise, shiftMin);
      setSunriseTime(istSR);
      setSunsetTime(istSS);
      setNextSunriseTime(istNSR);
      localStorage.setItem('pancha_sunrise', istSR);
      localStorage.setItem('pancha_sunset', istSS);
      localStorage.setItem('pancha_next_sunrise', istNSR);
    } else {
      setSunriseTime(sRise);
      setSunsetTime(sSet);
      setNextSunriseTime(nRise);
      localStorage.setItem('pancha_sunrise', sRise);
      localStorage.setItem('pancha_sunset', sSet);
      localStorage.setItem('pancha_next_sunrise', nRise);
    }

    setLocationName(locName || '');
    setIsCustomSchedule(true);
    localStorage.setItem('pancha_location_name', locName || '');
    localStorage.setItem('pancha_is_custom', 'true');
  };

  // Toggle between Local Time and IST:
  // "add toggle to switch IST if other locations detected only time convertion not date day convertion from local"
  const handleToggleTimeDisplayMode = (mode: TimeDisplayMode) => {
    setTimeDisplayMode(mode);
    localStorage.setItem('pancha_time_display_mode', mode);

    if (!isOtherLocation || locationTimezoneOffset === null) return;

    // Date & Day stay strictly preserved according to the location's local day!
    if (mode === 'ist') {
      const shiftMin = getLocalToISTShiftMinutes(locationTimezoneOffset);
      const istSR = shiftTimeHHMM(rawLocalSunrise, shiftMin);
      const istSS = shiftTimeHHMM(rawLocalSunset, shiftMin);
      const istNSR = shiftTimeHHMM(rawLocalNextSunrise, shiftMin);
      setSunriseTime(istSR);
      setSunsetTime(istSS);
      setNextSunriseTime(istNSR);
      localStorage.setItem('pancha_sunrise', istSR);
      localStorage.setItem('pancha_sunset', istSS);
      localStorage.setItem('pancha_next_sunrise', istNSR);
    } else {
      setSunriseTime(rawLocalSunrise);
      setSunsetTime(rawLocalSunset);
      setNextSunriseTime(rawLocalNextSunrise);
      localStorage.setItem('pancha_sunrise', rawLocalSunrise);
      localStorage.setItem('pancha_sunset', rawLocalSunset);
      localStorage.setItem('pancha_next_sunrise', rawLocalNextSunrise);
    }
  };

  const handleResetSchedule = () => {
    const defaultSR = baseJamasResult.defaultSunrise || '06:00';
    const defaultSS = baseJamasResult.defaultSunset || '18:00';
    const defaultNSR = baseJamasResult.defaultNextSunrise || '06:00';
    setSunriseTime(defaultSR);
    setSunsetTime(defaultSS);
    setNextSunriseTime(defaultNSR);
    setRawLocalSunrise(defaultSR);
    setRawLocalSunset(defaultSS);
    setRawLocalNextSunrise(defaultNSR);
    setLocationName('');
    setLocationTimezoneOffset(null);
    setLocationTzAbbrev('IST');
    setTimeDisplayMode('local');
    setIsCustomSchedule(false);

    localStorage.removeItem('pancha_sunrise');
    localStorage.removeItem('pancha_sunset');
    localStorage.removeItem('pancha_next_sunrise');
    localStorage.removeItem('pancha_raw_local_sunrise');
    localStorage.removeItem('pancha_raw_local_sunset');
    localStorage.removeItem('pancha_raw_local_next_sunrise');
    localStorage.removeItem('pancha_location_name');
    localStorage.removeItem('pancha_location_tz_offset');
    localStorage.removeItem('pancha_location_tz_abbrev');
    localStorage.removeItem('pancha_time_display_mode');
    localStorage.removeItem('pancha_is_custom');

    // Re-sync with real-time astronomical current date
    const now = new Date();
    const todayInfo = getLunarDayInfo(now);
    setSelectedPaksha(todayInfo.paksha);
    setSelectedDay(todayInfo.dayOfWeek);
    setSelectedCalendarDate(now);
  };

  const handleSelectPakshaAndDay = (paksha: PakshaType, day: DayOfWeek, date?: Date) => {
    setSelectedPaksha(paksha);
    setSelectedDay(day);
    if (date) {
      setSelectedCalendarDate(date);
      localStorage.setItem('pancha_selected_calendar_date', date.toISOString());
    }
  };

  const handleCustomDayUploaded = (_dayId: string, _jamas: Jama[]) => {
    setCustomDaysVersion((v) => v + 1);
  };

  const displayedJamas: Jama[] = activeJamasList.filter((j: Jama) => {
    if (jamaFilter === 'day') return j.isDay;
    if (jamaFilter === 'night') return !j.isDay;
    return true;
  });

  const activeDayDisplayName = dayMeta
    ? (language === 'ta' ? dayMeta.tamilName : dayMeta.name)
    : `${getPakshaName(selectedPaksha)} ${getDayName(selectedDay)}`;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950 transition-colors duration-150">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 py-2.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & App Title */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-slate-950 shadow-sm text-base shrink-0"
              style={{ backgroundColor: currentBirdInfo.color }}
            >
              {currentBirdDisplayName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-950 dark:text-white tracking-tight">
                  {t('appTitle')}
                </h1>
                <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono border border-amber-500/30">
                  {activeDayDisplayName}
                </span>

                {/* Header IST toggle if other location detected */}
                {isOtherLocation && (
                  <div
                    id="header-other-location-toggle"
                    className="flex items-center rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-0.5 text-xs font-semibold shadow-2xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleTimeDisplayMode('local')}
                      id="header-switch-local-btn"
                      className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        timeDisplayMode === 'local'
                          ? 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                      title={language === 'ta' ? `${locationName || 'உள்ளூர்'} நேரம்` : `Show times in ${locationName || 'Local'} time`}
                    >
                      <span>📍 {locationTzAbbrev}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleTimeDisplayMode('ist')}
                      id="header-switch-ist-btn"
                      className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        timeDisplayMode === 'ist'
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-2xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                      title={language === 'ta' ? 'இந்திய நேரம் (IST) - நேரத்தை மட்டும் மாற்றும் (நாள் உள்ளூராகவே இருக்கும்)' : 'Switch to Indian Standard Time (IST) - times only, date & day remain local'}
                    >
                      <span>🇮🇳 IST</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Action Controls: Theme Toggle, Language Switch & Tools */}
          <div className="flex items-center gap-2">
            {/* Quick mobile bird switcher */}
            <div className="sm:hidden">
              <select
                value={selectedBird}
                onChange={(e) => setSelectedBird(e.target.value as BirdId)}
                aria-label="Quick Select Bird"
                id="mobile-quick-bird-select"
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-amber-500/50 text-xs font-bold text-slate-800 dark:text-amber-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-xs"
              >
                <option value="vulture">🦅 {getBirdName('vulture')}</option>
                <option value="owl">🦉 {getBirdName('owl')}</option>
                <option value="crow">🐦 {getBirdName('crow')}</option>
                <option value="cock">🐓 {getBirdName('cock')}</option>
                <option value="peacock">🦚 {getBirdName('peacock')}</option>
              </select>
            </div>

            {/* Dark & Bright Mode Toggle */}
            <div
              id="theme-mode-toggle-container"
              className="flex items-center rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-0.5 text-xs font-semibold shadow-2xs shrink-0"
            >
              <button
                type="button"
                onClick={() => setTheme('bright')}
                id="theme-switch-bright-btn"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  !isDark
                    ? 'bg-white text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={language === 'ta' ? 'வெளிச்சத் தோற்றம்' : 'Bright Mode'}
              >
                <Sun className={`w-3.5 h-3.5 ${!isDark ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'}`} />
                <span className="hidden md:inline">{t('themeBright')}</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                id="theme-switch-dark-btn"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title={language === 'ta' ? 'இருள் தோற்றம்' : 'Dark Mode'}
              >
                <Moon className={`w-3.5 h-3.5 ${isDark ? 'fill-slate-950 text-slate-950' : 'text-slate-500'}`} />
                <span className="hidden md:inline">{t('themeDark')}</span>
              </button>
            </div>

            {/* Language Switch Button */}
            <div
              id="language-switch-container"
              className="flex items-center rounded-xl bg-slate-200/80 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-0.5 text-xs font-semibold shadow-2xs shrink-0"
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                id="lang-switch-en-btn"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Switch to English"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ta')}
                id="lang-switch-ta-btn"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'ta'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="தமிழுக்கு மாறவும்"
              >
                தமிழ்
              </button>
            </div>

            {/* Real-time Astronomical Calendar Button */}
            <button
              onClick={() => setIsCalendarModalOpen(true)}
              id="open-calendar-nav-btn"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title={t('realtimeCalendar')}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">{t('realtimeCalendar')}</span>
            </button>

            {/* Time Lookup Modal Button */}
            <button
              onClick={() => setIsLookupModalOpen(true)}
              id="open-time-lookup-modal-btn"
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title={t('timeLookup')}
            >
              <Search className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden xs:inline">{t('timeLookup')}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">
        {/* 1. Paksha & Day of Week Selector (14 Day Calculations) */}
        <PakshaDaySelector
          selectedPaksha={selectedPaksha}
          selectedDay={selectedDay}
          onSelectPakshaAndDay={handleSelectPakshaAndDay}
          onCustomDayUploaded={handleCustomDayUploaded}
          onOpenCalendar={() => setIsCalendarModalOpen(true)}
          selectedDate={selectedCalendarDate}
        />

        {/* 2. Bird Selector Section (Simplified, clean cards) */}
        <BirdSelector
          selectedBird={selectedBird}
          onSelectBird={(id) => setSelectedBird(id)}
          dayMeta={dayMeta}
          paksha={selectedPaksha}
        />

        {/* 3. Custom Sunrise & Sunset Schedule Bar with IST / Local Time toggle */}
        <SunriseSunsetBar
          sunriseTime={sunriseTime}
          sunsetTime={sunsetTime}
          nextSunriseTime={nextSunriseTime}
          isCustomSchedule={isCustomSchedule}
          onApplySunriseSunset={handleApplySunriseSunset}
          onResetSchedule={handleResetSchedule}
          locationName={locationName}
          baseJamas={baseJamasResult.jamas}
          isOtherLocation={isOtherLocation}
          timeDisplayMode={timeDisplayMode}
          onToggleTimeDisplayMode={handleToggleTimeDisplayMode}
          tzAbbreviation={locationTzAbbrev}
          timeDifferenceText={timeDifferenceText}
          localDayName={getDayName(selectedDay)}
        />

        {/* 4. Real-Time Status Banner for Selected Bird */}
        <CurrentStatusBanner
          selectedBird={selectedBird}
          customJamas={activeJamasList}
          currentMinutes={currentMinutes}
          isOtherLocation={isOtherLocation}
          timeDisplayMode={timeDisplayMode}
          tzAbbreviation={locationTzAbbrev}
          locationName={locationName}
        />

        {/* 5. Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
          {/* Main Views */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-semibold">
            <button
              onClick={() => setActiveTab('jamas')}
              id="tab-jamas-btn"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'jamas'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('tabJamas')}</span>
            </button>

            <button
              onClick={() => setActiveTab('chart')}
              id="tab-chart-btn"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'chart'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t('tabChart')}</span>
            </button>

            <button
              onClick={() => setActiveTab('master')}
              id="tab-master-btn"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'master'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{t('tabMaster')}</span>
            </button>
          </div>

          {/* Sub-Filter for Day/Night when in Jamas tab */}
          {activeTab === 'jamas' && (
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs self-start sm:self-auto shadow-2xs">
              <button
                onClick={() => setJamaFilter('all')}
                id="jama-filter-all-btn"
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  jamaFilter === 'all'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {t('filterAllJamas')}
              </button>
              <button
                onClick={() => setJamaFilter('day')}
                id="jama-filter-day-btn"
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  jamaFilter === 'day'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sun className="w-3 h-3 text-amber-500" />
                <span>{t('filterDayJamas')}</span>
              </button>
              <button
                onClick={() => setJamaFilter('night')}
                id="jama-filter-night-btn"
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  jamaFilter === 'night'
                    ? 'bg-purple-600 text-white font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Moon className="w-3 h-3 text-purple-400" />
                <span>{t('filterNightJamas')}</span>
              </button>
            </div>
          )}
        </div>

        {/* 6. Tab Contents */}
        {activeTab === 'jamas' && (
          <section aria-label="10 Jamas Cards" className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  {t('showingJamasFor')}{' '}
                  <strong className="text-slate-950 dark:text-white font-bold">{currentBirdDisplayName}</strong>
                </span>
                <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">•</span>
                <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {language === 'ta'
                      ? `நடப்பு சாமம் ${runningJamaNumber} (தற்போது விரிக்கப்பட்டுள்ளது)`
                      : `Running Jama ${runningJamaNumber} (Currently Expanded)`}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setExpandedJamaNumber(runningJamaNumber)}
                  id="expand-running-jama-only-btn"
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium ${
                    expandedJamaNumber === runningJamaNumber
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-800 dark:text-amber-300 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 shadow-2xs'
                  }`}
                  title={t('runningJamaExpandedOnly')}
                >
                  {t('expandRunningOnlyBtn')}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (expandedJamaNumber === -1) {
                      setExpandedJamaNumber(runningJamaNumber);
                    } else {
                      setExpandedJamaNumber(-1); // -1 signifies expand all
                    }
                  }}
                  id="expand-all-jamas-btn"
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer font-medium transition-colors shadow-2xs"
                >
                  {expandedJamaNumber === -1 ? t('contractAllBtn') : t('expandAllBtn')}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {displayedJamas.map((jama: Jama) => {
                const isCardExpanded =
                  expandedJamaNumber === -1
                    ? true
                    : expandedJamaNumber === jama.jamaNumber;

                return (
                  <JamaCard
                    key={jama.jamaNumber}
                    jama={jama}
                    selectedBird={selectedBird}
                    currentMinutes={currentMinutes}
                    isExpanded={isCardExpanded}
                    onToggleExpand={() => {
                      setExpandedJamaNumber((prev) =>
                        prev === jama.jamaNumber ? null : jama.jamaNumber
                      );
                    }}
                    cycleStartMinutes={activeJamasList[0]?.startMinutesFromMidnight ?? 360}
                    paksha={selectedPaksha}
                  />
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'chart' && (
          <ActivityChartView
            selectedBird={selectedBird}
            customJamas={activeJamasList}
            sunriseTime={sunriseTime}
            sunsetTime={sunsetTime}
            nextSunriseTime={nextSunriseTime}
            onSelectBird={(birdId) => setSelectedBird(birdId)}
          />
        )}

        {activeTab === 'master' && (
          <MasterTableView
            selectedBird={selectedBird}
            customJamas={activeJamasList}
          />
        )}
      </main>

      {/* Time Lookup & Sunrise/Sunset Modal */}
      <TimeLookupModal
        isOpen={isLookupModalOpen}
        onClose={() => setIsLookupModalOpen(false)}
        selectedBird={selectedBird}
        customJamas={activeJamasList}
        onApplySunriseSunset={handleApplySunriseSunset}
        currentSunrise={sunriseTime}
        currentSunset={sunsetTime}
        currentNextSunrise={nextSunriseTime}
        isCustomSchedule={isCustomSchedule}
        onResetSchedule={handleResetSchedule}
        locationName={locationName}
      />

      {/* Real-Time Astronomical & Panchang Calendar Modal */}
      <RealTimeCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        currentPaksha={selectedPaksha}
        currentDay={selectedDay}
        onSelectPakshaAndDay={handleSelectPakshaAndDay}
        selectedDate={selectedCalendarDate}
      />
    </div>
  );
}
