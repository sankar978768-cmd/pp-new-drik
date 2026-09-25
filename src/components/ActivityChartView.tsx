import React, { useState, useMemo, useRef, useEffect } from 'react';
import { BirdId, Jama, ActivityType, SubPeriod } from '../types';
import { BIRDS, ALL_BIRD_IDS, ACTIVITY_DETAILS } from '../data/panchaPakshiData';
import { useLanguage } from '../context/LanguageContext';
import {
  BarChart3,
  Activity,
  Star,
  ArrowDownUp,
  Sun,
  Moon,
  Info,
  Check,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers,
  Zap,
  TrendingUp,
} from 'lucide-react';

interface ActivityChartViewProps {
  selectedBird: BirdId;
  customJamas?: Jama[];
  sunriseTime?: string;
  sunsetTime?: string;
  nextSunriseTime?: string;
  onSelectBird?: (birdId: BirdId) => void;
}

export type ChartMethod = 'work' | 'star';
export type ChartResolution = 'main' | 'sub';
export type CurveType = 'smooth' | 'straight';

interface ChartPoint {
  x: number; // 0 to 1440 minutes from cycle start
  yVal: number; // normalized 0 (top) to 1 (bottom)
  actualTime: string;
  timeRange: string;
  activity: ActivityType;
  star: number;
  jamaNumber: number;
  subIndex?: number;
  birdId: BirdId;
  startMin: number;
  endMin: number;
}

// Catmull-Rom to Cubic Bezier curve path generator
function generateCurvedPath(points: { x: number; y: number }[], tension = 0.22): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * (1 + tension);
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * (1 + tension);

    const cp2x = p2.x - ((p3.x - p1.x) / 6) * (1 + tension);
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * (1 + tension);

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

function generateStraightPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  return points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

// Work order arrays
const WORK_ORDER_NORMAL: ActivityType[] = ['Die', 'Sleep', 'Walk', 'Eat', 'Rule'];
const WORK_ORDER_INVERTED: ActivityType[] = ['Rule', 'Eat', 'Walk', 'Sleep', 'Die'];

export const ActivityChartView: React.FC<ActivityChartViewProps> = ({
  selectedBird,
  customJamas,
  sunriseTime = '06:00',
  sunsetTime = '18:00',
  nextSunriseTime = '06:00',
  onSelectBird,
}) => {
  const { language, t, getBirdName, getActivityName, getActivityStatus } = useLanguage();

  // Chart configuration state
  const [method, setMethod] = useState<ChartMethod>('work');
  const [resolution, setResolution] = useState<ChartResolution>('sub');
  const [invertWorkOrder, setInvertWorkOrder] = useState<boolean>(false);
  const [invertStarOrder, setInvertStarOrder] = useState<boolean>(false);
  const [curveType, setCurveType] = useState<CurveType>('smooth');

  // Multi-bird comparison state: allow selecting 1 to 5 birds
  const [comparedBirds, setComparedBirds] = useState<BirdId[]>([selectedBird]);

  // Ensure current active bird is included when user changes selectedBird outside
  useEffect(() => {
    if (!comparedBirds.includes(selectedBird)) {
      setComparedBirds((prev) => [...prev, selectedBird]);
    }
  }, [selectedBird]);

  // Interactive hover / scrub state
  const [hoveredMinute, setHoveredMinute] = useState<number | null>(null);
  const [hoveredPointInfo, setHoveredPointInfo] = useState<{
    minute: number;
    points: Record<BirdId, ChartPoint>;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // SVG Dimension system
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 440;
  const MARGIN = { top: 35, right: 35, bottom: 65, left: 130 };
  const CHART_WIDTH = SVG_WIDTH - MARGIN.left - MARGIN.right;
  const CHART_HEIGHT = SVG_HEIGHT - MARGIN.top - MARGIN.bottom;

  // Active jamas list
  const jamas = useMemo(() => {
    return customJamas || [];
  }, [customJamas]);

  const cycleStartMin = jamas[0]?.startMinutesFromMidnight ?? 360;
  const totalDuration = 1440; // 24 hours = 1440 minutes

  // Current real-time minute in cycle
  const currentLiveMinuteInCycle = useMemo(() => {
    const d = new Date();
    const currMidnight = d.getHours() * 60 + d.getMinutes();
    let diff = currMidnight - cycleStartMin;
    if (diff < 0) diff += 1440;
    return diff;
  }, [cycleStartMin]);

  // Work order determination
  const workOrder = invertWorkOrder ? WORK_ORDER_INVERTED : WORK_ORDER_NORMAL;

  // Toggle bird selection in compare list
  const toggleBirdInCompare = (birdId: BirdId) => {
    if (comparedBirds.includes(birdId)) {
      if (comparedBirds.length === 1) return; // keep at least one
      setComparedBirds(comparedBirds.filter((b) => b !== birdId));
    } else {
      setComparedBirds([...comparedBirds, birdId]);
    }
  };

  // Helper mappings
  const getActivityY = (activity: ActivityType): number => {
    const idx = workOrder.indexOf(activity);
    if (idx === -1) return 0.5;
    return idx / (workOrder.length - 1); // 0 (top) to 1 (bottom)
  };

  const getStarY = (star: number): number => {
    // Star rating is from 1 to 10
    // Normal: 1 at top (0), 10 at bottom (1)
    // Inverted: 10 at top (0), 1 at bottom (1)
    const clamped = Math.max(1, Math.min(10, star));
    if (invertStarOrder) {
      return (10 - clamped) / 9;
    }
    return (clamped - 1) / 9;
  };

  // Build chart dataset for each compared bird
  const birdDatasets = useMemo(() => {
    const result: Record<BirdId, { rawPoints: ChartPoint[]; svgPoints: { x: number; y: number; point: ChartPoint }[] }> = {} as any;

    if (!jamas || jamas.length === 0) return result;

    comparedBirds.forEach((birdId) => {
      const rawPoints: ChartPoint[] = [];

      if (resolution === 'main') {
        // 10 Jamas mode
        jamas.forEach((jama) => {
          const col = jama.columns[birdId];
          if (!col) return;

          // Compute midpoint minute from cycle start
          let startOffset = jama.startMinutesFromMidnight - cycleStartMin;
          if (startOffset < 0) startOffset += 1440;
          let endOffset = jama.endMinutesFromMidnight - cycleStartMin;
          if (endOffset <= 0) endOffset += 1440;
          const midOffset = (startOffset + endOffset) / 2;

          const avgStar = col.subPeriods.reduce((acc, sp) => acc + sp.star, 0) / (col.subPeriods.length || 1);

          const yVal = method === 'work' ? getActivityY(col.mainActivity) : getStarY(avgStar);

          rawPoints.push({
            x: midOffset,
            yVal,
            actualTime: `${jama.startTime} - ${jama.endTime}`,
            timeRange: `${jama.startTime} - ${jama.endTime}`,
            activity: col.mainActivity,
            star: Math.round(avgStar * 10) / 10,
            jamaNumber: jama.jamaNumber,
            birdId,
            startMin: startOffset,
            endMin: endOffset,
          });
        });
      } else {
        // Sub-periods mode: 50 points across the day
        jamas.forEach((jama) => {
          const col = jama.columns[birdId];
          if (!col) return;

          col.subPeriods.forEach((sp: SubPeriod, subIdx: number) => {
            let startOffset = sp.startMinutesFromMidnight - cycleStartMin;
            if (startOffset < 0) startOffset += 1440;
            let endOffset = sp.endMinutesFromMidnight - cycleStartMin;
            if (endOffset <= 0) endOffset += 1440;
            const midOffset = (startOffset + endOffset) / 2;

            const yVal = method === 'work' ? getActivityY(sp.activity) : getStarY(sp.star);

            rawPoints.push({
              x: midOffset,
              yVal,
              actualTime: `${sp.startTime} - ${sp.endTime}`,
              timeRange: `${sp.startTime} - ${sp.endTime}`,
              activity: sp.activity,
              star: sp.star,
              jamaNumber: jama.jamaNumber,
              subIndex: subIdx + 1,
              birdId,
              startMin: startOffset,
              endMin: endOffset,
            });
          });
        });
      }

      // Sort points by x coordinate
      rawPoints.sort((a, b) => a.x - b.x);

      // Convert raw points to SVG coordinate space
      const svgPoints = rawPoints.map((pt) => {
        const svgX = MARGIN.left + (pt.x / totalDuration) * CHART_WIDTH;
        const svgY = MARGIN.top + pt.yVal * CHART_HEIGHT;
        return { x: svgX, y: svgY, point: pt };
      });

      result[birdId] = { rawPoints, svgPoints };
    });

    return result;
  }, [
    comparedBirds,
    jamas,
    resolution,
    method,
    invertWorkOrder,
    invertStarOrder,
    cycleStartMin,
    totalDuration,
    CHART_WIDTH,
    CHART_HEIGHT,
    MARGIN.left,
    MARGIN.top,
  ]);

  // Handle cursor scrubbing on SVG
  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const relativeX = clientX - rect.left;
    const svgScale = SVG_WIDTH / rect.width;
    const scaledX = relativeX * svgScale;

    if (scaledX < MARGIN.left || scaledX > MARGIN.left + CHART_WIDTH) {
      setHoveredMinute(null);
      setHoveredPointInfo(null);
      return;
    }

    const minuteFraction = (scaledX - MARGIN.left) / CHART_WIDTH;
    const targetMinute = minuteFraction * totalDuration;
    setHoveredMinute(targetMinute);

    // Find nearest point for each compared bird
    const matchedPoints: Record<BirdId, ChartPoint> = {} as any;
    comparedBirds.forEach((bId) => {
      const ds = birdDatasets[bId];
      if (ds && ds.rawPoints.length > 0) {
        let best = ds.rawPoints[0];
        let minDiff = Math.abs(best.x - targetMinute);
        for (const pt of ds.rawPoints) {
          const diff = Math.abs(pt.x - targetMinute);
          if (diff < minDiff) {
            minDiff = diff;
            best = pt;
          }
        }
        matchedPoints[bId] = best;
      }
    });

    setHoveredPointInfo({
      minute: targetMinute,
      points: matchedPoints,
    });
  };

  const handlePointerLeave = () => {
    setHoveredMinute(null);
    setHoveredPointInfo(null);
  };

  // Jama X positions & boundaries
  const jamaBoundaries = useMemo(() => {
    if (!jamas || jamas.length === 0) return [];
    return jamas.map((j) => {
      let offset = j.startMinutesFromMidnight - cycleStartMin;
      if (offset < 0) offset += 1440;
      const x = MARGIN.left + (offset / totalDuration) * CHART_WIDTH;
      return {
        jamaNumber: j.jamaNumber,
        isDay: j.isDay,
        title: j.title,
        startTime: j.startTime,
        endTime: j.endTime,
        x,
      };
    });
  }, [jamas, cycleStartMin, totalDuration, CHART_WIDTH, MARGIN.left]);

  // Y-axis tick marks
  const yTicks = useMemo(() => {
    if (method === 'work') {
      return workOrder.map((act, idx) => {
        const yNorm = idx / (workOrder.length - 1);
        const yPos = MARGIN.top + yNorm * CHART_HEIGHT;
        const details = ACTIVITY_DETAILS[act];
        return {
          id: act,
          labelEn: act,
          labelTa: details?.tamilName.split(' ')[0] || act,
          y: yPos,
          color:
            act === 'Rule'
              ? '#10b981'
              : act === 'Eat'
              ? '#14b8a6'
              : act === 'Walk'
              ? '#f59e0b'
              : act === 'Sleep'
              ? '#818cf8'
              : '#f43f5e',
        };
      });
    } else {
      // Star ratings 1 to 10
      const ratings = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const displayRatings = invertStarOrder ? [...ratings].reverse() : ratings;

      return displayRatings.map((rating) => {
        const yNorm = getStarY(rating);
        const yPos = MARGIN.top + yNorm * CHART_HEIGHT;
        return {
          id: `star-${rating}`,
          labelEn: `${rating} Star${rating > 1 ? 's' : ''}`,
          labelTa: `${rating} ⭐`,
          y: yPos,
          color: rating >= 8 ? '#10b981' : rating >= 5 ? '#f59e0b' : '#f43f5e',
          rating,
        };
      });
    }
  }, [method, workOrder, invertStarOrder, CHART_HEIGHT, MARGIN.top]);

  return (
    <div
      id="pancha-pakshi-activity-chart-view"
      className="bg-slate-900/95 border border-slate-800 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-4 select-none"
    >
      {/* 1. Header & Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>{t('chartTitle')}</span>
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              {t('chartSubtitle')}
            </p>
          </div>
        </div>

        {/* Quick presets for compared birds */}
        <div className="flex items-center gap-1.5 flex-wrap self-start md:self-auto text-xs">
          <button
            type="button"
            onClick={() => setComparedBirds([selectedBird])}
            id="preset-my-bird-btn"
            className={`px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
              comparedBirds.length === 1 && comparedBirds.includes(selectedBird)
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-bold'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {t('presetMyBird')}
          </button>

          <button
            type="button"
            onClick={() => {
              // Day ruler & night ruler
              setComparedBirds(['vulture', 'crow']);
            }}
            id="preset-rulers-btn"
            className={`px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
              comparedBirds.length === 2 && comparedBirds.includes('vulture') && comparedBirds.includes('crow')
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-bold'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {t('presetRulers')}
          </button>

          <button
            type="button"
            onClick={() => setComparedBirds([...ALL_BIRD_IDS])}
            id="preset-all-birds-btn"
            className={`px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
              comparedBirds.length === 5
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-bold'
                : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {t('presetAll')}
          </button>
        </div>
      </div>

      {/* 2. Interactive Controls Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 bg-slate-950/70 p-3 rounded-xl border border-slate-800 text-xs">
        {/* Method 1 vs Method 2 Switcher */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {language === 'ta' ? 'வரைபட முறை (Method)' : 'Chart Method'}
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setMethod('work')}
              id="chart-method-work-btn"
              className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                method === 'work'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{language === 'ta' ? 'முறை 1: தொழில்' : 'Method 1: Work'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMethod('star')}
              id="chart-method-star-btn"
              className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                method === 'star'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>{language === 'ta' ? 'முறை 2: நட்சத்திரம்' : 'Method 2: Stars'}</span>
            </button>
          </div>
        </div>

        {/* Resolution: Main Jama vs Sub-Periods */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {language === 'ta' ? 'கால அளவு (Period)' : 'Timeline Granularity'}
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setResolution('main')}
              id="chart-res-main-btn"
              className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                resolution === 'main'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'ta' ? '10 சாமங்கள்' : '10 Jamas'}</span>
            </button>

            <button
              type="button"
              onClick={() => setResolution('sub')}
              id="chart-res-sub-btn"
              className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                resolution === 'sub'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'ta' ? '50 அந்தர்தசை' : '50 Sub-Periods'}</span>
            </button>
          </div>
        </div>

        {/* Curve Type: Smooth Curved Line vs Straight */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {language === 'ta' ? 'கோட்டு வடிவம்' : 'Line Smoothing'}
          </label>
          <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setCurveType('smooth')}
              id="chart-curve-smooth-btn"
              className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                curveType === 'smooth'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t('curveTypeSmooth')}</span>
            </button>

            <button
              type="button"
              onClick={() => setCurveType('straight')}
              id="chart-curve-straight-btn"
              className={`py-1.5 px-2 rounded-lg font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                curveType === 'straight'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t('curveTypeStraight')}</span>
            </button>
          </div>
        </div>

        {/* Invert Order Toggle (Method 1: Work Order, Method 2: Star Rating) */}
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {method === 'work' ? t('invertWorkOrderLabel') : t('invertStarOrderLabel')}
          </label>
          {method === 'work' ? (
            <button
              type="button"
              onClick={() => setInvertWorkOrder(!invertWorkOrder)}
              id="toggle-invert-work-btn"
              className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-between transition-all cursor-pointer ${
                invertWorkOrder
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ArrowDownUp className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">
                  {invertWorkOrder
                    ? language === 'ta'
                      ? 'அரசு (மேல்) ⇄ சாவு (கீழ்)'
                      : 'Rule (Top) ⇄ Die (Bottom)'
                    : language === 'ta'
                    ? 'சாவு (மேல்) ⇄ அரசு (கீழ்)'
                    : 'Die (Top) ⇄ Rule (Bottom)'}
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 ml-1">
                {invertWorkOrder ? 'Inverted' : 'Default'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setInvertStarOrder(!invertStarOrder)}
              id="toggle-invert-star-btn"
              className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-between transition-all cursor-pointer ${
                invertStarOrder
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <ArrowDownUp className="w-3.5 h-3.5 text-amber-400" />
                <span className="truncate">
                  {invertStarOrder
                    ? language === 'ta'
                      ? '10 ⭐ (மேல்) ⇄ 1 ⭐ (கீழ்)'
                      : '10 Stars (Top) ⇄ 1 (Bottom)'
                    : language === 'ta'
                    ? '1 ⭐ (மேல்) ⇄ 10 ⭐ (கீழ்)'
                    : '1 Star (Top) ⇄ 10 (Bottom)'}
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 ml-1">
                {invertStarOrder ? 'Inverted' : 'Default'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Birds Multi-Toggle Bar (Compare 2 or 3 birds with distinct color lines) */}
      <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-300">
            {t('compareBirdsPrompt')}
          </span>
          <span className="text-[11px] text-slate-400 hidden lg:inline">
            ({comparedBirds.length} {language === 'ta' ? 'தேர்வு செய்யப்பட்டுள்ளது' : 'selected'})
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:flex sm:items-center sm:gap-2">
          {ALL_BIRD_IDS.map((bId) => {
            const birdInfo = BIRDS[bId];
            const isCompared = comparedBirds.includes(bId);
            const isPrimary = selectedBird === bId;

            return (
              <button
                key={bId}
                type="button"
                onClick={() => toggleBirdInCompare(bId)}
                id={`toggle-chart-bird-${bId}`}
                className={`py-1.5 px-2 sm:px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer relative ${
                  isCompared
                    ? 'text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                style={{
                  backgroundColor: isCompared ? `${birdInfo.color}25` : undefined,
                  borderColor: isCompared ? birdInfo.color : undefined,
                }}
                title={birdInfo.name}
              >
                {/* Bird Colored indicator dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: birdInfo.color }}
                />
                <span className="truncate">
                  {getBirdName(bId).split(' ')[0]}
                </span>
                {isCompared && (
                  <Check className="w-3 h-3 ml-0.5 shrink-0" style={{ color: birdInfo.color }} />
                )}
                {isPrimary && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-950"
                    title="Active Primary Bird"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Main SVG Curved Chart Display Container */}
      <div
        ref={containerRef}
        className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-inner touch-pan-x"
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-auto block select-none"
          onMouseMove={handlePointerMove}
          onTouchMove={handlePointerMove}
          onMouseLeave={handlePointerLeave}
          onTouchEnd={handlePointerLeave}
        >
          <defs>
            {/* Gradients for each bird's area fill underneath the curve */}
            {comparedBirds.map((bId) => {
              const birdInfo = BIRDS[bId];
              return (
                <linearGradient
                  key={`gradient-${bId}`}
                  id={`chart-gradient-${bId}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={birdInfo.color} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={birdInfo.color} stopOpacity="0.01" />
                </linearGradient>
              );
            })}

            {/* Day and Night background tint filters */}
            <linearGradient id="day-bg-tint" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="night-bg-tint" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Background: Day Phase (first 720 mins) & Night Phase (second 720 mins) */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={CHART_WIDTH / 2}
            height={CHART_HEIGHT}
            fill="url(#day-bg-tint)"
          />
          <rect
            x={MARGIN.left + CHART_WIDTH / 2}
            y={MARGIN.top}
            width={CHART_WIDTH / 2}
            height={CHART_HEIGHT}
            fill="url(#night-bg-tint)"
          />

          {/* Day / Night phase labels & icons */}
          <g className="text-[11px] font-bold">
            {/* Day Header */}
            <g transform={`translate(${MARGIN.left + 15}, ${MARGIN.top - 12})`}>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <text x="18" y="10" fill="#f59e0b" fontSize="11" fontWeight="bold">
                {t('dayCycleLabel')} ({sunriseTime} - {sunsetTime})
              </text>
            </g>

            {/* Night Header */}
            <g transform={`translate(${MARGIN.left + CHART_WIDTH / 2 + 15}, ${MARGIN.top - 12})`}>
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <text x="18" y="10" fill="#818cf8" fontSize="11" fontWeight="bold">
                {t('nightCycleLabel')} ({sunsetTime} - {nextSunriseTime})
              </text>
            </g>
          </g>

          {/* Vertical Dotted Lines for each of the 10 Jamas */}
          {jamaBoundaries.map((jb, idx) => (
            <g key={`jama-grid-${idx}`}>
              <line
                x1={jb.x}
                y1={MARGIN.top}
                x2={jb.x}
                y2={MARGIN.top + CHART_HEIGHT}
                stroke={jb.isDay ? '#334155' : '#1e293b'}
                strokeWidth={jb.jamaNumber === 6 ? '2' : '1'}
                strokeDasharray={jb.jamaNumber === 6 ? 'none' : '3,3'}
                strokeOpacity={jb.jamaNumber === 6 ? '0.8' : '0.5'}
              />
              {/* Jama Number marker at bottom */}
              <text
                x={jb.x + CHART_WIDTH / 20}
                y={MARGIN.top + CHART_HEIGHT + 18}
                fill="#94a3b8"
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                J{jb.jamaNumber}
              </text>
              {/* Time tick at bottom */}
              <text
                x={jb.x}
                y={MARGIN.top + CHART_HEIGHT + 35}
                fill="#64748b"
                fontSize="9"
                fontWeight="500"
                textAnchor="middle"
              >
                {jb.startTime}
              </text>
            </g>
          ))}

          {/* End boundary time label */}
          <text
            x={MARGIN.left + CHART_WIDTH}
            y={MARGIN.top + CHART_HEIGHT + 35}
            fill="#64748b"
            fontSize="9"
            fontWeight="500"
            textAnchor="middle"
          >
            {nextSunriseTime}
          </text>

          {/* Horizontal Grid lines and Y-axis labels */}
          {yTicks.map((tick, idx) => (
            <g key={tick.id}>
              {/* Horizontal line */}
              <line
                x1={MARGIN.left}
                y1={tick.y}
                x2={MARGIN.left + CHART_WIDTH}
                y2={tick.y}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="4,4"
                strokeOpacity="0.4"
              />

              {/* Y-Axis Label Box on Left */}
              <g transform={`translate(${MARGIN.left - 12}, ${tick.y + 4})`}>
                <text
                  x="0"
                  y="0"
                  textAnchor="end"
                  fill={tick.color}
                  fontSize={method === 'work' ? '12' : '11'}
                  fontWeight="bold"
                >
                  {language === 'ta' ? tick.labelTa : tick.labelEn}
                </text>
              </g>
            </g>
          ))}

          {/* Real-time Current Live Moment Line ("NOW") */}
          {currentLiveMinuteInCycle >= 0 && currentLiveMinuteInCycle <= totalDuration && (
            <g>
              <line
                x1={MARGIN.left + (currentLiveMinuteInCycle / totalDuration) * CHART_WIDTH}
                y1={MARGIN.top - 8}
                x2={MARGIN.left + (currentLiveMinuteInCycle / totalDuration) * CHART_WIDTH}
                y2={MARGIN.top + CHART_HEIGHT + 8}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="5,3"
                className="animate-pulse"
              />
              <g
                transform={`translate(${
                  MARGIN.left + (currentLiveMinuteInCycle / totalDuration) * CHART_WIDTH
                }, ${MARGIN.top - 12})`}
              >
                <circle cx="0" cy="0" r="4" fill="#38bdf8" />
                <rect
                  x="-20"
                  y="-18"
                  width="40"
                  height="14"
                  rx="4"
                  fill="#0369a1"
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
                <text
                  x="0"
                  y="-8"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  NOW
                </text>
              </g>
            </g>
          )}

          {/* Render Curve Lines and Filled Areas for each compared bird */}
          {comparedBirds.map((bId) => {
            const ds = birdDatasets[bId];
            if (!ds || ds.svgPoints.length === 0) return null;

            const birdInfo = BIRDS[bId];
            const isSingle = comparedBirds.length === 1;

            const pathD =
              curveType === 'smooth'
                ? generateCurvedPath(ds.svgPoints)
                : generateStraightPath(ds.svgPoints);

            // Area path for gradient fill under the curve
            const firstPt = ds.svgPoints[0];
            const lastPt = ds.svgPoints[ds.svgPoints.length - 1];
            const areaD = `${pathD} L ${lastPt.x} ${MARGIN.top + CHART_HEIGHT} L ${firstPt.x} ${
              MARGIN.top + CHART_HEIGHT
            } Z`;

            return (
              <g key={`bird-curve-${bId}`}>
                {/* Area under curve */}
                <path d={areaD} fill={`url(#chart-gradient-${bId})`} opacity={isSingle ? 0.9 : 0.45} />

                {/* Main Curved Line Stroke */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={birdInfo.color}
                  strokeWidth={isSingle ? '3.5' : '2.8'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />

                {/* Point markers */}
                {ds.svgPoints.map((pt, pIdx) => {
                  const isHovered =
                    hoveredPointInfo &&
                    hoveredPointInfo.points[bId] &&
                    hoveredPointInfo.points[bId].x === pt.point.x;

                  return (
                    <g key={`pt-${bId}-${pIdx}`}>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : resolution === 'main' ? 4.5 : 2.8}
                        fill={birdInfo.color}
                        stroke="#0f172a"
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        className="transition-all cursor-pointer"
                      />
                      {isHovered && (
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={10}
                          fill="none"
                          stroke={birdInfo.color}
                          strokeWidth="1.5"
                          opacity="0.8"
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Hover Scrubbing Vertical Guide Line */}
          {hoveredMinute !== null && (
            <g>
              <line
                x1={MARGIN.left + (hoveredMinute / totalDuration) * CHART_WIDTH}
                y1={MARGIN.top}
                x2={MARGIN.left + (hoveredMinute / totalDuration) * CHART_WIDTH}
                y2={MARGIN.top + CHART_HEIGHT}
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeDasharray="2,2"
                opacity="0.8"
              />
            </g>
          )}
        </svg>

        {/* 5. Rich Floating / Sticky Tooltip */}
        {hoveredPointInfo && (
          <div className="absolute top-2 right-2 max-w-xs bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-xl p-3 shadow-2xl space-y-2 pointer-events-none animate-fadeIn text-xs z-30">
            {/* Header: Time and Period */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
              <span className="font-extrabold text-white font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {Object.values(hoveredPointInfo.points)[0]?.timeRange || ''}
                </span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                Jama {Object.values(hoveredPointInfo.points)[0]?.jamaNumber}
                {Object.values(hoveredPointInfo.points)[0]?.subIndex
                  ? ` · Sub ${Object.values(hoveredPointInfo.points)[0]?.subIndex}`
                  : ''}
              </span>
            </div>

            {/* List of values for each compared bird */}
            <div className="space-y-1.5">
              {comparedBirds.map((bId) => {
                const pt = hoveredPointInfo.points[bId];
                if (!pt) return null;
                const birdInfo = BIRDS[bId];
                const actDetails = ACTIVITY_DETAILS[pt.activity];

                return (
                  <div
                    key={`tip-${bId}`}
                    className="p-1.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: birdInfo.color }}
                      />
                      <span className="font-bold text-slate-200 text-[11px]">
                        {getBirdName(bId).split(' ')[0]}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Activity Badge */}
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                        style={{
                          backgroundColor:
                            pt.activity === 'Rule'
                              ? 'rgba(16, 185, 129, 0.2)'
                              : pt.activity === 'Eat'
                              ? 'rgba(20, 184, 166, 0.2)'
                              : pt.activity === 'Walk'
                              ? 'rgba(245, 158, 11, 0.2)'
                              : pt.activity === 'Sleep'
                              ? 'rgba(129, 140, 248, 0.2)'
                              : 'rgba(244, 63, 94, 0.2)',
                          color:
                            pt.activity === 'Rule'
                              ? '#34d399'
                              : pt.activity === 'Eat'
                              ? '#2dd4bf'
                              : pt.activity === 'Walk'
                              ? '#fbbf24'
                              : pt.activity === 'Sleep'
                              ? '#a5b4fc'
                              : '#fb7185',
                        }}
                      >
                        {getActivityName(pt.activity)}
                      </span>

                      {/* Star Rating Badge */}
                      <span className="font-mono font-bold text-amber-300 text-[11px] flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{pt.star}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 6. Chart Legend & Informative Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 text-[11px] text-slate-400 border-t border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 font-semibold">{t('clickToPinNotice')}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {comparedBirds.map((bId) => {
            const b = BIRDS[bId];
            return (
              <div key={`legend-${bId}`} className="flex items-center gap-1.5 font-bold">
                <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: b.color }} />
                <span style={{ color: b.color }}>{getBirdName(bId)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
