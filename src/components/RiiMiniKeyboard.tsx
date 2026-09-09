import React, { useState } from 'react';
import { MousePointer, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CornerDownLeft, Delete } from 'lucide-react';

interface RiiMiniKeyboardProps {
  onKeyPress: (key: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  onArrow: (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  onEscape?: () => void;
}

export const RiiMiniKeyboard: React.FC<RiiMiniKeyboardProps> = ({
  onKeyPress,
  onEnter,
  onBackspace,
  onArrow,
  onEscape,
}) => {
  const [touchPos, setTouchPos] = useState({ x: 50, y: 50 });
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const triggerKey = (label: string, action: () => void) => {
    setActiveKey(label);
    action();
    setTimeout(() => setActiveKey(null), 120);
  };

  const handleTouchPad = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setTouchPos({ x, y });
  };

  return (
    <div className="bg-gradient-to-b from-stone-900 via-neutral-900 to-black p-4 rounded-2xl border-2 border-stone-700/80 shadow-2xl max-w-xl mx-auto select-none">
      
      {/* Top Branding & Status LEDs */}
      <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-stone-800">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-black tracking-widest text-stone-200 uppercase font-mono">
            Rii <span className="text-emerald-400">mini X1</span>
          </span>
          <span className="text-[10px] text-stone-300 font-mono bg-stone-800 px-1.5 py-0.5 rounded border border-stone-700">
            2.4GHz RF USB
          </span>
        </div>
        
        {/* Status indicator LEDs */}
        <div className="flex items-center space-x-3 text-[10px] font-mono text-stone-300">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            <span>LINK</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span>BAT</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${activeKey ? 'bg-cyan-400 shadow-[0_0_6px_#06b6d4]' : 'bg-stone-600'}`} />
            <span>DATA</span>
          </div>
        </div>
      </div>

      {/* Main Layout: Keyboard on Left, Trackpad + D-Pad on Right */}
      <div className="grid grid-cols-12 gap-3">
        
        {/* Left Side: QWERTY & Function Keys (8 cols) */}
        <div className="col-span-8 space-y-1.5">
          
          {/* Row 1: Function / Number Row */}
          <div className="grid grid-cols-10 gap-1">
            {['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
              <button
                key={k}
                onClick={() => {
                  if (k === 'Esc') onEscape ? onEscape() : onBackspace();
                  else triggerKey(k, () => onKeyPress(k));
                }}
                className={`h-7 rounded text-[11px] font-mono font-bold transition flex items-center justify-center border shadow-sm ${
                  activeKey === k
                    ? 'bg-emerald-500 text-stone-950 border-emerald-400 translate-y-0.5'
                    : 'bg-stone-800/90 hover:bg-stone-700 text-stone-200 border-stone-700/80 active:translate-y-0.5'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Row 2: Q W E R T Y U I O P */}
          <div className="grid grid-cols-10 gap-1">
            {['0', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O'].map((k) => (
              <button
                key={k}
                onClick={() => triggerKey(k, () => onKeyPress(k.toLowerCase()))}
                className={`h-7 rounded text-[11px] font-mono font-bold transition flex items-center justify-center border shadow-sm ${
                  activeKey === k
                    ? 'bg-emerald-500 text-stone-950 border-emerald-400 translate-y-0.5'
                    : 'bg-stone-800/90 hover:bg-stone-700 text-stone-200 border-stone-700/80 active:translate-y-0.5'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Row 3: A S D F G H J K L Backspace */}
          <div className="grid grid-cols-10 gap-1">
            {['P', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map((k) => (
              <button
                key={k}
                onClick={() => triggerKey(k, () => onKeyPress(k.toLowerCase()))}
                className={`h-7 rounded text-[11px] font-mono font-bold transition flex items-center justify-center border shadow-sm ${
                  activeKey === k
                    ? 'bg-emerald-500 text-stone-950 border-emerald-400 translate-y-0.5'
                    : 'bg-stone-800/90 hover:bg-stone-700 text-stone-200 border-stone-700/80 active:translate-y-0.5'
                }`}
              >
                {k}
              </button>
            ))}
          </div>

          {/* Row 4: Z X C V B N M , . Del */}
          <div className="grid grid-cols-10 gap-1">
            {['Z', 'X', 'C', 'V', 'B', 'N', 'M', '?', '.'].map((k) => (
              <button
                key={k}
                onClick={() => triggerKey(k, () => onKeyPress(k.toLowerCase()))}
                className={`h-7 rounded text-[11px] font-mono font-bold transition flex items-center justify-center border shadow-sm ${
                  activeKey === k
                    ? 'bg-emerald-500 text-stone-950 border-emerald-400 translate-y-0.5'
                    : 'bg-stone-800/90 hover:bg-stone-700 text-stone-200 border-stone-700/80 active:translate-y-0.5'
                }`}
              >
                {k}
              </button>
            ))}
            <button
              onClick={() => triggerKey('DEL', onBackspace)}
              className={`h-7 rounded text-[10px] font-mono font-bold transition flex items-center justify-center border shadow-sm text-red-300 border-red-900/60 bg-stone-800 hover:bg-stone-700 ${
                activeKey === 'DEL' ? 'bg-red-500 text-stone-950 translate-y-0.5' : ''
              }`}
              title="Backspace"
            >
              <Delete className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Row 5: Spacebar & Enter */}
          <div className="grid grid-cols-10 gap-1 pt-0.5">
            <button
              onClick={() => triggerKey('/', () => onKeyPress('/'))}
              className="col-span-2 h-7 rounded text-[11px] font-mono font-bold bg-stone-800 hover:bg-stone-700 text-amber-300 border border-stone-700 flex items-center justify-center"
              title="Slash command (/)"
            >
              / cmd
            </button>

            <button
              onClick={() => triggerKey('SPACE', () => onKeyPress(' '))}
              className={`col-span-5 h-7 rounded text-xs font-mono font-bold transition flex items-center justify-center border shadow-sm ${
                activeKey === 'SPACE'
                  ? 'bg-emerald-500 text-stone-950 border-emerald-400 translate-y-0.5'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border-stone-700'
              }`}
            >
              SPACE
            </button>

            <button
              onClick={() => triggerKey('ENTER', onEnter)}
              className={`col-span-3 h-7 rounded text-xs font-mono font-bold transition flex items-center justify-center gap-1 border shadow-sm ${
                activeKey === 'ENTER'
                  ? 'bg-emerald-400 text-stone-950 border-emerald-300 translate-y-0.5'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-stone-100 border-emerald-600'
              }`}
              title="Submit / Enter"
            >
              <span>ENTER</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          </div>

        </div>

        {/* Right Side: Trackpad & Navigation D-Pad (4 cols) */}
        <div className="col-span-4 flex flex-col justify-between space-y-2">
          
          {/* Touchpad Area */}
          <div
            onMouseMove={handleTouchPad}
            className="h-20 bg-stone-950/90 rounded-lg border border-stone-700 p-1 relative cursor-crosshair overflow-hidden group shadow-inner"
            title="Capacitive Touchpad Area"
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
              <MousePointer className="w-6 h-6 text-stone-400" />
            </div>
            {/* Touch coordinate dot */}
            <div
              className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] transition-all duration-75 pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${touchPos.x}%`, top: `${touchPos.y}%` }}
            />
            <div className="absolute bottom-1 right-1 text-[8px] font-mono text-stone-500">
              TOUCHPAD
            </div>
          </div>

          {/* Mouse Left / Right Buttons */}
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => triggerKey('L-CLICK', onEnter)}
              className="h-6 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded text-[9px] font-mono text-stone-300 font-bold active:translate-y-0.5"
            >
              LEFT
            </button>
            <button
              onClick={() => triggerKey('R-CLICK', () => onEscape && onEscape())}
              className="h-6 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded text-[9px] font-mono text-stone-300 font-bold active:translate-y-0.5"
            >
              RIGHT
            </button>
          </div>

          {/* Directional D-Pad Navigation */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <button
              onClick={() => triggerKey('UP', () => onArrow('UP'))}
              className="w-8 h-7 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded flex items-center justify-center text-stone-200 active:translate-y-0.5 shadow-sm"
              title="Up Arrow"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => triggerKey('LEFT', () => onArrow('LEFT'))}
                className="w-8 h-7 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded flex items-center justify-center text-stone-200 active:translate-y-0.5 shadow-sm"
                title="Left Arrow"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <div className="w-8 h-7 bg-stone-950 border border-stone-800 rounded flex items-center justify-center text-[9px] font-mono text-stone-400 font-bold">
                OK
              </div>
              <button
                onClick={() => triggerKey('RIGHT', () => onArrow('RIGHT'))}
                className="w-8 h-7 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded flex items-center justify-center text-stone-200 active:translate-y-0.5 shadow-sm"
                title="Right Arrow"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => triggerKey('DOWN', () => onArrow('DOWN'))}
              className="w-8 h-7 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded flex items-center justify-center text-stone-200 active:translate-y-0.5 shadow-sm"
              title="Down Arrow"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      <div className="mt-3 text-center text-[10px] text-stone-300 font-mono">
        💡 <strong className="text-stone-200">Interactive:</strong> Click keys above or type on your computer keyboard directly into the screen!
      </div>

    </div>
  );
};
