import React from 'react';
import { BirdId, DayCalculationMeta, PakshaType } from '../types';
import { BIRDS } from '../data/panchaPakshiData';
import { getBirdFriends, getBirdEnemies } from '../data/birdRelationships';
import { motion } from 'motion/react';
import { Sun, Moon, Skull, Feather, Heart, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface BirdSelectorProps {
  selectedBird: BirdId;
  onSelectBird: (birdId: BirdId) => void;
  dayMeta?: DayCalculationMeta;
  paksha?: PakshaType;
}

export const BirdSelector: React.FC<BirdSelectorProps> = ({ selectedBird, onSelectBird, dayMeta, paksha }) => {
  const { language, t, getBirdName, getPakshaName, getElementName } = useLanguage();
  const birdsList = Object.values(BIRDS);
  const activePaksha = paksha || dayMeta?.paksha || 'valarpirai';

  // Dynamic role determination based on active day meta if present
  const getDayRelation = (birdId: BirdId) => {
    if (dayMeta) {
      if (dayMeta.dayRulingBird === birdId) return 'Ruling Bird';
      if (dayMeta.dayDyingBird === birdId) return 'Dying Bird';
      return null;
    }
    return BIRDS[birdId].dayRelation;
  };

  const getNightRelation = (birdId: BirdId) => {
    if (dayMeta) {
      if (dayMeta.nightRulingBird === birdId) return 'Ruling Bird';
      if (dayMeta.nightDyingBird === birdId) return 'Dying Bird';
      return null;
    }
    return BIRDS[birdId].nightRelation;
  };

  return (
    <section aria-label="Bird Selection" className="w-full">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-semibold tracking-wider text-slate-400 uppercase flex items-center gap-2">
            <Feather className="w-4 h-4 text-amber-400" />
            <span>{t('selectYourBird')}</span>
          </h2>
          <p className="text-xs text-slate-400">
            {t('selectYourBirdDesc')}
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 font-medium">
          {dayMeta
            ? (language === 'ta' ? dayMeta.tamilName : dayMeta.name)
            : getPakshaName(activePaksha)}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {birdsList.map((bird) => {
          const isSelected = selectedBird === bird.id;
          const dayRel = getDayRelation(bird.id);
          const nightRel = getNightRelation(bird.id);
          const bName = getBirdName(bird.id);
          const friends = getBirdFriends(bird.id, activePaksha);
          const enemies = getBirdEnemies(bird.id, activePaksha);

          return (
            <motion.button
              key={bird.id}
              onClick={() => onSelectBird(bird.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              id={`bird-select-btn-${bird.id}`}
              className={`relative flex flex-col p-3 sm:p-3.5 rounded-xl text-left transition-all duration-200 min-h-[110px] cursor-pointer touch-manipulation border ${
                isSelected
                  ? 'bg-slate-900/95 border-amber-400 ring-2 ring-amber-400/40 shadow-lg shadow-amber-950/40'
                  : 'bg-slate-900/50 hover:bg-slate-850 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              {/* Selected Badge */}
              {isSelected && (
                <span className="absolute top-2 right-2 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
              )}

              {/* Bird Icon & Pure Name (No mixing) */}
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 border"
                  style={{
                    backgroundColor: `${bird.color}18`,
                    borderColor: `${bird.color}50`,
                    color: bird.color,
                  }}
                >
                  {bName[0]}
                </div>
                <div className="min-w-0">
                  <h3 className={`font-bold text-sm sm:text-base truncate ${isSelected ? 'text-white font-extrabold' : 'text-slate-200'}`}>
                    {bName}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate leading-tight font-medium">
                    {getElementName(bird.id)}
                  </p>
                </div>
              </div>

              {/* Role Indicators */}
              <div className="mt-auto pt-2 border-t border-slate-800/80 space-y-1.5 text-[10px]">
                <div className="flex flex-wrap items-center gap-1.5">
                  {dayRel === 'Ruling Bird' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                      <Sun className="w-3 h-3 text-amber-400" /> {t('dayRulerShort')}
                    </span>
                  )}
                  {nightRel === 'Ruling Bird' && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-medium">
                      <Moon className="w-3 h-3 text-purple-400" /> {t('nightRulerShort')}
                    </span>
                  )}
                  {dayRel === 'Dying Bird' && nightRel === 'Dying Bird' ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                      <Skull className="w-3 h-3 text-rose-400" /> {t('dyingShort')}
                    </span>
                  ) : (
                    <>
                      {dayRel === 'Dying Bird' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                          <Skull className="w-3 h-3 text-rose-400" /> {t('dayDyingShort')}
                        </span>
                      )}
                      {nightRel === 'Dying Bird' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                          <Skull className="w-3 h-3 text-rose-400" /> {t('nightDyingShort')}
                        </span>
                      )}
                    </>
                  )}
                  {!dayRel && !nightRel && (
                    <span className="text-slate-400 font-normal">
                      {getElementName(bird.id)}
                    </span>
                  )}
                </div>

                {/* Friend & Enemy preview (Pure names) */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-1">
                  <span className="text-emerald-400 flex items-center gap-1" title={t('friendsCount')}>
                    <Heart className="w-2.5 h-2.5" />
                    <span>{friends.map((f) => getBirdName(f)).join(', ')}</span>
                  </span>
                  <span className="text-rose-400 flex items-center gap-1" title={t('enemiesCount')}>
                    <ShieldAlert className="w-2.5 h-2.5" />
                    <span>{enemies.map((e) => getBirdName(e)).join(', ')}</span>
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
