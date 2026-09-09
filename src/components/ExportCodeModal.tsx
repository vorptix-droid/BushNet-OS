import React, { useState } from 'react';
import { Download, Copy, Check, X, FileCode, FolderArchive } from 'lucide-react';
import {
  PYTHON_CORE_SCRIPT,
  ARDUINO_SKETCH,
  THUMBDRIVE_README,
  downloadZipPackage,
  downloadSingleFile,
  USERNAME
} from '../data/deploymentFiles';

interface ExportCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportCodeModal: React.FC<ExportCodeModalProps> = ({ isOpen, onClose }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'PYTHON' | 'ARDUINO' | 'SETUP'>('PYTHON');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const getActiveCode = () => {
    if (activeCodeTab === 'PYTHON') return PYTHON_CORE_SCRIPT;
    if (activeCodeTab === 'ARDUINO') return ARDUINO_SKETCH;
    return THUMBDRIVE_README;
  };

  const getFilename = () => {
    if (activeCodeTab === 'PYTHON') return 'aspen_pi5_core.py';
    if (activeCodeTab === 'ARDUINO') return 'aspen_keypad_shield.ino';
    return 'README_THUMBDRIVE.md';
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadZipPackage();
    } catch (err) {
      console.error(err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full p-6 text-slate-100 shadow-2xl space-y-4">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <FileCode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-mono text-emerald-400 uppercase">
                BushNet ASPEN — Production Code Exporter
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Deployable Python & C/C++ code configured for user <strong className="text-emerald-400">{USERNAME}</strong> (Raspberry Pi 5 & Arduino Keypad Shield).
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Code Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 gap-2">
          <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
            <button
              onClick={() => setActiveCodeTab('PYTHON')}
              className={`px-3 py-1.5 rounded font-bold transition ${
                activeCodeTab === 'PYTHON' ? 'bg-emerald-600 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              aspen_pi5_core.py (Python)
            </button>
            <button
              onClick={() => setActiveCodeTab('ARDUINO')}
              className={`px-3 py-1.5 rounded font-bold transition ${
                activeCodeTab === 'ARDUINO' ? 'bg-cyan-600 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              aspen_keypad_shield.ino (C++)
            </button>
            <button
              onClick={() => setActiveCodeTab('SETUP')}
              className={`px-3 py-1.5 rounded font-bold transition ${
                activeCodeTab === 'SETUP' ? 'bg-amber-600 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Thumbdrive Setup Guide
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 transition border border-slate-700"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>

            <button
              onClick={() => downloadSingleFile(getFilename(), getActiveCode())}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-mono font-bold flex items-center gap-1.5 transition shadow"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Code Display Area */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs max-h-[420px] overflow-y-auto text-slate-300 leading-relaxed whitespace-pre font-mono selection:bg-emerald-900 selection:text-emerald-200">
          {getActiveCode()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono text-slate-400">
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="text-emerald-400 hover:underline flex items-center gap-1.5 font-bold"
          >
            <FolderArchive className="w-4 h-4" />
            <span>{isZipping ? 'Creating Zip...' : 'Download Complete Deployment Package (.zip)'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};
