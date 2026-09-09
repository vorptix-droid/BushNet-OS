import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  FileCode,
  Terminal,
  Cpu,
  HardDrive,
  ShieldAlert,
  FolderArchive,
  ExternalLink,
  CheckCircle2,
  Info,
  Code2,
  Layers,
  FileText
} from 'lucide-react';
import {
  DEPLOYMENT_FILES_LIST,
  DeploymentFile,
  downloadZipPackage,
  downloadSingleFile,
  USERNAME,
  THUMBDRIVE_NAME
} from '../data/deploymentFiles';

export const DeploymentDownloadsPage: React.FC = () => {
  const [selectedFileId, setSelectedFileId] = useState<string>('python');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const selectedFile = DEPLOYMENT_FILES_LIST.find((f) => f.id === selectedFileId) || DEPLOYMENT_FILES_LIST[0];

  const handleCopy = (file: DeploymentFile) => {
    navigator.clipboard.writeText(file.content);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadZipPackage();
    } catch (err) {
      console.error('Failed generating zip package:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Download Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden backdrop-blur">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-wide text-slate-100 flex items-center gap-2">
                  <span>BushNet ASPEN Hardware & Deployment Downloads</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 font-mono">
                  Target User: <span className="text-emerald-400 font-bold">{USERNAME}</span> | Target: Raspberry Pi 5 & Arduino Uno (USB Flash Drive Ready)
                </p>
              </div>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl pt-1">
              All scripts, firmware, and configuration files needed to build your real-world offline BushNet ASPEN hardware station. Simply copy these files onto a USB Thumb Drive labelled <code className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded font-mono text-xs">{THUMBDRIVE_NAME}</code> or download individually below.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-sm font-bold shadow-lg shadow-emerald-950/50 flex items-center gap-2.5 transition transform active:scale-95 disabled:opacity-50"
            >
              <FolderArchive className="w-5 h-5" />
              <span>{isZipping ? 'Bundling ZIP...' : 'Download Full Package (.zip)'}</span>
            </button>
          </div>
        </div>

        {/* Thumb Drive Notice Badge */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
            <HardDrive className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block mb-0.5">USB Thumb Drive Mounting</span>
              <span className="text-slate-400">
                Auto-mounts at <code className="text-slate-200 bg-slate-900 px-1 rounded">/media/{USERNAME}/{THUMBDRIVE_NAME}/</code> on Pi OS Bookworm.
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
            <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-300 block mb-0.5">USB Serial Link</span>
              <span className="text-slate-400">
                Arduino Uno & Keypad Shield connect via USB cable to Pi 5 at <code className="text-slate-200 bg-slate-900 px-1 rounded">/dev/ttyACM0</code> (9600 Baud).
              </span>
            </div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-red-300 block mb-0.5">Power & Voltage Safety</span>
              <span className="text-slate-400">
                Arduino powered via 5V USB. Direct Pi 5 sensors (DHT11/BMP180) MUST use <strong className="text-red-300">3.3V Pin 1</strong>!
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Files Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (4 cols): File Selector Cards */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FolderArchive className="w-4 h-4 text-emerald-400" />
              <span>Deployment Files</span>
            </h2>
            <span className="text-xs font-mono text-slate-500">{DEPLOYMENT_FILES_LIST.length} Files Ready</span>
          </div>

          <div className="space-y-2">
            {DEPLOYMENT_FILES_LIST.map((file) => {
              const isSelected = file.id === selectedFileId;
              return (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 group ${
                    isSelected
                      ? 'bg-slate-800 border-emerald-500/80 shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-900/80 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 font-mono text-xs font-bold ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      {file.language === 'cpp' ? 'INO' : file.language === 'python' ? 'PY' : file.language === 'bash' ? 'SH' : file.language === 'ini' ? 'SVC' : 'MD'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-mono text-sm font-bold ${isSelected ? 'text-emerald-300' : 'text-slate-200'}`}>
                          {file.filename}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                        {file.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800">
                          {file.targetDevice}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Thumbdrive Installation Quick Helper */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <Terminal className="w-4 h-4" />
              <span>Execution Commands</span>
            </div>
            
            <div className="space-y-2 text-[11px]">
              <div>
                <span className="text-slate-400 block mb-1">Option 1: Desktop Auto-Mounted USB</span>
                <div className="bg-slate-950 p-2 rounded border border-slate-800 text-amber-300 font-mono break-all select-all">
                  cd /media/lachlan/THUMBDRIVE && bash setup_thumbdrive.sh
                </div>
              </div>

              <div>
                <span className="text-slate-400 block mb-1">Option 2: Headless OS Manual Mount (sda1)</span>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-cyan-300 font-mono space-y-1 select-all leading-relaxed">
                  <div className="text-slate-500"># 1. Mount sda1 partition</div>
                  <div>sudo mkdir -p /mnt/thumbdrive</div>
                  <div>sudo mount /dev/sda1 /mnt/thumbdrive</div>
                  <div className="text-slate-500 pt-1"># 2. Run installer</div>
                  <div>cd /mnt/thumbdrive && bash setup_thumbdrive.sh</div>
                </div>
              </div>

              {/* Direct Script Execution & Service Fix */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-emerald-400 font-bold block mb-1">💾 Recommended: USB Thumbdrive Manual Update</span>
                <div className="bg-slate-950 p-2.5 rounded border border-emerald-500/40 text-emerald-300 font-mono text-[11px] break-all select-all shadow-inner space-y-1">
                  <div className="text-slate-400"># 1. Stop any running background scripts & release serial ports:</div>
                  <div>sudo pkill -f cat; sudo pkill -f python3</div>
                  <div className="text-slate-400 pt-1"># 2. Copy updated files from Thumbdrive to ~/bushnet/:</div>
                  <div>mkdir -p ~/bushnet</div>
                  <div>cp /media/lachlan/*/* ~/bushnet/ 2&gt;/dev/null || cp /media/lachlan/* ~/bushnet/ 2&gt;/dev/null || cp /mnt/thumbdrive/* ~/bushnet/ 2&gt;/dev/null</div>
                  <div className="text-slate-400 pt-1"># 3. Verify clean Python file (starts with #!/usr/bin/env python3):</div>
                  <div>head -n 5 ~/bushnet/aspen_pi5_core.py</div>
                  <div className="text-slate-400 pt-1"># 4. Launch ASPEN Engine:</div>
                  <div>sudo python3 -u ~/bushnet/aspen_pi5_core.py</div>
                </div>
                <div className="text-[10px] text-slate-300 mt-2 space-y-1.5 bg-slate-900/90 p-2.5 rounded border border-slate-800">
                  <p className="font-bold text-amber-300 flex items-center gap-1">💡 Helpful Pi 5 Terminal Commands:</p>
                  <p>• <strong>Exit/Stop Running Program:</strong> Press <code className="text-cyan-300">Ctrl + C</code> in your terminal window.</p>
                  <p>• <strong>Kill Hidden Background Tasks:</strong> Run <code className="text-emerald-300">sudo pkill -f python3; sudo pkill -f cat</code></p>
                  <p>• <strong>Eject / Safely Unmount USB Drive:</strong> Run <code className="text-emerald-300">sync; sudo umount /media/lachlan/* 2&gt;/dev/null; sudo umount /mnt/thumbdrive 2&gt;/dev/null</code></p>
                  <p>• <strong>Reboot Raspberry Pi:</strong> Run <code className="text-emerald-300">sudo reboot</code></p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-amber-400 font-bold block mb-1">⚙️ Step 2: Auto-Start Service Setup</span>
                <div className="bg-slate-950 p-2.5 rounded border border-amber-500/40 text-amber-300 font-mono text-[11px] break-all select-all shadow-inner space-y-1">
                  <div className="text-slate-400"># Run the setup script from ~/bushnet to register auto-boot service:</div>
                  <div>cd ~/bushnet && bash setup_thumbdrive.sh</div>
                </div>
              </div>

              {/* How Qwen AI Works Section */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-purple-400 font-bold block mb-1">🧠 Step 3: Installing Local Qwen AI Engine (Ollama)</span>
                <div className="bg-slate-950 p-2.5 rounded border border-purple-500/40 text-purple-300 font-mono text-[11px] break-all select-all shadow-inner space-y-1">
                  <div className="text-slate-400"># Install Ollama on Pi OS & download Qwen 2.5 (0.5B parameters):</div>
                  <div>curl -fsSL https://ollama.com/install.sh | sh</div>
                  <div>ollama run qwen2.5:0.5b</div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  <strong>How Qwen works:</strong> Qwen AI model weights are ~350MB binary files installed on the Pi's main Linux OS via Ollama (not on the USB drive). Ollama runs Qwen locally on Pi 5 CPU/RAM completely offline!
                </p>
              </div>

              {/* Survival PDF / RAG Manual Ingestion Helper */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-cyan-400 font-bold block mb-1">📚 Survival PDF & Manual Ingestion (Offline RAG)</span>
                <div className="bg-slate-950 p-2.5 rounded border border-cyan-500/40 text-cyan-300 font-mono text-[11px] break-all select-all shadow-inner space-y-1">
                  <div className="text-slate-400"># 1. Create directory structure:</div>
                  <div>mkdir -p ~/bushnet/manuals ~/bushnet/data</div>
                  <div className="text-slate-400 pt-1"># 2. Copy scripts from USB or paste ingest_manuals.py:</div>
                  <div>cp -r /media/lachlan/*/* ~/bushnet/ 2&gt;/dev/null || cp /mnt/thumbdrive/* ~/bushnet/ 2&gt;/dev/null</div>
                  <div className="text-slate-400 pt-1"># 3. Download & index US Army FM 21-76 & Ranger Handbook:</div>
                  <div>python3 ~/bushnet/ingest_manuals.py --download</div>
                </div>
              </div>

              {/* Instant Auto-Fixer for /mnt/thumbdrive subfolder issue */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-emerald-400 font-bold block mb-1">⚡ Universal Auto-Find Command (Fixes "No such file")</span>
                <div className="bg-slate-950 p-2.5 rounded border border-emerald-500/40 text-emerald-300 font-mono text-[11px] break-all select-all shadow-inner">
                  find /mnt/thumbdrive /media/lachlan -name "setup_thumbdrive.sh" -exec bash {} \;
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Run this single command while in terminal! It searches the thumb drive, finds <code>setup_thumbdrive.sh</code> even inside subfolders, and runs it automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Speed Study: Raspberry Pi OS & Terminal Commands Crash Course */}
          <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Info className="w-4 h-4" />
              <span>Raspberry Pi OS Terminal Crash Course</span>
            </div>
            
            <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed font-sans">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800 font-mono">
                <div className="text-amber-300 font-bold">Understanding Your Terminal Prompt:</div>
                <div className="text-slate-400 text-[11px] mt-0.5">
                  <code className="text-emerald-400 font-bold">lachlan</code> = your user account (strictly lowercase!)<br/>
                  <code className="text-cyan-400 font-bold">@RaspberryPi</code> = your Pi board hostname<br/>
                  <code className="text-amber-400 font-bold">:~ $</code> or <code className="text-amber-400 font-bold">:/mnt/thumbdrive $</code> = current folder path
                </div>
              </div>

              <div className="space-y-1 text-slate-300 font-mono text-[11px]">
                <div><strong className="text-emerald-400">1. Case Sensitivity:</strong> Linux is strictly case-sensitive! <code className="text-slate-200 bg-slate-950 px-1">lachlan</code> is different from <code className="text-slate-200 bg-slate-950 px-1">Lachlan</code>.</div>
                <div><strong className="text-emerald-400">2. Seeing What Files Exist:</strong> Type <code className="text-amber-300 bg-slate-950 px-1">ls</code> and press Enter to see all files in your current folder.</div>
                <div><strong className="text-emerald-400">3. Navigation (cd):</strong> <code className="text-amber-300 bg-slate-950 px-1">cd foldername</code> moves into a folder. <code className="text-amber-300 bg-slate-950 px-1">cd ..</code> goes back up 1 level.</div>
                <div><strong className="text-emerald-400">4. Mounting (mount):</strong> Connects a hardware partition like <code className="text-slate-200 bg-slate-950 px-1">/dev/sda1</code> to a folder path like <code className="text-slate-200 bg-slate-950 px-1">/mnt/thumbdrive</code>.</div>
              </div>
            </div>
          </div>

          {/* Visual USB Directory Tree Guide */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <HardDrive className="w-4 h-4" />
              <span>USB Directory Structure ({THUMBDRIVE_NAME})</span>
            </div>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/80 text-slate-300 space-y-1 text-[11px] font-mono leading-relaxed">
              <div className="text-emerald-400 font-bold">💾 USB Root: /media/{USERNAME}/{THUMBDRIVE_NAME}/</div>
              <div className="pl-3 text-slate-400">├── 📄 aspen_pi5_core.py</div>
              <div className="pl-3 text-slate-400">├── 📄 ask.py</div>
              <div className="pl-3 text-slate-400">├── 📄 ingest_manuals.py</div>
              <div className="pl-3 text-slate-400">├── 📄 setup_thumbdrive.sh</div>
              <div className="pl-3 text-slate-400">├── 📄 aspen.service</div>
              <div className="pl-3 text-slate-400">├── 📄 aspen_keypad_shield.ino</div>
              <div className="pl-3 text-slate-400">└── 📄 README_THUMBDRIVE.md</div>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Keep all deployment files directly in the root of the thumb drive — do not place them inside nested subfolders.
            </p>
          </div>
        </div>

        {/* Right Column (8 cols): Selected Code File Viewer */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
          
          {/* File Header Toolbar */}
          <div className="bg-slate-950 px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-800 rounded text-emerald-400 font-mono text-xs font-bold">
                {selectedFile.language.toUpperCase()}
              </div>
              <div>
                <h3 className="font-mono text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>{selectedFile.filename}</span>
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Target: <span className="text-emerald-400">{selectedFile.recommendedPath}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleCopy(selectedFile)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold transition flex items-center gap-1.5 border border-slate-700"
              >
                {copiedId === selectedFile.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>

              <button
                onClick={() => downloadSingleFile(selectedFile.filename, selectedFile.content)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>

          {/* Description & Path Summary */}
          <div className="px-5 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-mono text-slate-400 flex items-center justify-between gap-4">
            <span className="truncate">{selectedFile.description}</span>
            <span className="text-slate-500 shrink-0">{selectedFile.content.split('\n').length} lines</span>
          </div>

          {/* Code Viewer Container */}
          <div className="relative bg-slate-950 p-4 font-mono text-xs text-slate-200 overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-800">
            <pre className="whitespace-pre">
              <code>
                {selectedFile.content.split('\n').map((line, idx) => (
                  <div key={idx} className="table-row hover:bg-slate-900/60">
                    <span className="table-cell pr-4 text-right select-none text-slate-600 text-[11px] w-10">
                      {idx + 1}
                    </span>
                    <span className="table-cell text-slate-300">{line}</span>
                  </div>
                ))}
              </code>
            </pre>
          </div>

          {/* Footer Card Info */}
          <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ready for Raspberry Pi 5 & Arduino deployment</span>
            </div>
            <button
              onClick={() => downloadSingleFile(selectedFile.filename, selectedFile.content)}
              className="text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Save {selectedFile.filename}</span>
              <Download className="w-3 h-3" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
