with open('src/components/SettingsModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """          {/* CATEGORY 9: GOOGLE PLAY STORE PRODUCTION PACKAGE & DOWNLOADS */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 px-1">
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>{seniorMode ? 'پلے اسٹور بنڈل اور سورس کوڈ' : 'Google Play Console Package & Source'}</span>
            </span>

            <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50 border border-indigo-200 rounded-2xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800">Target SDK: 34 (Android 14)</span>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Release .AAB Ready
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href="/joyearn-source-complete.zip"
                  download="joyearn-source-complete.zip"
                  className="py-2.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] rounded-xl shadow-sm text-center flex flex-col items-center justify-center gap-1 tap-bounce"
                >
                  <span className="text-base">📦</span>
                  <span>Project ZIP</span>
                  <span className="text-[9px] font-normal opacity-80">(Full Source Code)</span>
                </a>

                <a
                  href="/app-release-bundle.aab"
                  download="app-release-bundle.aab"
                  className="py-2.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[11px] rounded-xl shadow-sm text-center flex flex-col items-center justify-center gap-1 tap-bounce"
                >
                  <span className="text-base">🤖</span>
                  <span>Signed .AAB</span>
                  <span className="text-[9px] font-normal opacity-80">(Google Play Upload)</span>
                </a>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug text-center">
                Signed Release Android App Bundle (.aab), non-APK, 64-bit universal bundle ready for Play Console Internal &amp; Production tracks.
              </p>
            </div>
          </div>"""

if target in text:
    text = text.replace(target, "")
    with open('src/components/SettingsModal.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
    print("SUCCESS: Category 9 removed from SettingsModal.tsx!")
else:
    print("WARNING: target not found in SettingsModal.tsx")
