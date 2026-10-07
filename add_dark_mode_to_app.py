with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Import darkModeService
if 'darkModeService' not in text:
    text = "import { darkModeService } from './services/darkModeService';\n" + text

# 2. Add isDarkMode state right after currentThemeKey state
theme_state_target = "  const [currentThemeKey, setCurrentThemeKey] = useState<ThemeKey>('spring_flower');\n  const theme = THEMES.find((t) => t.id === currentThemeKey) || THEMES[0];"
dark_state_replacement = """  const [currentThemeKey, setCurrentThemeKey] = useState<ThemeKey>('spring_flower');
  const theme = THEMES.find((t) => t.id === currentThemeKey) || THEMES[0];

  // Global Dark Mode state with live localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState(() => darkModeService.getIsDark());

  useEffect(() => {
    const unsub = darkModeService.subscribe((dark) => {
      setIsDarkMode(dark);
    });
    return unsub;
  }, []);

  const handleToggleDarkMode = () => {
    const next = darkModeService.toggle();
    setIsDarkMode(next);
  };"""

if theme_state_target in text and 'handleToggleDarkMode' not in text:
    text = text.replace(theme_state_target, dark_state_replacement, 1)

# 3. Update root container div classes
old_root = "className={`min-h-screen bg-gradient-to-br ${theme.gradient} transition-colors duration-500 pb-8 text-slate-800 flex flex-col items-center justify-start`}"
new_root = "className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : `bg-gradient-to-br ${theme.gradient} text-slate-800`} transition-colors duration-500 pb-8 flex flex-col items-center justify-start`}"
if old_root in text:
    text = text.replace(old_root, new_root, 1)

# 4. Update inner shell background
old_shell = "className={`w-full max-w-md min-h-screen flex flex-col shadow-2xl relative bg-white/40 backdrop-blur-xs transition-all duration-300 ${"
new_shell = "className={`w-full max-w-md min-h-screen flex flex-col shadow-2xl relative ${isDarkMode ? 'bg-slate-900/90 text-slate-100' : 'bg-white/40 text-slate-800'} backdrop-blur-xs transition-all duration-300 ${"
if old_shell in text:
    text = text.replace(old_shell, new_shell, 1)

# 5. Pass props to SettingsModal
old_settings = """          <SettingsModal
            onClose={() => setActiveModal(null)}
            seniorMode={seniorMode}
            onToggleSeniorMode={() => setSeniorMode(!seniorMode)}
            language={language}
            onLanguageChange={handleLanguageChange}"""

new_settings = """          <SettingsModal
            onClose={() => setActiveModal(null)}
            seniorMode={seniorMode}
            onToggleSeniorMode={() => setSeniorMode(!seniorMode)}
            language={language}
            onLanguageChange={handleLanguageChange}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}"""

if old_settings in text:
    text = text.replace(old_settings, new_settings, 1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: App.tsx updated with Dark Mode state and root class binding!")
