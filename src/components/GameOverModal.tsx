import React from 'react';
import { RotateCcw, Home, Award, Smartphone } from 'lucide-react';
import { GameStats } from '../game/gameEngine';

interface GameOverModalProps {
  stats: GameStats;
  highScore: number;
  isNewHighScore: boolean;
  onRestart: () => void;
  onHome: () => void;
  onOpenAPKModal: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  stats,
  highScore,
  isNewHighScore,
  onRestart,
  onHome,
  onOpenAPKModal,
}) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/75 select-none">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center">
        {/* Status Badge */}
        <div className="px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-400 font-mono-code text-xs tracking-widest uppercase mb-3">
          HULL BREACH DETECTED
        </div>

        <h2 className="text-3xl font-extrabold font-cyber text-white mb-2">
          EXPEDITION TERMINATED
        </h2>

        <p className="text-sm text-slate-400 mb-6">
          Your droid craft was destroyed in the deep subterranean labyrinth.
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 w-full mb-6">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
            <div className="text-[10px] font-mono-code text-slate-400">FINAL SCORE</div>
            <div className="text-xl font-bold font-cyber text-cyan-300 tabular-nums">
              {stats.score.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-left">
            <div className="text-[10px] font-mono-code text-slate-400">DEPTH REACHED</div>
            <div className="text-xl font-bold font-cyber text-amber-400 tabular-nums">
              {stats.depthMeters} M
            </div>
          </div>
        </div>

        {/* High Score Alert */}
        {isNewHighScore ? (
          <div className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs font-bold font-mono-code mb-6">
            <Award className="w-4 h-4 text-amber-400" />
            <span>NEW HIGH SCORE RECORD SET!</span>
          </div>
        ) : (
          <div className="text-xs font-mono-code text-slate-400 mb-6">
            BEST ALL-TIME DEPTH SCORE: <span className="text-slate-200 font-bold tabular-nums">{highScore.toLocaleString()}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onRestart}
            className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold tracking-wider transition shadow-lg shadow-cyan-950/60 border border-cyan-400/40 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>DEPLOY ANOTHER CRAFT</span>
          </button>

          <button
            onClick={onHome}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition border border-slate-700"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>RETURN TO TITLE</span>
          </button>

          <button
            onClick={onOpenAPKModal}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition border border-slate-700/80 mt-1"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>Install on Android (APK Hub)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
