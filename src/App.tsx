import React, { useState, useEffect, useMemo } from 'react';
import { BirdId, Jama, PakshaType, DayOfWeek } from './types';
import { BIRDS } from './data/panchaPakshiData';
import { recalculateJamas } from './utils/calculator';
import { getBaseJamasForDay, PANCHA_PAKSHI_DAYS } from './data/panchaPakshiRegistry';
import { PakshaDaySelector } from './components/PakshaDaySelector';
import { BirdSelector } from './components/BirdSelector';
import { SunriseSunsetBar } from './components/SunriseSunsetBar';
import { CurrentStatusBanner } from './components/CurrentStatusBanner';
import { BirdSummaryCard } from './components/BirdSummaryCard';
import { JamaCard } from './components/JamaCard';
import { OccurrencesView } from './components/OccurrencesView';
import { MasterTableView } from './components/MasterTableView';
import { TimeLookupModal } from './components/TimeLookupModal';
import { BirdRelationshipsView } from './components/BirdRelationshipsView';
import { RealTimeCalendarModal } from './components/RealTimeCalendarModal';
import { ActivityChartView } from './components/ActivityChartView';
import { getLunarDayInfo } from './utils/lunarCalendar';
import { useLanguage } from './context/LanguageContext';
import {
  Sun,
  Moon,
  Table,
  Sparkles,
  BarChart3,
  Layers,
  Search,
  HeartHandshake,
  Languages,
  Calendar,
  TrendingUp,
} from 'lucide-react';

export default function App() {
  const {
    language,
    setLanguage,
    toggleLanguage,
    t,
    getBirdName,
    getPakshaName,
    getDayName,
  } = useLanguage();

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

  const [activeTab, setActiveTab] = useState<'jamas' | 'summary' | 'chart' | 'occurrences' | 'master' | 'relationships'>('jamas');
  const [jamaFilter, setJamaFilter] = useState<'all' | 'day' | 'night'>('all');
  const [isLookupModalOpen, setIsLookupModalOpen] = useState(false);

  // Custom schedule state (if user changes sunrise/sunset) with localStorage persistence
  const [sunriseTime, setSunriseTime] = useState<string>(() => {
    return localStorage.getItem('pancha_sunrise') || '06:00';
  });
  const [sunsetTime, setSunsetTime] = useState<string>(() => {
    return localStorage.getItem('pancha_sunset') || '18:00';
  });
  const [nextSunriseTime, setNextSunriseTime] = useState<string>(() => {
    return localStorage.getItem('pancha_next_sunrise') || '06:00';
  });
  const [locationName, setLocationName] = useState<string>(() => {
    return localStorage.getItem('pancha_location_name') || '';
  });
  const [isCustomSchedule, setIsCustomSchedule] = useState<boolean>(() => {
    return localStorage.getItem('pancha_is_custom') === 'true';
  });

  // Save selections to localStorage
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
      setSunriseTime(baseJamasResult.defaultSunrise || '06:00');
      setSunsetTime(baseJamasResult.defaultSunset || '18:00');
      setNextSunriseTime(baseJamasResult.defaultNextSunrise || '06:00');
    }
  }, [activeDayId, isCustomSchedule, baseJamasResult.defaultSunrise, baseJamasResult.defaultSunset, baseJamasResult.defaultNextSunrise]);

  // Recalculated Jamas if custom sunrise/sunset is active
  const activeJamasList: Jama[] = useMemo(() => {
    if (isCustomSchedule) {
      return recalculateJamas(sunriseTime, sunsetTime, nextSunriseTime, baseJamasResult.jamas);
    }
    return baseJamasResult.jamas;
  }, [isCustomSchedule, sunriseTime, sunsetTime, nextSunriseTime, baseJamasResult.jamas]);

  // Live minute ticker for Jama card highlighting
  const [currentMinutes, setCurrentMinutes] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const d = new Date();
      setCurrentMinutes(d.getHours() * 60 + d.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const handleApplySunriseSunset = (sRise: string, sSet: string, nRise: string, locName?: string) => {
    setSunriseTime(sRise);
    setSunsetTime(sSet);
    setNextSunriseTime(nRise);
    setLocationName(locName || '');
    setIsCustomSchedule(true);

    localStorage.setItem('pancha_sunrise', sRise);
    localStorage.setItem('pancha_sunset', sSet);
    localStorage.setItem('pancha_next_sunrise', nRise);
    localStorage.setItem('pancha_location_name', locName || '');
    localStorage.setItem('pancha_is_custom', 'true');
  };

  const handleResetSchedule = () => {
    const defaultSR = baseJamasResult.defaultSunrise || '06:00';
    const defaultSS = baseJamasResult.defaultSunset || '18:00';
    const defaultNSR = baseJamasResult.defaultNextSunrise || '06:00';
    setSunriseTime(defaultSR);
    setSunsetTime(defaultSS);
    setNextSunriseTime(defaultNSR);
    setLocationName('');
    setIsCustomSchedule(false);

    localStorage.removeItem('pancha_sunrise');
    localStorage.removeItem('pancha_sunset');
    localStorage.removeItem('pancha_next_sunrise');
    localStorage.removeItem('pancha_location_name');
    localStorage.removeItem('pancha_is_custom');
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo & App Title */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-slate-950 shadow-md text-base"
              style={{ backgroundColor: currentBirdInfo.color }}
            >
              {currentBirdDisplayName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  {t('appTitle')}
                </h1>
                <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-mono border border-amber-500/30">
                  {activeDayDisplayName}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          {/* Right Action Controls: Language Toggle & Tools */}
          <div className="flex items-center gap-2">
            {/* Quick mobile bird switcher */}
            <div className="sm:hidden">
              <select
                value={selectedBird}
                onChange={(e) => setSelectedBird(e.target.value as BirdId)}
                aria-label="Quick Select Bird"
                id="mobile-quick-bird-select"
                className="bg-slate-900 border border-amber-500/50 text-xs font-bold text-amber-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-sm"
              >
                <option value="vulture">🦅 {getBirdName('vulture')}</option>
                <option value="owl">🦉 {getBirdName('owl')}</option>
                <option value="crow">🐦 {getBirdName('crow')}</option>
                <option value="cock">🐓 {getBirdName('cock')}</option>
                <option value="peacock">🦚 {getBirdName('peacock')}</option>
              </select>
            </div>

            {/* Language Switch Button */}
            <div
              id="language-switch-container"
              className="flex items-center rounded-xl bg-slate-900 border border-slate-700/80 p-0.5 text-xs font-semibold shadow-sm shrink-0"
            >
              <button
                type="button"
                onClick={() => setLanguage('en')}
                id="lang-switch-en-btn"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
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
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
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
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title={t('realtimeCalendar')}
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">{t('realtimeCalendar')}</span>
            </button>

            {/* Time Lookup Modal Button */}
            <button
              onClick={() => setIsLookupModalOpen(true)}
              id="open-time-lookup-modal-btn"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title={t('timeLookup')}
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
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

        {/* 2. Bird Selector Section */}
        <BirdSelector
          selectedBird={selectedBird}
          onSelectBird={(id) => setSelectedBird(id)}
          dayMeta={dayMeta}
          paksha={selectedPaksha}
        />

        {/* 3. Custom Sunrise & Sunset Schedule Bar */}
        <SunriseSunsetBar
          sunriseTime={sunriseTime}
          sunsetTime={sunsetTime}
          nextSunriseTime={nextSunriseTime}
          isCustomSchedule={isCustomSchedule}
          onApplySunriseSunset={handleApplySunriseSunset}
          onResetSchedule={handleResetSchedule}
          locationName={locationName}
          baseJamas={baseJamasResult.jamas}
        />

        {/* 4. Real-Time Status Banner for Selected Bird */}
        <CurrentStatusBanner
          selectedBird={selectedBird}
          customJamas={activeJamasList}
        />

        {/* 5. Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-2">
          {/* Main Views */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-semibold">
            <button
              onClick={() => setActiveTab('jamas')}
              id="tab-jamas-btn"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'jamas'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('tabJamas')}</span>
            </button>

            <button
              onClick={() => setActiveTab('summary')}
              id="tab-summary-btn"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{t('tabSummary')}</span>
            </button>

            <button
              onClick={() => setActiveTab('chart')}
              id="tab-chart-btn"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'chart'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{t('tabChart')}</span>
            </button>

            <button
              onClick={() => setActiveTab('occurrences')}
              id="tab-occurrences-btn"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'occurrences'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('tabOccurrences')}</span>
            </button>

            <button
              onClick={() => setActiveTab('master')}
              id="tab-master-btn"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'master'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>{t('tabMaster')}</span>
            </button>

            <button
              onClick={() => setActiveTab('relationships')}
              id="tab-relationships-btn"
              className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'relationships'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <HeartHandshake className="w-3.5 h-3.5" />
              <span>{t('tabRelationships')}</span>
            </button>
          </div>

          {/* Sub-Filter for Day/Night when in Jamas tab */}
          {activeTab === 'jamas' && (
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs self-start sm:self-auto">
              <button
                onClick={() => setJamaFilter('all')}
                id="jama-filter-all-btn"
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  jamaFilter === 'all'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
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
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sun className="w-3 h-3 text-amber-400" />
                <span>{t('filterDayJamas')}</span>
              </button>
              <button
                onClick={() => setJamaFilter('night')}
                id="jama-filter-night-btn"
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                  jamaFilter === 'night'
                    ? 'bg-purple-500 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 px-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span>
                  {t('showingJamasFor')}{' '}
                  <strong className="text-white font-bold">{currentBirdDisplayName}</strong>
                </span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span className="text-[11px] text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
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
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer font-medium transition-colors"
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

        {activeTab === 'summary' && (
          <BirdSummaryCard
            selectedBird={selectedBird}
            customJamas={activeJamasList}
            isCustomSchedule={isCustomSchedule}
            sunriseTime={sunriseTime}
            sunsetTime={sunsetTime}
            paksha={selectedPaksha}
            onOpenChart={() => setActiveTab('chart')}
          />
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

        {activeTab === 'occurrences' && (
          <OccurrencesView
            selectedBird={selectedBird}
            customJamas={activeJamasList}
          />
        )}

        {activeTab === 'master' && (
          <MasterTableView
            selectedBird={selectedBird}
            customJamas={activeJamasList}
          />
        )}

        {activeTab === 'relationships' && (
          <BirdRelationshipsView
            selectedBird={selectedBird}
            onSelectBird={(bId) => setSelectedBird(bId)}
            paksha={selectedPaksha}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-4 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto space-y-1">
          <p className="text-slate-400">
            {t('footerShastra')}
          </p>
          <p className="text-[11px] text-slate-600">
            {t('footerCurrentActive')} {activeDayDisplayName} • {language === 'ta' ? 'சூரியோதயம்' : 'Sunrise'}: {sunriseTime} • {language === 'ta' ? 'அஸ்தமனம்' : 'Sunset'}: {sunsetTime}
          </p>
        </div>
      </footer>

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
