import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Lock, Volume2, Sparkles, RefreshCw, Palette } from 'lucide-react';

interface FunZoneProps {
  onClose: () => void;
  seniorMode: boolean;
}

export const FunZone: React.FC<FunZoneProps> = ({ onClose, seniorMode }) => {
  const [activeTab, setActiveTab] = useState<'home' | 'alphabet' | 'numbers' | 'urdu' | 'drawing' | 'animals'>('home');
  const [guardianLocked, setGuardianLocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [showPinDialog, setShowPinDialog] = useState(false);

  // Drawing canvas state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedColor, setSelectedColor] = useState('#ec4899');
  const [isDrawing, setIsDrawing] = useState(false);

  const ALPHABET = [
    { letter: 'A', word: 'Apple', emoji: '🍎', sound: 'ay-pul' },
    { letter: 'B', word: 'Butterfly', emoji: '🦋', sound: 'buh-ter-fly' },
    { letter: 'C', word: 'Cat', emoji: '🐱', sound: 'kat' },
    { letter: 'D', word: 'Duck', emoji: '🦆', sound: 'duk' },
    { letter: 'E', word: 'Elephant', emoji: '🐘', sound: 'el-uh-funt' },
    { letter: 'F', word: 'Flower', emoji: '🌸', sound: 'flow-er' },
  ];

  const URDU_LETTERS = [
    { letter: 'ا', word: 'انار (Pomegranate)', emoji: '🍎' },
    { letter: 'ب', word: 'بلی (Kitten)', emoji: '🐱' },
    { letter: 'پ', word: 'پتنگ (Kite)', emoji: '🪁' },
    { letter: 'ت', word: 'تتلی (Butterfly)', emoji: '🦋' },
    { letter: 'ٹ', word: 'ٹماٹر (Tomato)', emoji: '🍅' },
    { letter: 'ث', word: 'ثمر (Fruit)', emoji: '🍇' },
  ];

  const NUMBERS = [
    { num: '1', name: 'One', countEmoji: '⭐' },
    { num: '2', name: 'Two', countEmoji: '⭐⭐' },
    { num: '3', name: 'Three', countEmoji: '⭐⭐⭐' },
    { num: '4', name: 'Four', countEmoji: '⭐⭐⭐⭐' },
    { num: '5', name: 'Five', countEmoji: '⭐⭐⭐⭐⭐' },
  ];

  const ANIMAL_SOUNDS = [
    { name: 'Happy Cow', sound: 'Mooo! 🐄', emoji: '🐮' },
    { name: 'Playful Puppy', sound: 'Woof Woof! 🐶', emoji: '🐶' },
    { name: 'Cute Kitten', sound: 'Meow Meow! 🐱', emoji: '🐱' },
    { name: 'Little Bird', sound: 'Chirp Chirp! 🐥', emoji: '🐥' },
    { name: 'Friendly Sheep', sound: 'Baaa Baaa! 🐑', emoji: '🐑' },
    { name: 'Gentle Lion', sound: 'Roar! 🦁', emoji: '🦁' },
  ];

  const [activeSpeech, setActiveSpeech] = useState<string | null>(null);

  const speakWord = (text: string) => {
    setActiveSpeech(text);
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.beginPath();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing && e.type !== 'mousedown' && e.type !== 'touchstart') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.strokeStyle = selectedColor;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (activeTab === 'drawing' && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = canvas.parentElement?.clientWidth || 320;
      canvas.height = 340;
    }
  }, [activeTab]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border-4 border-amber-300 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-amber-400 via-pink-400 to-rose-400 p-4 flex items-center justify-between text-white shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-3xl animate-bounce">🎈</span>
            <div>
              <h2 className="font-black text-xl leading-tight">
                {seniorMode ? 'فن زون (Fun Zone)' : 'Fun Zone'}
              </h2>
              <p className="text-xs text-yellow-950 font-bold opacity-90">
                {seniorMode ? 'تخلیقی کھیل اور آسان سیکھنا' : 'Creative Games & Relaxing Learning'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center text-yellow-950 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Safety Notice Bar */}
        <div className="bg-amber-50 px-4 py-2 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900">
          <span className="flex items-center gap-1 font-medium">
            <Lock className="w-3 h-3 text-amber-700" /> Safe mode: zero outbound ads & secure learning
          </span>
          <button
            onClick={() => setShowPinDialog(true)}
            className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950"
          >
            Passcode Protection
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-1.5 p-2 bg-yellow-100/60 overflow-x-auto no-scrollbar">
          {[
            { id: 'home', label: '🏠 Safe Hub' },
            { id: 'alphabet', label: '🔤 ABC Phonics' },
            { id: 'urdu', label: '📚 اردو حروف' },
            { id: 'numbers', label: '🔢 1 2 3' },
            { id: 'animals', label: '🐶 Animal Sounds' },
            { id: 'drawing', label: '🎨 Magic Paint' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all tap-bounce ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white shadow-md scale-105'
                  : 'bg-white text-gray-700 hover:bg-amber-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-yellow-50/50 to-white">
          {/* TAB: HOME */}
          {activeTab === 'home' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-pink-200 via-purple-200 to-sky-200 rounded-3xl p-4 text-center border-2 border-pink-300 shadow-inner">
                <span className="text-5xl block animate-float">🎉🌈✨</span>
                <h3 className="font-black text-xl text-purple-900 mt-2">Welcome to Fun Zone!</h3>
                <p className="text-xs text-purple-800 font-medium mt-1">
                  Explore phonics, paint vibrant digital artwork, and listen to cheerful animal friends!
                </p>
              </div>

              {/* Quick Action Cards */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setActiveTab('alphabet')}
                  className="p-4 bg-gradient-to-br from-pink-400 to-rose-400 text-white rounded-3xl shadow-md tap-bounce text-center flex flex-col items-center justify-center gap-1 hover:brightness-105"
                >
                  <span className="text-4xl">🔤</span>
                  <span className="font-black text-base mt-1">ABC Cards</span>
                  <span className="text-[11px] opacity-90">Sound & Phonics</span>
                </button>

                <button
                  onClick={() => setActiveTab('urdu')}
                  className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-3xl shadow-md tap-bounce text-center flex flex-col items-center justify-center gap-1 hover:brightness-105"
                >
                  <span className="text-4xl">📚</span>
                  <span className="font-black text-base mt-1">Urdu Haroof</span>
                  <span className="text-[11px] opacity-90">اردو حروف سیکھیں</span>
                </button>

                <button
                  onClick={() => setActiveTab('animals')}
                  className="p-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-3xl shadow-md tap-bounce text-center flex flex-col items-center justify-center gap-1 hover:brightness-105"
                >
                  <span className="text-4xl">🐶</span>
                  <span className="font-black text-base mt-1">Animal Sounds</span>
                  <span className="text-[11px] opacity-90">Tap to hear audio</span>
                </button>

                <button
                  onClick={() => setActiveTab('drawing')}
                  className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl shadow-md tap-bounce text-center flex flex-col items-center justify-center gap-1 hover:brightness-105"
                >
                  <span className="text-4xl">🎨</span>
                  <span className="font-black text-base mt-1">Magic Paint</span>
                  <span className="text-[11px] opacity-90">Draw freely!</span>
                </button>
              </div>

              {/* Safety notice */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-900">
                <span className="text-2xl">🔒</span>
                <div>
                  <p className="font-bold">Protected Exploration Zone</p>
                  <p className="text-[11px] text-blue-700">
                    No outbound ads, no stranger interactions, and safe learning environment.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ALPHABET */}
          {activeTab === 'alphabet' && (
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="font-extrabold text-gray-800 text-base">Tap a letter to hear its sound!</h3>
                {activeSpeech && (
                  <p className="text-xs text-pink-600 font-bold animate-pulse">Playing: "{activeSpeech}"</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ALPHABET.map((item) => (
                  <button
                    key={item.letter}
                    onClick={() => speakWord(`${item.letter} is for ${item.word}`)}
                    className="p-4 bg-white rounded-3xl border-2 border-pink-200 shadow-sm hover:border-pink-400 tap-bounce flex items-center justify-between text-left"
                  >
                    <div>
                      <span className="text-3xl font-black text-pink-500">{item.letter}</span>
                      <p className="text-xs font-bold text-gray-700">{item.word}</p>
                    </div>
                    <span className="text-4xl">{item.emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: URDU */}
          {activeTab === 'urdu' && (
            <div className="space-y-3 text-right" dir="rtl">
              <div className="text-center" dir="ltr">
                <h3 className="font-extrabold text-gray-800 text-base">حرف پر کلک کریں</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {URDU_LETTERS.map((item) => (
                  <button
                    key={item.letter}
                    onClick={() => speakWord(item.word)}
                    className="p-4 bg-white rounded-3xl border-2 border-emerald-200 shadow-sm hover:border-emerald-400 tap-bounce flex items-center justify-between text-right"
                  >
                    <div>
                      <span className="text-3xl font-black text-emerald-600 font-serif">{item.letter}</span>
                      <p className="text-xs font-bold text-gray-700">{item.word}</p>
                    </div>
                    <span className="text-4xl">{item.emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: NUMBERS */}
          {activeTab === 'numbers' && (
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="font-extrabold text-gray-800 text-base">Counting Stars! 1 to 5</h3>
              </div>
              <div className="space-y-2">
                {NUMBERS.map((n) => (
                  <button
                    key={n.num}
                    onClick={() => speakWord(`${n.num}, ${n.name}`)}
                    className="w-full p-3 bg-white rounded-2xl border-2 border-amber-200 shadow-sm flex items-center justify-between tap-bounce"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-amber-400 text-white font-black flex items-center justify-center text-lg">
                        {n.num}
                      </span>
                      <span className="font-bold text-gray-800 text-sm">{n.name}</span>
                    </div>
                    <span className="tracking-widest text-lg">{n.countEmoji}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: ANIMALS */}
          {activeTab === 'animals' && (
            <div className="space-y-3">
              <div className="text-center">
                <h3 className="font-extrabold text-gray-800 text-base">Tap an animal to hear its sound!</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {ANIMAL_SOUNDS.map((animal) => (
                  <button
                    key={animal.name}
                    onClick={() => speakWord(animal.sound)}
                    className="p-4 bg-white rounded-3xl border-2 border-orange-200 shadow-sm hover:border-orange-400 tap-bounce flex flex-col items-center justify-center gap-1.5"
                  >
                    <span className="text-5xl">{animal.emoji}</span>
                    <span className="font-bold text-gray-800 text-xs">{animal.name}</span>
                    <span className="text-[10px] text-orange-600 font-extrabold bg-orange-50 px-2 py-0.5 rounded-full">
                      {animal.sound}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: DRAWING */}
          {activeTab === 'drawing' && (
            <div className="space-y-3 flex flex-col items-center">
              <div className="w-full flex items-center justify-between px-1">
                <span className="text-xs font-bold text-gray-700">Select Color:</span>
                <div className="flex gap-2">
                  {['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#1e293b'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-6 h-6 rounded-full border-2 ${
                        selectedColor === color ? 'border-black scale-125' : 'border-white'
                      } shadow-sm`}
                    />
                  ))}
                </div>
                <button
                  onClick={clearCanvas}
                  className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
              </div>

              {/* Canvas Board */}
              <div className="w-full border-4 border-dashed border-purple-200 rounded-3xl overflow-hidden bg-white shadow-inner touch-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseUp={stopDrawing}
                  onMouseMove={draw}
                  onTouchStart={startDrawing}
                  onTouchEnd={stopDrawing}
                  onTouchMove={draw}
                  className="cursor-crosshair w-full block"
                />
              </div>
            </div>
          )}
        </div>

        {/* PIN Security Dialog */}
        {showPinDialog && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-5 max-w-xs w-full text-center space-y-3 shadow-2xl border-4 border-amber-300">
              <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto">
                🔒
              </div>
              <h3 className="font-black text-gray-800 text-base">Passcode Check</h3>
              <p className="text-xs text-gray-500">
                To manage settings, solve: <span className="font-bold text-gray-800">3 + 4 = ?</span>
              </p>
              <input
                type="number"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Answer"
                className="w-full text-center py-2 px-3 border border-gray-300 rounded-xl text-lg font-black"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (pinInput === '7') {
                      setShowPinDialog(false);
                      setPinInput('');
                      alert('Passcode verified.');
                    } else {
                      alert('Incorrect answer.');
                    }
                  }}
                  className="flex-1 py-2 bg-amber-500 text-white font-bold rounded-xl text-xs"
                >
                  Verify
                </button>
                <button
                  onClick={() => {
                    setShowPinDialog(false);
                    setPinInput('');
                  }}
                  className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Re-export alias for backward compatibility
export const KidsZone = FunZone;
