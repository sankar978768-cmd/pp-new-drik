import React, { useState } from 'react';
import { PakshaType, DayOfWeek, DayCalculationMeta, Jama } from '../types';
import { PANCHA_PAKSHI_DAYS, getSavedCustomDayJamas, saveCustomDayJamas } from '../data/panchaPakshiRegistry';
import { BIRDS } from '../data/panchaPakshiData';
import { Moon, Sun, Calendar, Upload, FileText, CheckCircle2, Clock, AlertCircle, Sparkles, X, BookOpen, Skull, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getLunarDayInfo } from '../utils/lunarCalendar';

interface PakshaDaySelectorProps {
  selectedPaksha: PakshaType;
  selectedDay: DayOfWeek;
  onSelectPakshaAndDay: (paksha: PakshaType, day: DayOfWeek, selectedDate?: Date) => void;
  onCustomDayUploaded?: (dayId: string, jamas: Jama[]) => void;
  onOpenCalendar?: () => void;
  selectedDate?: Date | null;
}

const DAYS_OF_WEEK_LIST: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const PakshaDaySelector: React.FC<PakshaDaySelectorProps> = ({
  selectedPaksha,
  selectedDay,
  onSelectPakshaAndDay,
  onCustomDayUploaded,
  onOpenCalendar,
  selectedDate,
}) => {
  const { language, t, getBirdName, getDayName, getDayShortName } = useLanguage();
  const [modalDay, setModalDay] = useState<DayCalculationMeta | null>(null);
  const [showReferenceChart, setShowReferenceChart] = useState(false);
  const [chartTab, setChartTab] = useState<PakshaType>(selectedPaksha);
  const [pastedData, setPastedData] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const todayLunarInfo = getLunarDayInfo(new Date());
  const isSyncedWithToday =
    selectedPaksha === todayLunarInfo.paksha &&
    selectedDay === todayLunarInfo.dayOfWeek;

  const activeId = `${selectedPaksha}_${selectedDay}`;
  const currentMeta = PANCHA_PAKSHI_DAYS.find((d) => d.id === activeId);

  const isCustomUploaded = Boolean(getSavedCustomDayJamas(activeId));
  const isPreloaded = Boolean(currentMeta?.isReady);
  const isCurrentDayReady = isPreloaded || isCustomUploaded;

  const handleDayClick = (dayKey: DayOfWeek) => {
    const targetId = `${selectedPaksha}_${dayKey}`;
    const targetMeta = PANCHA_PAKSHI_DAYS.find((d) => d.id === targetId);
    const hasCustom = Boolean(getSavedCustomDayJamas(targetId));
    const isTargetReady = Boolean(targetMeta?.isReady) || hasCustom;

    onSelectPakshaAndDay(selectedPaksha, dayKey);

    if (!isTargetReady && targetMeta) {
      setModalDay(targetMeta);
      setPastedData('');
      setUploadStatus(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPastedData(text);
      setUploadStatus(`File loaded: ${file.name} (${text.length} chars)`);
    };
    reader.readAsText(file);
  };

  const handleSavePastedData = () => {
    if (!modalDay || !pastedData.trim()) return;

    try {
      const parsed = JSON.parse(pastedData);
      if (Array.isArray(parsed)) {
        saveCustomDayJamas(modalDay.id, parsed);
        if (onCustomDayUploaded) {
          onCustomDayUploaded(modalDay.id, parsed);
        }
        setUploadStatus('Saved calculation table for ' + (language === 'ta' ? modalDay.tamilName : modalDay.name));
        setTimeout(() => setModalDay(null), 1500);
        return;
      }
    } catch {
      setUploadStatus(
        'Text received! You can also paste this directly in the AI Studio chat, and I will compile the accurate Anthardasa math into the app codebase.'
      );
    }
  };

  const totalReadyDays = PANCHA_PAKSHI_DAYS.filter(
    (d) => d.isReady || Boolean(getSavedCustomDayJamas(d.id))
  ).length;

  const currentDayDisplayName = currentMeta
    ? (language === 'ta' ? currentMeta.tamilName : currentMeta.name)
    : '';

  return (
    <div
      id="paksha-day-selector-container"
      className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-4 shadow-lg space-y-3"
    >
      {/* Top row: Paksha Switcher & Active Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            {t('dayCalculationsHeader')}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold font-mono">
            {totalReadyDays}/14 {t('readyCount')}
          </span>
        </div>

        {/* Paksha Switcher Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onSelectPakshaAndDay('valarpirai', selectedDay)}
            id="paksha-valarpirai-tab"
            className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              selectedPaksha === 'valarpirai'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>{t('valarpirai')}</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPakshaAndDay('theipirai', selectedDay)}
            id="paksha-theipirai-tab"
            className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
              selectedPaksha === 'theipirai'
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>{t('theipirai')}</span>
          </button>
        </div>
      </div>

      {/* Real-time Astronomical Calendar Status & Opener Bar */}
      <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs shadow-inner">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('liveTodayBadge')}:</span>
          </div>

          <div className="flex items-center gap-1.5 text-slate-200">
            <span className="text-sm">{todayLunarInfo.moonEmoji}</span>
            <span
              className={`font-bold ${
                todayLunarInfo.paksha === 'valarpirai'
                  ? 'text-amber-400'
                  : 'text-indigo-400'
              }`}
            >
              {language === 'ta'
                ? todayLunarInfo.paksha === 'valarpirai'
                  ? 'வளர்பிறை'
                  : 'தேய்பிறை'
                : todayLunarInfo.paksha === 'valarpirai'
                ? 'Valarpirai'
                : 'Theipirai'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-bold text-white">
              {getDayName(todayLunarInfo.dayOfWeek)}
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 text-[11px]">
              {language === 'ta'
                ? todayLunarInfo.tithiNameTa
                : todayLunarInfo.tithiNameEn}{' '}
              ({todayLunarInfo.illuminationPercent}%)
            </span>
          </div>

          {selectedDate && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
              {language === 'ta' ? 'தேர்வு:' : 'Selected:'}{' '}
              {selectedDate.toLocaleDateString(
                language === 'ta' ? 'ta-IN' : 'en-US',
                { day: 'numeric', month: 'short' }
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isSyncedWithToday && (
            <button
              type="button"
              onClick={() =>
                onSelectPakshaAndDay(
                  todayLunarInfo.paksha,
                  todayLunarInfo.dayOfWeek,
                  new Date()
                )
              }
              id="sync-today-quick-btn"
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
              title={t('applyTodayBtn')}
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{t('applyTodayBtn')}</span>
            </button>
          )}

          {onOpenCalendar && (
            <button
              type="button"
              onClick={onOpenCalendar}
              id="open-calendar-modal-btn"
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shadow-md active:scale-95 shrink-0"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{t('openCalendarBtn')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Days of Week Selector Pills */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>{t('selectDayPrompt')}</span>
          {isCurrentDayReady ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{currentDayDisplayName} {t('fullCalculationActive')}</span>
            </span>
          ) : (
            <span className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Clock className="w-3.5 h-3.5 text-amber-400/80" />
              <span>{t('awaitingData')}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {DAYS_OF_WEEK_LIST.map((dayKey) => {
            const isSelected = selectedDay === dayKey;
            const dayId = `${selectedPaksha}_${dayKey}`;
            const targetMeta = PANCHA_PAKSHI_DAYS.find((item) => item.id === dayId);
            const isDayPreloaded = Boolean(targetMeta?.isReady);
            const hasData = isDayPreloaded || Boolean(getSavedCustomDayJamas(dayId));
            const shortLabel = getDayShortName(dayKey);

            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => handleDayClick(dayKey)}
                id={`day-select-${dayKey}`}
                className={`py-2 px-1 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/60 text-white font-bold ring-1 ring-amber-400/50'
                    : 'bg-slate-950/80 hover:bg-slate-800/90 border-slate-800 text-slate-300'
                }`}
              >
                <span className="text-xs sm:text-sm font-bold tracking-tight">{shortLabel}</span>

                {/* Status Dot / Indicator */}
                <div className="mt-1 flex items-center gap-0.5">
                  {hasData ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Day Description & Reference Chart Action */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-2.5 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                isCurrentDayReady
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isCurrentDayReady ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="font-bold text-white flex items-center gap-2">
                <span>{currentDayDisplayName}</span>
                {isCurrentDayReady ? (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                    {t('activeBadge')}
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    {t('pendingBadge')}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-[11px] mt-0.5">
                {language === 'ta'
                  ? 'அனைத்து 10 சாமங்கள், அந்தர்தசைகள் மற்றும் பட்சி தொழில்கள் சாஸ்திரப்படி கணக்கிடப்பட்டுள்ளன.'
                  : 'All 10 Jamas, Anthardasa sub-periods, and bird activities calculated according to Shastra.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => {
                setChartTab(selectedPaksha);
                setShowReferenceChart(true);
              }}
              id="view-reference-chart-btn"
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {selectedPaksha === 'valarpirai'
                  ? t('valarpiraiChartBtn')
                  : t('theipiraiChartBtn')}
              </span>
            </button>

            {!isCurrentDayReady && (
              <button
                type="button"
                onClick={() => {
                  if (currentMeta) {
                    setModalDay(currentMeta);
                    setPastedData('');
                    setUploadStatus(null);
                  }
                }}
                id="open-upload-modal-btn"
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'ta' ? 'அட்டவணையை வழங்குக' : `Provide Table for ${currentMeta?.name}`}</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Day Ruler, Night Ruler & Dying Bird (Pure Single-Language Badges) */}
        {currentMeta && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
            {currentMeta.dayRulingBird && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">{t('dayRulerBadge')}</span>
                <strong className="text-white font-bold">
                  {getBirdName(currentMeta.dayRulingBird)}
                </strong>
              </span>
            )}

            {currentMeta.nightRulingBird && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
                <Moon className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-400">{t('nightRulerBadge')}</span>
                <strong className="text-white font-bold">
                  {getBirdName(currentMeta.nightRulingBird)}
                </strong>
              </span>
            )}

            {currentMeta.dayDyingBird && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                <Skull className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-slate-400">{t('dyingBirdBadge')}</span>
                <strong className="text-rose-200 font-bold">
                  {getBirdName(currentMeta.dayDyingBird)}
                </strong>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Ruling & Dying Bird Reference Table Modal (Pure Single Language) */}
      {showReferenceChart && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-base text-white">
                    {t('chartModalTitle')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {t('chartModalSubtitle')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReferenceChart(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Paksha Switcher in Modal */}
            <div className="p-3 bg-slate-950/50 border-b border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={() => setChartTab('valarpirai')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  chartTab === 'valarpirai'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-400" />
                <span>{t('valarpiraiFull')}</span>
              </button>
              <button
                type="button"
                onClick={() => setChartTab('theipirai')}
                className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  chartTab === 'theipirai'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>{t('theipiraiFull')}</span>
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-3 font-bold text-white">{t('dayCol')}</th>
                      <th className="py-2.5 px-3 font-bold text-amber-300">
                        <div className="flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t('dayRulerCol')}</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 font-bold text-purple-300">
                        <div className="flex items-center gap-1.5">
                          <Moon className="w-3.5 h-3.5 text-purple-400" />
                          <span>{t('nightRulerCol')}</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-3 font-bold text-rose-300">
                        <div className="flex items-center gap-1.5">
                          <Skull className="w-3.5 h-3.5 text-rose-400" />
                          <span>{t('dyingBirdCol')}</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-2 text-right">{t('actionCol')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {PANCHA_PAKSHI_DAYS.filter((d) => d.paksha === chartTab).map((day) => {
                      const isCurrent = selectedPaksha === chartTab && selectedDay === day.dayOfWeek;
                      const dayRulerName = day.dayRulingBird ? getBirdName(day.dayRulingBird) : '';
                      const nightRulerName = day.nightRulingBird ? getBirdName(day.nightRulingBird) : '';
                      const dyingName = day.dayDyingBird ? getBirdName(day.dayDyingBird) : '';
                      const dayRulerColor = day.dayRulingBird ? BIRDS[day.dayRulingBird]?.color : '#fff';
                      const nightRulerColor = day.nightRulingBird ? BIRDS[day.nightRulingBird]?.color : '#fff';
                      const dyingColor = day.dayDyingBird ? BIRDS[day.dayDyingBird]?.color : '#fff';
                      const singleDayName = getDayName(day.dayOfWeek);

                      return (
                        <tr
                          key={day.id}
                          className={`transition-colors ${
                            isCurrent
                              ? 'bg-amber-500/10 font-medium text-white'
                              : 'hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold">
                            <div className="flex items-center gap-2">
                              <span>{singleDayName}</span>
                              {isCurrent && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  {t('currentBadge')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dayRulerColor }} />
                              <span className="font-semibold text-amber-200">{dayRulerName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: nightRulerColor }} />
                              <span className="font-semibold text-purple-200">{nightRulerName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dyingColor }} />
                              <span className="font-bold text-rose-300">{dyingName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectPakshaAndDay(chartTab, day.dayOfWeek);
                                setShowReferenceChart(false);
                              }}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              {t('selectThisDay')}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-400 text-[11px] space-y-1">
                {language === 'ta' ? (
                  <>
                    <p>• <strong>பகல் அரசு:</strong> சூரியோதயம் (சாமம் 1) முதல் அஸ்தமனம் (சாமம் 5) வரை ஆட்சி செய்யும்.</p>
                    <p>• <strong>இரவு அரசு:</strong> அஸ்தமனம் (சாமம் 6) முதல் மறு சூரியோதயம் (சாமம் 10) வரை ஆட்சி செய்யும்.</p>
                    <p>• <strong>சாதல் பட்சி:</strong> 24 மணி நேரமும் (சாமம் 1 முதல் 10 வரை) மரண நிலையில் இருக்கும்.</p>
                  </>
                ) : (
                  <>
                    <p>• <strong>Day Ruler:</strong> Rules from Sunrise (Jama 1) to Sunset (Jama 5).</p>
                    <p>• <strong>Night Ruler:</strong> Rules from Sunset (Jama 6) to next Sunrise (Jama 10).</p>
                    <p>• <strong>Dying Bird:</strong> In state of death throughout all 24 hours (Jama 1 to 10).</p>
                  </>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowReferenceChart(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {t('closeBtn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Uploading / Providing Calculation for this Day */}
      {modalDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">
                  {language === 'ta' ? `கணக்கீட்டு அட்டவணை: ${modalDay.tamilName}` : `Provide Calculation Table: ${modalDay.name}`}
                </h3>
              </div>
              <button
                onClick={() => setModalDay(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-200">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{language === 'ta' ? 'கணக்கீட்டு அட்டவணை உள்ளீடு' : 'Ready for Your Calculation Table!'}</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {language === 'ta'
                    ? `${modalDay.tamilName} நாளுக்கான அட்டவணை தகவல் அல்லது JSON ஐ கீழே ஒட்டவும்.`
                    : `Whenever you are ready to upload or share the calculations for ${modalDay.name}, you can paste the table text or JSON below.`}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-300">
                    {language === 'ta' ? 'கணக்கீட்டு தரவை உள்ளிடவும்:' : 'Paste Calculation Data / Table Text:'}
                  </label>
                  <label className="cursor-pointer text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Upload .txt / .json</span>
                    <input
                      type="file"
                      accept=".txt,.json,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  rows={6}
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                  placeholder="Paste Jama activities here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {uploadStatus && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs">
                  {uploadStatus}
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setModalDay(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                {t('closeBtn')}
              </button>

              <button
                type="button"
                onClick={handleSavePastedData}
                disabled={!pastedData.trim()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{language === 'ta' ? 'சேமிக்குக' : 'Save / Submit Data'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
