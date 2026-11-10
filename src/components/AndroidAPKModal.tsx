import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2, X, Copy, Check, ShieldCheck, FileArchive } from 'lucide-react';

interface AndroidAPKModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  onInstallPWA: () => void;
}

export const AndroidAPKModal: React.FC<AndroidAPKModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  onInstallPWA,
}) => {
  const [copiedSha, setCopiedSha] = useState(false);
  if (!isOpen) return null;

  const sha256Fingerprint =
    '5A:CB:A1:5C:86:ED:BC:03:EC:16:10:AE:3C:A5:EC:11:57:A8:61:21:A2:2A:2A:CB:41:A4:99:E2:C0:F0:9A:D3';

  const copyFingerprint = () => {
    navigator.clipboard.writeText(sha256Fingerprint).catch(() => {});
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 select-none overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 p-6 sm:p-7 shadow-2xl relative my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-cyan-950 border border-cyan-500/40 text-cyan-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-cyber text-white">
              Android APK & App Bundle Ready
            </h3>
            <p className="text-xs text-emerald-400 font-mono-code">
              Package ID: com.cavedroid3d.subterranean · v1.0.0
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-300 mb-5 leading-relaxed">
          Your Bubblewrap Android build is compiled, signed, and ready for direct download. Choose the standalone signed <strong>.apk</strong> for sideloading on any Android phone, or the <strong>.aab</strong> bundle for Google Play Console:
        </p>

        {/* Primary Option 1: Direct Signed APK Download */}
        <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 mb-3.5 shadow-lg shadow-emerald-950/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono-code text-xs flex items-center justify-center font-bold">1</span>
              <span className="text-sm font-bold text-white">Signed Android APK (Ready to Install)</span>
            </div>
            <span className="text-[10px] font-mono-code bg-emerald-950 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded">
              1.4 MB · Signed
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            Built with <strong>@bubblewrap/cli</strong> and signed with a release keystore + configured Digital Asset Links (<code className="text-cyan-300">/.well-known/assetlinks.json</code>) for fullscreen native execution.
          </p>

          <a
            href="/cavedroid-3d.apk"
            download="CAVEDROID-3D-signed.apk"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold tracking-wide transition shadow-lg shadow-emerald-950 mb-2.5"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD CAVEDROID-3D-SIGNED.APK (1.4 MB)</span>
          </a>

          <a
            href="/cavedroid-3d.aab"
            download="CAVEDROID-3D-release.aab"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition"
          >
            <FileArchive className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download Google Play App Bundle (.aab · 1.5 MB)</span>
          </a>
        </div>

        {/* Option 2: Direct Browser WebAPK Install */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 mb-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono-code text-xs flex items-center justify-center font-bold">2</span>
              <span className="text-sm font-bold text-white">One-Tap Browser Install (WebAPK)</span>
            </div>
          </div>

          {isInstallable ? (
            <button
              onClick={() => {
                onInstallPWA();
                onClose();
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-950"
            >
              <Smartphone className="w-4 h-4" />
              <span>INSTALL DIRECTLY TO HOME SCREEN</span>
            </button>
          ) : (
            <div className="text-xs font-mono-code text-slate-400 bg-slate-900 p-2.5 rounded border border-slate-800">
              Or open on Android Chrome menu (⋮) → <strong className="text-slate-200">"Install App"</strong> for zero-sideload installation.
            </div>
          )}
        </div>

        {/* Signing Certificate & Digital Asset Links Metadata */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 mb-4 text-left">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>APK Signing Cert SHA-256 Fingerprint:</span>
            </div>
            <a
              href="/.well-known/assetlinks.json"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] font-mono-code text-cyan-400 hover:underline"
            >
              assetlinks.json ↗
            </a>
          </div>
          <div className="flex items-center justify-between gap-2 p-2 rounded bg-black/80 border border-slate-800 font-mono-code text-[10px] text-cyan-400 overflow-x-auto">
            <span className="truncate">{sha256Fingerprint}</span>
            <button
              onClick={copyFingerprint}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 transition shrink-0"
            >
              {copiedSha ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedSha ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Compliance Checklist */}
        <div className="flex items-center justify-around py-2.5 px-3 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] font-mono-code text-slate-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Signed APK</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>AssetLinks Active</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Touch Controls</span>
          </div>
        </div>

        {/* Close CTA */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};
