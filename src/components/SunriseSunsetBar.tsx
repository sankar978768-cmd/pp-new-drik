import React, { useState, useEffect } from 'react';
import { Sun, Moon, Sunrise, Sunset, MapPin, Check, RotateCcw, ChevronDown, ChevronUp, Sparkles, Compass } from 'lucide-react';
import { calculateSolarTimes } from '../utils/solarCalculator';
import { LocationSearchBar } from './LocationSearchBar';
import { Jama } from '../types';
import { getActBaseDurations } from '../utils/calculator';
import { useLanguage } from '../context/LanguageContext';

interface SunriseSunsetBarProps {
  sunriseTime: string;
  sunsetTime: string;
  nextSunriseTime: string;
  isCustomSchedule: boolean;
  onApplySunriseSunset: (sunrise: string, sunset: string, nextSunrise: string, cityName?: string) => void;
  onResetSchedule: () => void;
  locationName?: string;
  baseJamas?: Jama[];
}

export const SunriseSunsetBar: React.FC<SunriseSunsetBarProps> = ({
  sunriseTime,
  sunsetTime,
  nextSunriseTime,
  isCustomSchedule,
  onApplySunriseSunset,
  onResetSchedule,
  locationName,
  baseJamas,
}) => {
  const { language, t, getActivityName } = useLanguage();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // Form states
  const [tempSunrise, setTempSunrise] = useState<string>(sunriseTime);
  const [tempSunset, setTempSunset] = useState<string>(sunsetTime);
  const [tempNextSunrise, setTempNextSunrise] = useState<string>(nextSunriseTime);
  const [tempCity, setTempCity] = useState<string>(locationName || '');
  const [geoLoading, setGeoLoading] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [justApplied, setJustApplied] = useState<boolean>(false);

  // Synchronize when external props change
  useEffect(() => {
    setTempSunrise(sunriseTime);
    setTempSunset(sunsetTime);
    setTempNextSunrise(nextSunriseTime);
    if (locationName) setTempCity(locationName);
  }, [sunriseTime, sunsetTime, nextSunriseTime, locationName]);

  // Compute live duration metrics for temp values
  const parseMin = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const sMin = parseMin(tempSunrise);
  let setMin = parseMin(tempSunset);
  if (setMin <= sMin) setMin += 1440;
  let nextSMin = parseMin(tempNextSunrise);
  while (nextSMin <= setMin) nextSMin += 1440;

  const dayTotal = Math.max(0, setMin - sMin);
  const nightTotal = Math.max(0, nextSMin - setMin);
  const dayJamaDur = Math.round((dayTotal / 5) * 10) / 10;
  const nightJamaDur = Math.round((nightTotal / 5) * 10) / 10;

  const formatHoursMins = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  // Base act durations and weights for active day
  const {
    dayActBaseDurations,
    dayBaseSum,
    nightActBaseDurations,
    nightBaseSum,
  } = getActBaseDurations(baseJamas);

  const triggerLiveUpdate = (sr: string, ss: string, nsr: string, city?: string) => {
    const sM = parseMin(sr);
    let ssM = parseMin(ss);
    if (ssM <= sM) ssM += 1440;
    let nsrM = parseMin(nsr);
    while (nsrM <= ssM) nsrM += 1440;

    if (ssM > sM && nsrM > ssM) {
      onApplySunriseSunset(sr, ss, nsr, city);
    }
  };

  const handleApply = () => {
    if (dayTotal <= 0 || nightTotal <= 0) {
      return;
    }
    onApplySunriseSunset(tempSunrise, tempSunset, tempNextSunrise, tempCity || undefined);
    setJustApplied(true);
    setTimeout(() => setJustApplied(false), 2500);
  };

  const handleApplyLocationSchedule = (sr: string, ss: string, nsr: string, locName: string) => {
    setTempSunrise(sr);
    setTempSunset(ss);
    setTempNextSunrise(nsr);
    setTempCity(locName);
    triggerLiveUpdate(sr, ss, nsr, locName);
  };

  const handleResetStandard = () => {
    setTempSunrise('06:00');
    setTempSunset('18:00');
    setTempNextSunrise('06:00');
    setTempCity('');
    onResetSchedule();
  };

  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      setGeoError(language === 'ta' ? 'ஜிபிஎஸ் வசதி ஆதரிக்கப்படவில்லை.' : 'Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        const { latitude, longitude } = position.coords;
        const calculated = calculateSolarTimes(latitude, longitude);
        setTempSunrise(calculated.sunrise);
        setTempSunset(calculated.sunset);
        setTempNextSunrise(calculated.nextSunrise);
        const gpsName = language === 'ta'
          ? `ஜிபிஎஸ் இடம் (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`
          : `Device GPS (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`;
        setTempCity(gpsName);
        triggerLiveUpdate(calculated.sunrise, calculated.sunset, calculated.nextSunrise, gpsName);
      },
      (err) => {
        setGeoLoading(false);
        setGeoError(err.message || (language === 'ta' ? 'இருப்பிடத்தை பெற முடியவில்லை.' : 'Unable to retrieve your location.'));
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const adjustMinutes = (timeStr: string, deltaMin: number): string => {
    let total = parseMin(timeStr) + deltaMin;
    total = ((total % 1440) + 1440) % 1440;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="custom-sunrise-sunset-container"
      className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition-all"
    >
      {/* Primary Bar (Always visible) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-850/80 transition-colors select-none"
      >
        {/* Left Info: Current Sunrise & Sunset values */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Sunrise className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {language === 'ta' ? 'சூரிய நேர அட்டவணை' : 'Pancha Pakshi Solar Schedule'}
              </span>
              {isCustomSchedule ? (
                <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  {language === 'ta' ? `தனிப்பயன் ${locationName ? `(${locationName})` : ''}` : `Custom Active ${locationName ? `(${locationName})` : ''}`}
                </span>
              ) : (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {language === 'ta' ? 'நிலையான நேரம் (06:00 - 18:00)' : 'Standard (06:00 - 18:00)'}
                </span>
              )}
            </div>

            {/* Quick Times Summary Display */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm font-semibold text-white mt-0.5 font-mono">
              <span className="flex items-center gap-1 text-amber-300">
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'ta' ? 'உதயம்:' : 'Sunrise:'} <strong>{sunriseTime}</strong></span>
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="flex items-center gap-1 text-purple-300">
                <Sunset className="w-3.5 h-3.5 text-purple-400" />
                <span>{language === 'ta' ? 'அஸ்தமனம்:' : 'Sunset:'} <strong>{sunsetTime}</strong></span>
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-slate-400 text-xs font-normal">
                {language === 'ta' ? 'பகல்:' : 'Day:'} {formatHoursMins(setMin - sMin)} ({dayJamaDur}m/{language === 'ta' ? 'சாமம்' : 'Jama'})
              </span>
            </div>
          </div>
        </div>

        {/* Right Action: Expand/Collapse Toggle & Quick Reset */}
        <div className="flex items-center gap-2 self-start md:self-center">
          {isCustomSchedule && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onResetSchedule();
              }}
              id="quick-reset-schedule-btn"
              title="Reset"
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center gap-1 font-medium cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>{language === 'ta' ? 'இயல்பு நிலை' : 'Standard 6-6'}</span>
            </button>
          )}

          <button
            id="toggle-sunrise-sunset-editor-btn"
            className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>
              {isExpanded
                ? (language === 'ta' ? 'அமைப்புகளை மறைக்க' : 'Hide Settings')
                : (language === 'ta' ? 'சூரியோதய நேரம் மாற்று' : 'Custom Sunrise / Sunset')}
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Custom Editor */}
      {isExpanded && (
        <div className="border-t border-slate-800/80 p-4 sm:p-5 bg-slate-950/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>{language === 'ta' ? 'சூரியோதயம் மற்றும் அஸ்தமன நேரங்கள்' : 'Custom Sunrise, Sunset & Next Day Timings'}</span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'ta'
                  ? 'பகல் 5 சாமங்களாகவும் இரவு 5 சாமங்களாகவும் பிரிக்கப்பட்டு அந்தர்தசைகள் கணக்கிடப்படுகின்றன.'
                  : 'Pancha Pakshi calculations divide Daytime into 5 equal Jamas and Nighttime into 5 equal Jamas, with all sub-periods scaled proportionally.'}
              </p>
            </div>

            {/* GPS Detection Button */}
            <button
              onClick={handleDetectGPS}
              disabled={geoLoading}
              id="gps-detect-btn"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>{geoLoading ? (language === 'ta' ? 'கண்டறியப்படுகிறது...' : 'Detecting Location...') : (language === 'ta' ? 'எனது ஜிபிஎஸ் இடம்' : 'Use My GPS Location')}</span>
            </button>
          </div>

          {geoError && (
            <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              {geoError}
            </div>
          )}

          {/* Time Input Columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Sunrise (Today) */}
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <label className="block text-xs font-bold text-amber-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sunrise className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'ta' ? 'சூரியோதயம் (இன்று)' : 'Sunrise (Today)'}</span>
                </span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={tempSunrise}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempSunrise(val);
                    setTempCity('');
                    if (val) triggerLiveUpdate(val, tempSunset, tempNextSunrise, '');
                  }}
                  id="custom-sunrise-input"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm w-full focus:outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = adjustMinutes(tempSunrise, -5);
                    setTempSunrise(updated);
                    setTempCity('');
                    triggerLiveUpdate(updated, tempSunset, tempNextSunrise, '');
                  }}
                  title="-5 mins"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = adjustMinutes(tempSunrise, +5);
                    setTempSunrise(updated);
                    setTempCity('');
                    triggerLiveUpdate(updated, tempSunset, tempNextSunrise, '');
                  }}
                  title="+5 mins"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Sunset (Today) */}
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <label className="block text-xs font-bold text-purple-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sunset className="w-3.5 h-3.5 text-purple-400" />
                  <span>{language === 'ta' ? 'அஸ்தமனம் (இன்று)' : 'Sunset (Today)'}</span>
                </span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={tempSunset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempSunset(val);
                    setTempCity('');
                    if (val) triggerLiveUpdate(tempSunrise, val, tempNextSunrise, '');
                  }}
                  id="custom-sunset-input"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm w-full focus:outline-none focus:border-purple-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = adjustMinutes(tempSunset, -5);
                    setTempSunset(updated);
                    setTempCity('');
                    triggerLiveUpdate(tempSunrise, updated, tempNextSunrise, '');
                  }}
                  title="-5 mins"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = adjustMinutes(tempSunset, +5);
                    setTempSunset(updated);
                    setTempCity('');
                    triggerLiveUpdate(tempSunrise, updated, tempNextSunrise, '');
                  }}
                  title="+5 mins"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                >
                  +5
                </button>
              </div>
            </div>

            {/* Sunrise (Tomorrow) */}
            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
              <label className="block text-xs font-bold text-indigo-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{language === 'ta' ? 'சூரியோதயம் (நாளை)' : 'Sunrise (Tomorrow)'}</span>
                </span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="time"
                  value={tempNextSunrise}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTempNextSunrise(val);
                    setTempCity('');
                    if (val) triggerLiveUpdate(tempSunrise, tempSunset, val, '');
                  }}
                  id="custom-next-sunrise-input"
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-sm w-full focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => {
                    const updated = adjustMinutes(tempNextSunrise, -5);
                    setTempNextSunrise(updated);
                    setTempCity('');
                    triggerLiveUpdate(tempSunrise, tempSunset, updated, '');
                  }}
                  title="-5 mins"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                >
                  -5
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updated = adjustMinutes(tempNextSunrise, +5);
                    setTempNextSunrise(updated);
                    setTempCity('');
                    triggerLiveUpdate(tempSunrise, tempSunset, updated, '');
                  }}
                  title="+5 mins"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold"
                >
                  +5
                </button>
              </div>
            </div>
          </div>

          {/* Location Search & 5 Recent Searches */}
          <LocationSearchBar
            currentLocationName={tempCity}
            onApplyLocationSchedule={handleApplyLocationSchedule}
            onResetStandard={handleResetStandard}
            isCustomActive={isCustomSchedule}
          />

          {/* Real-time scaling metrics & proportions respected to acts */}
          <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 text-xs grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-amber-400 font-bold flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Sun className="w-3.5 h-3.5" />
                  <span>{language === 'ta' ? 'பகல் சாமங்கள் (1 முதல் 5)' : 'Day Calculations (Jamas 1 to 5)'}</span>
                </div>
              </div>
              <p className="text-slate-300 font-mono mt-1 text-[11px]">
                {language === 'ta' ? 'மொத்தம்:' : 'Total:'} <strong>{dayTotal} {t('minutesSuffix')}</strong> ({formatHoursMins(dayTotal)}) • 5 {language === 'ta' ? 'சாமங்கள்' : 'Jamas'} (<strong>{dayJamaDur} {t('minutesSuffix')}</strong>)
              </p>
              <div className="text-[11px] text-slate-400 mt-1.5 font-mono flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="text-emerald-300 font-medium">
                  {getActivityName('Rule')}: {Math.round(dayJamaDur * (dayActBaseDurations.Rule / dayBaseSum) * 10) / 10}m
                </span>
                <span>•</span>
                <span className="text-sky-300 font-medium">
                  {getActivityName('Walk')}: {Math.round(dayJamaDur * (dayActBaseDurations.Walk / dayBaseSum) * 10) / 10}m
                </span>
                <span>•</span>
                <span className="text-amber-300 font-medium">
                  {getActivityName('Eat')}: {Math.round(dayJamaDur * (dayActBaseDurations.Eat / dayBaseSum) * 10) / 10}m
                </span>
                <span>•</span>
                <span className="text-indigo-300 font-medium">
                  {getActivityName('Sleep')}: {Math.round(dayJamaDur * (dayActBaseDurations.Sleep / dayBaseSum) * 10) / 10}m
                </span>
                <span>•</span>
                <span className="text-rose-300 font-medium">
                  {getActivityName('Die')}: {Math.round(dayJamaDur * (dayActBaseDurations.Die / dayBaseSum) * 10) / 10}m
                </span>
              </div>
            </div>

            <div>
              <div className="text-purple-400 font-bold flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Moon className="w-3.5 h-3.5" />
                  <span>{language === 'ta' ? 'இரவு சாமங்கள் (6 முதல் 10)' : 'Night Calculations (Jamas 6 to 10)'}</span>
                </div>
              </div>
              <p className="text-slate-300 font-mono mt-1 text-[11px]">
                {language === 'ta' ? 'மொத்தம்:' : 'Total:'} <strong>{nightTotal} {t('minutesSuffix')}</strong> ({formatHoursMins(nightTotal)}) • 5 {language === 'ta' ? 'சாமங்கள்' : 'Jamas'} (<strong>{nightJamaDur} {t('minutesSuffix')}</strong>)
              </p>
              <div className="text-[11px] text-slate-400 mt-1.5 font-mono flex flex-wrap gap-x-2 gap-y-0.5">
                <span className="text-emerald-300 font-medium">
                  {getActivityName('Rule')}: {Math.round(nightJamaDur * (nightActBaseDurations.Rule / nightBaseSum) * 10) / 10}m
                </span>
                <span>•</span>
                <span className="text-amber-300 font-medium">
                  {getActivityName('Eat')}: {Math.round(nightJamaDur * (nightActBaseDurations.Eat / nightBaseSum) * 10) / 10}m
                </span>
                <span>•</span>
                <span className="text-sky-300 font-medium">
                  {getActivityName('Walk')}: {Math.round(nightJamaDur * (nightActBaseDurations.Walk / nightBaseSum) * 10) / 10}m
                </span>
                <span>•</span>
                <span className="text-indigo-300 font-medium">
                  {getActivityName('Sleep')}: {Math.round(nightJamaDur * (nightActBaseDurations.Sleep / nightBaseSum) * 10) / 10}m
                </span>
                <span>•</span>
                <span className="text-rose-300 font-medium">
                  {getActivityName('Die')}: {Math.round(nightJamaDur * (nightActBaseDurations.Die / nightBaseSum) * 10) / 10}m
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApply}
                id="apply-custom-sun-btn"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-950/50 cursor-pointer"
              >
                {justApplied ? <Check className="w-4 h-4 text-slate-950" /> : <Sparkles className="w-4 h-4" />}
                <span>{justApplied ? (language === 'ta' ? 'சேமிக்கப்பட்டது!' : 'Saved & Applied!') : (language === 'ta' ? 'அட்டவணையை சேமிக்குக' : 'Save & Lock Custom Schedule')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onResetSchedule();
                }}
                id="reset-to-standard-btn"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                {language === 'ta' ? 'இயல்பு நிலை' : 'Reset Default'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              {t('closeBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
