import React, { useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-full border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
        App Installed
      </span>
    );
  }

  return (
    <>
      {isInstallable ? (
        <button
          onClick={install}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold text-amber-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-500 hover:to-amber-400 rounded-lg shadow-sm transition active:scale-95"
          title="Install Welcome Agarbatti App to Home Screen"
        >
          <Download className="w-4 h-4 text-amber-900" />
          <span>Install App</span>
        </button>
      ) : isIOS ? (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition"
        >
          <Smartphone className="w-4 h-4" />
          <span>Install on iOS</span>
        </button>
      ) : (
        <button
          onClick={() => setShowAndroidGuide(true)}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg border border-stone-300 transition"
          title="Add to Android Home Screen instructions"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Add to Phone</span>
        </button>
      )}

      {/* iOS Modal Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-700" />
                Install on iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm text-stone-700">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold shrink-0">1</span>
                <p>Tap the <Share2 className="w-4 h-4 inline text-blue-600 mx-1" /> <strong>Share</strong> button in the Safari bottom toolbar.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold shrink-0">2</span>
                <p>Scroll down in the share menu and tap <strong>Add to Home Screen</strong>.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold shrink-0">3</span>
                <p>Tap <strong>Add</strong> in the top right. Welcome Agarbatti will appear as an app icon on your home screen!</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-amber-800 text-white font-semibold text-sm hover:bg-amber-900 active:scale-98 transition shadow"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Android Chrome Modal Guide */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-amber-700" />
                Add to Android Phone
              </h3>
              <button
                onClick={() => setShowAndroidGuide(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-4 space-y-3 text-sm text-stone-700">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold shrink-0">1</span>
                <p>Open this page on your Android phone using <strong>Chrome browser</strong>.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold shrink-0">2</span>
                <p>Tap the <strong>three dots menu (⋮)</strong> at the top right of Chrome.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-800 text-xs font-bold shrink-0">3</span>
                <p>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
              </div>
            </div>
            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2.5 rounded-xl bg-amber-800 text-white font-semibold text-sm hover:bg-amber-900 active:scale-98 transition shadow"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
