with open('src/components/SettingsModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

old_haptic = """              {/* Haptic Feedback */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <span className="text-slate-700 flex items-center gap-1.5 text-xs font-bold">
                  <Vibrate className="w-3.5 h-3.5 text-slate-500" />
                  <span>{seniorMode ? 'ٹچ وائبریشن (Haptic)' : 'Touch Vibration (Haptic)'}</span>
                </span>
                <button
                  onClick={handleToggleHaptic}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${
                    hapticEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-xs transform transition-transform ${
                      hapticEnabled ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>"""

new_haptic = """              {/* Haptic Feedback (Vibration Effects) */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2 pt-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Vibrate className="w-4 h-4 text-emerald-600" />
                      <span>{seniorMode ? 'ٹچ وائبریشن اثرات (Haptic Feedback)' : 'Haptic Feedback (Vibration Effects)'}</span>
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {seniorMode
                        ? 'بٹن دبانے، کوئز کے جوابات اور انعامات پر فون وائبریشن آن یا آف رکھیں۔'
                        : 'Enable or disable subtle vibration effects during taps, rewards, scratch cards & quiz interactions.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleHaptic}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hapticEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        hapticEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {hapticEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticService.heavy();
                      soundService.playClick();
                    }}
                    className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-[10px] tap-bounce flex items-center justify-center gap-1.5 border border-emerald-200"
                  >
                    <Vibrate className="w-3 h-3 text-emerald-600" />
                    <span>{seniorMode ? 'وائبریشن چیک کریں (Test Pulse)' : 'Test Vibration Pulse (Tap to feel)'}</span>
                  </button>
                )}
              </div>"""

if old_haptic in text:
    text = text.replace(old_haptic, new_haptic)
    with open('src/components/SettingsModal.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: Haptic Feedback toggle expanded!")
else:
    print("WARNING: old_haptic block not found exactly, check content.")
