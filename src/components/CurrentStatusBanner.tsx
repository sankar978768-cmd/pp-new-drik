import React, { useState, useEffect } from 'react';
import { BirdId, Jama, SubPeriod, ActivityType } from '../types';
import { BIRDS, ACTIVITY_DETAILS } from '../data/panchaPakshiData';
import { getCurrentPanchaStatus, PanchaPakshiStatus } from '../utils/calculator';
import { Clock, Star, AlertTriangle, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface CurrentStatusBannerProps {
  selectedBird: BirdId;
  customJamas?: Jama[];
}

export const CurrentStatusBanner: React.FC<CurrentStatusBannerProps> = ({
  selectedBird,
  customJamas,
}) => {
  const {
    language,
    t,
    getBirdName,
    getActivityName,
    getElementName,
    getPlanetName,
    getActivityStatus,
    getActivityDescription,
    getActivityRecommendation,
  } = useLanguage();

  const [simulatedMinutes, setSimulatedMinutes] = useState<number | null>(null);
  const [liveMinutes, setLiveMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Ticker for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLiveMinutes(now.getHours() * 60 + now.getMinutes());
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const activeMinutes = simulatedMinutes !== null ? simulatedMinutes : liveMinutes;
  const isLive = simulatedMinutes === null;

  const status: PanchaPakshiStatus = getCurrentPanchaStatus(
    selectedBird,
    activeMinutes,
    customJamas
  );
  const bird = BIRDS[selectedBird];
  const subBird = BIRDS[status.activeSubPeriod.birdId];
  const mainActDetail = ACTIVITY_DETAILS[status.selectedBirdMainActivity];
  const actDetail = ACTIVITY_DETAILS[status.activeSubPeriod.activity];

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSimulatedMinutes(Number(e.target.value));
  };

  const handleResetToLive = () => {
    setSimulatedMinutes(null);
  };

  const birdDisplayName = getBirdName(selectedBird);
  const subBirdDisplayName = getBirdName(status.activeSubPeriod.birdId);

  return (
    <div
      id="current-status-banner"
      className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden"
    >
      {/* Glow accent */}
      <div
        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none -mr-20 -mt-20"
        style={{ backgroundColor: bird.color }}
      />

      {/* Top Header Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-3 w-3 relative ${isLive ? '' : 'opacity-60'}`}
            >
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isLive ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              {isLive ? t('liveNow') : t('customTimeBadge')}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700 hidden sm:block" />

          <div className="text-xs text-slate-300 font-medium flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold text-white">
              {status.timeDisplay}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-amber-300 font-semibold">
              {status.activeJama.title}
            </span>
            <span className="text-slate-500 text-[11px]">
              ({status.activeJama.isDay ? t('dayJama') : t('nightJama')})
            </span>
          </div>
        </div>

        {/* Time Scrubber */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <label htmlFor="time-slider-scrubber" className="text-[11px] text-slate-400">
            {t('scrubTime')}
          </label>
          <input
            id="time-slider-scrubber"
            type="range"
            min="0"
            max="1439"
            step="15"
            value={activeMinutes}
            onChange={handleSliderChange}
            aria-label="Scrub through 24-hour time to test bird calculations"
            className="w-28 sm:w-44 accent-amber-400 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
          {!isLive && (
            <button
              onClick={handleResetToLive}
              id="reset-to-live-btn"
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>{t('resetLive')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Col 1: Selected Bird's Main Jama Activity */}
        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              {birdDisplayName} {t('jamaPhase')}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-bold px-2.5 py-0.5 rounded-lg border ${mainActDetail.bgLight}`}
              >
                {getActivityName(status.selectedBirdMainActivity)}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {language === 'ta'
              ? `நடப்பு 2 மணி 24 நிமிட சாமத்தில் (${status.activeJama.startTime} - ${status.activeJama.endTime}) இத்தொழில் செயல்படுகிறது.`
              : `Active across the current 2-hour 24-min Jama cycle (${status.activeJama.startTime} - ${status.activeJama.endTime}).`}
          </p>
        </div>

        {/* Col 2: Active Sub-Period (Anthardasa) */}
        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              <span>{t('activeSubPeriod')}</span>
              <span className="text-slate-500">
                #{status.subPeriodIndex + 1} / 5
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-lg font-bold px-2.5 py-0.5 rounded-lg border ${actDetail.bgLight}`}
                >
                  {getActivityName(status.activeSubPeriod.activity)}
                </span>
                <div>
                  <div className="text-xs font-bold text-white">
                    {subBirdDisplayName}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {status.activeSubPeriod.startTime} – {status.activeSubPeriod.endTime}
                  </div>
                </div>
              </div>

              {/* Star Rating */}
              <div className="text-right">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-bold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{status.activeSubPeriod.star} / 10</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {t('starStrength')}
                </div>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>{t('timeRemaining')}</span>
              <span className="text-slate-200 font-medium">
                {status.minutesRemainingInSubPeriod} {t('minLeft')} ({status.activeSubPeriod.durationMinutes}m)
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${status.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Col 3: Recommendation & Advice */}
        <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-1 flex items-center gap-1.5">
              {status.activeSubPeriod.activity === 'Rule' || status.activeSubPeriod.activity === 'Eat' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : status.activeSubPeriod.activity === 'Die' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{t('guidanceFor')} {birdDisplayName}</span>
            </div>
            <div className="text-xs font-bold text-white mb-1">
              {getActivityStatus(status.activeSubPeriod.activity)}: {getActivityDescription(status.activeSubPeriod.activity)}
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {getActivityRecommendation(status.activeSubPeriod.activity)}
            </p>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800/60 flex items-center justify-between">
            <span>{t('elementLabel')} {getElementName(selectedBird)}</span>
            <span>{t('planetLabel')} {getPlanetName(selectedBird)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
