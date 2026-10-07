with open('src/components/SettingsModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update lucide-react imports if Moon/Sun not present
if 'Moon,' not in text:
    text = text.replace("import {\n  Settings,", "import {\n  Settings,\n  Moon,\n  Sun,")

if 'darkModeService' not in text:
    text = text.replace("import { soundService } from '../services/soundService';", "import { soundService } from '../services/soundService';\nimport { darkModeService } from '../services/darkModeService';")

# 2. Add props to SettingsModalProps
target_props = "  onLanguageChange: (lang: 'en' | 'ur') => void;\n"
replacement_props = """  onLanguageChange: (lang: 'en' | 'ur') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
"""
if target_props in text and 'isDarkMode?: boolean;' not in text:
    text = text.replace(target_props, replacement_props, 1)

# 3. Add destructured props
target_destruct = "  onLanguageChange,\n"
replacement_destruct = """  onLanguageChange,
  isDarkMode,
  onToggleDarkMode,
"""
if target_destruct in text and 'onToggleDarkMode,' not in text:
    text = text.replace(target_destruct, replacement_destruct, 1)

# 4. Add internalDark state and handleToggleDark
target_body_start = "  const [isMuted, setIsMuted] = useState(soundService.getMuted());\n"
replacement_body_start = """  const [isMuted, setIsMuted] = useState(soundService.getMuted());
  const [internalDark, setInternalDark] = useState(() => darkModeService.getIsDark());
  const effectiveDark = isDarkMode !== undefined ? isDarkMode : internalDark;

  const handleToggleDark = () => {
    soundService.playClick();
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      const next = darkModeService.toggle();
      setInternalDark(next);
    }
  };
"""
if target_body_start in text and 'effectiveDark' not in text:
    text = text.replace(target_body_start, replacement_body_start, 1)

# 5. Add Dark Mode classes to main modal container
modal_container_target = 'className="bg-white rounded-3xl w-full max-w-md p-5 shadow-2xl border-4 border-slate-300 relative space-y-4 my-auto max-h-[90vh] flex flex-col"'
modal_container_replace = 'className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-5 shadow-2xl border-4 border-slate-300 dark:border-slate-800 relative space-y-4 my-auto max-h-[90vh] flex flex-col text-slate-900 dark:text-slate-100"'
if modal_container_target in text:
    text = text.replace(modal_container_target, modal_container_replace, 1)

# 6. Add Dark Mode switch in Category 4 right below Theme Selector Trigger
theme_trigger_target = """              {/* Theme Selector Trigger */}
              <button
                onClick={() => {
                  soundService.playClick();
                  onOpenThemeSelector();
                }}
                className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-extrabold rounded-xl tap-bounce flex items-center justify-between px-3 text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-pink-500" />
                  <span>{seniorMode ? '13 خوبصورت تھیمز منتخب کریں' : 'Choose from 13 Themes'}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>"""

dark_mode_switch_jsx = """              {/* Theme Selector Trigger */}
              <button
                onClick={() => {
                  soundService.playClick();
                  onOpenThemeSelector();
                }}
                className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-extrabold rounded-xl tap-bounce flex items-center justify-between px-3 text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-pink-500" />
                  <span>{seniorMode ? '13 خوبصورت تھیمز منتخب کریں' : 'Choose from 13 Themes'}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Global Dark Mode Switch */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      effectiveDark
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {effectiveDark ? (
                      <Moon className="w-4 h-4 fill-amber-300" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <span>{seniorMode ? 'ڈارک موڈ (رات کا موڈ)' : 'Dark Mode (Night Theme)'}</span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                          effectiveDark
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {effectiveDark ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {seniorMode
                        ? 'آنکھوں کے لیے پرسکون اور OLED بیٹری سیور'
                        : 'Gentle on eyes & battery saver for AMOLED screens'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleDark}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors tap-bounce ${
                    effectiveDark ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle Dark Mode"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform flex items-center justify-center text-[10px] ${
                      effectiveDark ? 'translate-x-5 text-indigo-700' : 'translate-x-0 text-slate-400'
                    }`}
                  >
                    {effectiveDark ? '🌙' : '☀️'}
                  </div>
                </button>
              </div>"""

if theme_trigger_target in text and 'Global Dark Mode Switch' not in text:
    text = text.replace(theme_trigger_target, dark_mode_switch_jsx, 1)

with open('src/components/SettingsModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: SettingsModal updated with Dark Mode toggle and styling!")
