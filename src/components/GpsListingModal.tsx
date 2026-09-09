import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Radio,
  Cpu,
  Compass,
  Gauge,
  Activity,
  CheckCircle2,
  ExternalLink,
  Layers,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';

const UBLOX_LISTING_IMG_SRC = '/images/ublox_listing.jpg';

interface GpsListingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GpsListingModal: React.FC<GpsListingModalProps> = ({ isOpen, onClose }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'image' | 'specs' | 'ucenter'>('image');

  if (!isOpen) return null;

  return (
    <div
      id="gps-listing-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div
        id="gps-listing-modal-container"
        className="relative w-full max-w-4xl max-h-[92vh] bg-stone-950 border border-stone-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-stone-200 font-mono"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-stone-900 border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-700/80 flex items-center justify-center text-cyan-400 shadow">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-100 flex items-center gap-2">
                <span>VK-162 USB GPS DONGLE &bull; PRODUCT LISTING SPECIFICATION</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-normal">
                  u-blox 7 Engine
                </span>
              </div>
              <div className="text-[10px] text-stone-400">
                Listing Image &bull; u-center 8.21 Diagnostic Suite &bull; COM4 9600 Baud
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Selector Tabs */}
            <div className="flex bg-stone-950 p-0.5 rounded-lg border border-stone-800 text-[10px]">
              <button
                id="btn-tab-image"
                onClick={() => setActiveTab('image')}
                className={`px-2.5 py-1 rounded-md transition font-bold ${
                  activeTab === 'image'
                    ? 'bg-cyan-700 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                📷 Listing Photo
              </button>
              <button
                id="btn-tab-specs"
                onClick={() => setActiveTab('specs')}
                className={`px-2.5 py-1 rounded-md transition font-bold ${
                  activeTab === 'specs'
                    ? 'bg-cyan-700 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                ⚙️ Chip Specs
              </button>
              <button
                id="btn-tab-ucenter"
                onClick={() => setActiveTab('ucenter')}
                className={`px-2.5 py-1 rounded-md transition font-bold ${
                  activeTab === 'ucenter'
                    ? 'bg-cyan-700 text-stone-950 shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                🛰️ u-center Breakdown
              </button>
            </div>

            <button
              id="btn-close-listing-modal"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-100 border border-stone-700 transition"
              title="Close Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'image' && (
            <div className="space-y-3">
              {/* Image Control Bar */}
              <div className="flex items-center justify-between bg-stone-900/90 border border-stone-800 px-3 py-1.5 rounded-lg text-[11px]">
                <div className="flex items-center gap-2 text-stone-400">
                  <span>Zoom: <strong>{Math.round(zoomLevel * 100)}%</strong></span>
                  <span className="text-stone-600">|</span>
                  <span className="text-stone-400">Original Listing: Product Gallery (u-blox 7 USB interface)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
                    className="p-1 bg-stone-950 hover:bg-stone-800 border border-stone-700 rounded text-stone-300"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel(1)}
                    className="p-1 bg-stone-950 hover:bg-stone-800 border border-stone-700 rounded text-stone-300"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(2.5, Number((z + 0.2).toFixed(1))))}
                    className="p-1 bg-stone-950 hover:bg-stone-800 border border-stone-700 rounded text-stone-300"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Image Display Frame */}
              <div className="relative bg-stone-950 border border-stone-800 rounded-xl overflow-hidden flex items-center justify-center p-2 min-h-[420px] max-h-[65vh]">
                <div
                  className="transition-transform duration-150 ease-out origin-center"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  <img
                    id="ublox-listing-img"
                    src={UBLOX_LISTING_IMG_SRC}
                    alt="u-blox 7 USB GPS Dongle Product Listing"
                    referrerPolicy="no-referrer"
                    className="max-h-[60vh] max-w-full rounded shadow-lg object-contain"
                  />
                </div>
              </div>

              {/* Annotation Callouts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px]">
                <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800 space-y-1">
                  <div className="text-cyan-400 font-bold flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    CHIP: u-blox 7 (UBX-G7020-KT)
                  </div>
                  <p className="text-stone-400 leading-tight">
                    Standard high-sensitivity 56-channel positioning engine with active antenna bias. Operates at 9600 baud rate over USB virtual COM.
                  </p>
                </div>

                <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800 space-y-1">
                  <div className="text-emerald-400 font-bold flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    u-center 8.21 Diagnostic Screen
                  </div>
                  <p className="text-stone-400 leading-tight">
                    Screenshot depicts COM4 connection at 9600 baud. Polar radar shows satellites G28, G30, G8, G11, G1 with SNR values up to 38 dB-Hz.
                  </p>
                </div>

                <div className="bg-stone-900/80 p-2.5 rounded-lg border border-stone-800 space-y-1">
                  <div className="text-amber-400 font-bold flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    Diagnostics & Instruments
                  </div>
                  <p className="text-stone-400 leading-tight">
                    Analog compass rose, speedometer, altimeter clock dial (9500m demo point), and UTC clock synchronized to atomic GPS time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-3 text-xs">
              <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-lg space-y-2">
                <div className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  Hardware Specifications &bull; VK-162 / G-Mouse USB Receiver
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  The VK-162 USB GPS receiver module contains an authentic u-blox 7 chipset and an integrated high-gain patch antenna. It acts as an asynchronous serial device over USB, streaming standard NMEA-0183 sentences directly to the Linux kernel at <code className="text-emerald-400 bg-stone-950 px-1 py-0.5 rounded">/dev/ttyACM0</code> or <code className="text-emerald-400 bg-stone-950 px-1 py-0.5 rounded">/dev/ttyUSB0</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div className="bg-stone-900/80 border border-stone-800 p-2.5 rounded-lg space-y-1.5">
                  <div className="text-stone-200 font-bold text-[10px] uppercase text-emerald-400">
                    RF & Satellite Receiver Parameters
                  </div>
                  <table className="w-full text-stone-300">
                    <tbody className="divide-y divide-stone-800/80">
                      <tr>
                        <td className="py-1 text-stone-400">Core Engine</td>
                        <td className="py-1 text-right font-bold text-stone-100">u-blox 7 (7020 chipset)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Frequency Band</td>
                        <td className="py-1 text-right font-bold text-stone-100">GPS L1 C/A (1575.42 MHz)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Channels</td>
                        <td className="py-1 text-right font-bold text-stone-100">56 Tracking Channels</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Tracking Sensitivity</td>
                        <td className="py-1 text-right font-bold text-stone-100">-162 dBm</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Cold Start Sensitivity</td>
                        <td className="py-1 text-right font-bold text-stone-100">-148 dBm</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Position Accuracy</td>
                        <td className="py-1 text-right font-bold text-stone-100">2.0 m CEP (SBAS: 1.5 m)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Velocity Accuracy</td>
                        <td className="py-1 text-right font-bold text-stone-100">0.1 m/s</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-stone-900/80 border border-stone-800 p-2.5 rounded-lg space-y-1.5">
                  <div className="text-stone-200 font-bold text-[10px] uppercase text-cyan-400">
                    Host Interface & Bus Protocol
                  </div>
                  <table className="w-full text-stone-300">
                    <tbody className="divide-y divide-stone-800/80">
                      <tr>
                        <td className="py-1 text-stone-400">Physical Interface</td>
                        <td className="py-1 text-right font-bold text-stone-100">USB 2.0 Full-Speed (Type-A)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Default Baud Rate</td>
                        <td className="py-1 text-right font-bold text-stone-100">9600 bps (8-N-1)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Supported Protocols</td>
                        <td className="py-1 text-right font-bold text-stone-100">NMEA-0183 v4.0 &amp; UBX Binary</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Default NMEA Rate</td>
                        <td className="py-1 text-right font-bold text-stone-100">1 Hz (Configurable up to 10 Hz)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Supply Voltage</td>
                        <td className="py-1 text-right font-bold text-stone-100">5.0V DC &plusmn;5% (via USB)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Operating Current</td>
                        <td className="py-1 text-right font-bold text-stone-100">~35 mA (Acquisition: ~55 mA)</td>
                      </tr>
                      <tr>
                        <td className="py-1 text-stone-400">Linux Device Node</td>
                        <td className="py-1 text-right font-bold text-emerald-300">/dev/ttyACM0 / /dev/ttyUSB0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* BushNet Integration Card */}
              <div className="bg-emerald-950/40 border border-emerald-800/80 p-3 rounded-lg text-[11px] space-y-1">
                <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  BushNet Raspberry Pi 5 Daemon Pipeline
                </div>
                <p className="text-stone-300 leading-relaxed">
                  On the physical BushNet handheld terminal, the <code className="text-cyan-300">gpsd</code> daemon binds to the USB receiver and pipes NMEA sentences (<code className="text-stone-400">$GPGGA, $GPRMC</code>) to the local IPC bus. Latitude, longitude, heading, satellite count, and geometric elevation are polled at 1000ms intervals and synchronized with the BMP180 barometric altimeter.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ucenter' && (
            <div className="space-y-3 text-xs">
              <div className="bg-stone-900/90 border border-stone-800 p-3 rounded-lg space-y-2">
                <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  u-center 8.21 Diagnostic Suite Explained
                </div>
                <p className="text-[11px] text-stone-400 leading-relaxed">
                  The listing shows the official u-blox evaluation software <strong className="text-stone-200">u-center 8.21</strong> operating on Windows COM4 at 9600 baud. The interface is composed of multiple real-time instrumentation windows:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                {/* 1. Sky View Polar Plot */}
                <div className="bg-stone-900/80 border border-stone-800 p-2.5 rounded-lg space-y-1.5">
                  <div className="text-cyan-400 font-bold flex items-center justify-between">
                    <span>1. Sky View Polar Radar</span>
                    <span className="text-[10px] text-stone-500">Azimuth / Elevation</span>
                  </div>
                  <p className="text-stone-400 leading-relaxed">
                    A circular polar radar projection representing the sky dome above the receiver.
                  </p>
                  <ul className="text-stone-300 space-y-1 list-disc list-inside text-[10px]">
                    <li>Outer circle: Horizon (0&deg; elevation).</li>
                    <li>Inner rings: 30&deg;, 60&deg;, and center Zenith (90&deg; directly overhead).</li>
                    <li>Visible SVs in listing: <strong>G28, G30, G8, G11, G1</strong>. Green indicates healthy ephemeris and active carrier lock.</li>
                  </ul>
                </div>

                {/* 2. Signal Strength C/No Bar Graph */}
                <div className="bg-stone-900/80 border border-stone-800 p-2.5 rounded-lg space-y-1.5">
                  <div className="text-emerald-400 font-bold flex items-center justify-between">
                    <span>2. Signal Strength (C/N0 dB-Hz)</span>
                    <span className="text-[10px] text-stone-500">Carrier-to-Noise</span>
                  </div>
                  <p className="text-stone-400 leading-relaxed">
                    Displays raw signal quality in decibel-hertz for each tracked space vehicle:
                  </p>
                  <ul className="text-stone-300 space-y-1 list-disc list-inside text-[10px]">
                    <li><strong className="text-emerald-400">&gt;35 dB-Hz:</strong> Excellent lock (G28 @ ~38 dB-Hz).</li>
                    <li><strong className="text-emerald-300">28-35 dB-Hz:</strong> Solid navigation fix (G30 @ 32, G8 @ 28).</li>
                    <li><strong className="text-cyan-400">18-25 dB-Hz:</strong> Marginal tracking (G11 @ 22, G1 @ 18).</li>
                  </ul>
                </div>

                {/* 3. Instruments & Gauges */}
                <div className="bg-stone-900/80 border border-stone-800 p-2.5 rounded-lg space-y-1.5">
                  <div className="text-amber-400 font-bold flex items-center justify-between">
                    <span>3. Analog Flight &amp; Field Gauges</span>
                    <span className="text-[10px] text-stone-500">Navigation Instruments</span>
                  </div>
                  <p className="text-stone-400 leading-relaxed">
                    u-center features four virtual analog dials on the right panel:
                  </p>
                  <ul className="text-stone-300 space-y-1 list-disc list-inside text-[10px]">
                    <li><strong>Compass Rose:</strong> Ground track heading.</li>
                    <li><strong>Speedometer:</strong> Velocity in m/s and km/h (showing 0.26 m/s / 0.9 km/h in listing).</li>
                    <li><strong>Altimeter Dial:</strong> Dial calibrated with &times;100m hands (reading 09,500m).</li>
                    <li><strong>UTC Clock:</strong> Atomic clock time (listing shows 03:58:56 UTC).</li>
                  </ul>
                </div>

                {/* 4. Fix Mode & Dilution of Precision */}
                <div className="bg-stone-900/80 border border-stone-800 p-2.5 rounded-lg space-y-1.5">
                  <div className="text-purple-400 font-bold flex items-center justify-between">
                    <span>4. Geometric Dilution &amp; Accuracy</span>
                    <span className="text-[10px] text-stone-500">DOP &amp; TTFF</span>
                  </div>
                  <p className="text-stone-400 leading-relaxed">
                    Provides precision metrics calculated from the constellation geometry:
                  </p>
                  <ul className="text-stone-300 space-y-1 list-disc list-inside text-[10px]">
                    <li><strong>Fix Mode:</strong> 3D (requires minimum 4 satellites to resolve X, Y, Z, T).</li>
                    <li><strong>PDOP / HDOP:</strong> Position &amp; Horizontal Dilution of Precision (lower is better; &lt;2.0 is ideal).</li>
                    <li><strong>TTFF:</strong> Time To First Fix after satellite acquisition.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-stone-900 border-t border-stone-800 text-[10px] text-stone-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>u-blox 7 GPS Receiver &bull; COM4 9600-8N1 &bull; Active in BushNet OS</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded font-bold transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
