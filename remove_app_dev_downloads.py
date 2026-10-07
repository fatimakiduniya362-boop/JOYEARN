with open('src/App.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Remove import
text = text.replace("import { DownloadReleaseModal } from './components/DownloadReleaseModal';\n", "")

# 2. Remove banner section
banner_target = """        {/* DOWNLOAD PRODUCTION RELEASE ARTIFACTS BUTTON */}
        <section className="px-4 py-1.5">
          <button
            onClick={() => {
              soundService.playClick();
              setActiveModal('download');
            }}
            className="w-full py-2.5 px-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl border-2 border-indigo-400/60 shadow-md tap-bounce flex items-center justify-between hover:border-indigo-300 transition-all text-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-base">
                📦
              </div>
              <div className="text-left">
                <div className="font-black text-amber-300 flex items-center gap-1.5">
                  <span>Download .AAB & Complete ZIP</span>
                  <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                    Release
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 font-medium">
                  Signed App Bundle (~9.7 MB) & Production ZIP (~19.7 MB)
                </div>
              </div>
            </div>
            <div className="bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-xl font-black text-[11px] shadow-xs flex items-center gap-1 shrink-0">
              <Download className="w-3 h-3" />
              <span>Get Files</span>
            </div>
          </button>
        </section>"""

if banner_target in text:
    text = text.replace(banner_target, "")
    print("SUCCESS: Banner section removed!")
else:
    print("WARNING: banner_target not found!")

# 3. Remove modal render
modal_target = """        {/* Download Production Release Deliverables Modal */}
        {activeModal === 'download' && (
          <DownloadReleaseModal
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
          />
        )}"""

if modal_target in text:
    text = text.replace(modal_target, "")
    print("SUCCESS: Modal render removed!")
else:
    print("WARNING: modal_target not found!")

# 4. Remove 'download' from activeModal type union if present
text = text.replace("| 'download'", "")

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: Cleaned all in-app dev download references from App.tsx!")
