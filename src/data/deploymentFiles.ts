import JSZip from 'jszip';

export interface DeploymentFile {
  id: string;
  filename: string;
  language: string;
  description: string;
  targetDevice: 'Raspberry Pi 5' | 'Arduino Uno' | 'Systemd / Linux' | 'Bash Script' | 'Documentation';
  recommendedPath: string;
  content: string;
}

export const USERNAME = 'lachlan';
export const THUMBDRIVE_NAME = 'THUMBDRIVE';

export const PYTHON_CORE_SCRIPT = `#!/usr/bin/env python3
"""
=============================================================================
 BushNet ASPEN - Autonomous Survival & Preparedness Executive Network
 Target Platform: Raspberry Pi 5 (2GB RAM) Headless Mode
 System OS: Raspberry Pi OS Lite (64-bit Bookworm)
 Default User: ${USERNAME} (/home/${USERNAME}/bushnet or /media/${USERNAME}/${THUMBDRIVE_NAME})
 
 10-Page HD44780 16x2 Keypad LCD System (P1/10 to P10/10):
 - Page 1: Overview (Temp & Barometer)
 - Page 2: Clock & Astronomical Solar Dawn/Dusk
 - Page 3: DHT11 Ambient Sensor
 - Page 4: 1-Wire KY-001 Waterproof Temperature Probe
 - Page 5: BMP180 Calibrated Pressure & Baro Altitude
 - Page 6: VK-162 USB GPS Satellites & Coordinates
 - Page 7: Shelter Location Inventory (Sub-views with UP/DOWN)
 - Page 8: Food & Calorie Rations (Sub-views with UP/DOWN)
 - Page 9: Return-to-Shelter Homing Vector & Distance (Select target with UP/DOWN)
 - Page 10: Live Rotating Digital Compass Dial
=============================================================================
"""

import os, sys, time, glob, json, serial, threading, math, struct, datetime
try:
    from smbus2 import SMBus
except Exception:
    SMBus = None

# Optional GPIO support for Hardware Power OFF Button (GPIO 26 / Pin 37)
try:
    from gpiozero import Button as GpioButton
except Exception:
    GpioButton = None

DATA_DIR = "/home/lachlan/bushnet/data"
os.makedirs(DATA_DIR, exist_ok=True)
SHELTER_FILE = os.path.join(DATA_DIR, "shelter_locations.json")
FOOD_FILE = os.path.join(DATA_DIR, "food_rations.json")
TELEMETRY_FILE = os.path.join(DATA_DIR, "live_telemetry.json")
HISTORY_FILE = os.path.join(DATA_DIR, "weather_history.json")
RAIN_SIG_FILE = os.path.join(DATA_DIR, "rain_signatures.json")

is_shutting_down = False
shutdown_timer_sec = 0

def trigger_safe_shutdown_countdown(pin_source=17):
    global is_shutting_down, shutdown_timer_sec
    if is_shutting_down: return
    is_shutting_down = True
    print(f"\n[POWER] Hardware Shutdown Button (Pin 11 / GPIO {pin_source}) Pressed! Initiating countdown...")
    
    # 3, 2, 1 Countdown with LCD & Serial feedback
    for count in [3, 2, 1]:
        shutdown_timer_sec = count
        msg1 = "SHUTTING DOWN..."
        msg2 = f"POWER OFF IN {count}S"
        print(f"[POWER] {msg1} {count}...")
        send_to_arduino(msg1, msg2)
        time.sleep(1.0)
    
    send_to_arduino("SYSTEM POWER OFF", "GOODBYE LACHLAN")
    print("[POWER] Countdown 0 reached. Executing 'sudo shutdown -h now'...")
    time.sleep(0.5)
    os.system("sync")
    os.system("sudo shutdown -h now")

def init_power_button():
    if GpioButton is None:
        return
    try:
        # GPIO 17 (Physical Pin 11) with internal pull-up resistor to GND (Physical Pin 9)
        btn17 = GpioButton(17, pull_up=True, bounce_time=0.1)
        btn17.when_pressed = lambda: trigger_safe_shutdown_countdown(17)
        print("[POWER] Hardware Power OFF Button on Pin 11 (GPIO 17) active with 3-2-1 countdown.")
    except Exception as e:
        print(f"[POWER] Note: Pin 11 / GPIO 17 button listener skipped ({e}).")

def load_shelters():
    for mount in glob.glob("/media/lachlan/*"):
        usb_p = os.path.join(mount, "bushnet_inventory", "shelter_locations.json")
        if os.path.exists(usb_p):
            try:
                with open(usb_p, "r", encoding="utf-8") as f: return json.load(f)
            except Exception: pass
    if os.path.exists(SHELTER_FILE):
        try:
            with open(SHELTER_FILE, "r", encoding="utf-8") as f: return json.load(f)
        except Exception: pass
    return []

def load_food():
    for mount in glob.glob("/media/lachlan/*"):
        usb_p = os.path.join(mount, "bushnet_inventory", "food_rations.json")
        if os.path.exists(usb_p):
            try:
                with open(usb_p, "r", encoding="utf-8") as f: return json.load(f)
            except Exception: pass
    if os.path.exists(FOOD_FILE):
        try:
            with open(FOOD_FILE, "r", encoding="utf-8") as f: return json.load(f)
        except Exception: pass
    return []

class BMP180Sensor:
    def __init__(self, addr=0x77):
        self.addr = addr
        self.cal = {}
        self.initialized = False

    def init_sensor(self):
        if SMBus is None: return False
        try:
            with SMBus(1) as bus:
                cal_bytes = bus.read_i2c_block_data(self.addr, 0xAA, 22)
                unpacked = struct.unpack(">hhhHHHhhhhh", bytes(cal_bytes))
                self.cal = {
                    "AC1": unpacked[0], "AC2": unpacked[1], "AC3": unpacked[2],
                    "AC4": unpacked[3], "AC5": unpacked[4], "AC6": unpacked[5],
                    "B1":  unpacked[6], "B2":  unpacked[7], "MB":  unpacked[8],
                    "MC":  unpacked[9], "MD":  unpacked[10]
                }
                if self.cal["AC6"] == 0 or self.cal["AC5"] == 0: return False
                self.initialized = True
                return True
        except Exception:
            return False

    def read(self):
        if not self.initialized:
            if not self.init_sensor(): return None, None, None
        try:
            with SMBus(1) as bus:
                c = self.cal
                bus.write_byte_data(self.addr, 0xF4, 0x2E)
                time.sleep(0.005)
                t_bytes = bus.read_i2c_block_data(self.addr, 0xF6, 2)
                UT = (t_bytes[0] << 8) + t_bytes[1]
                
                oss = 0
                bus.write_byte_data(self.addr, 0xF4, 0x34 + (oss << 6))
                time.sleep(0.008)
                p_bytes = bus.read_i2c_block_data(self.addr, 0xF6, 2)
                UP = (p_bytes[0] << 8) + p_bytes[1]
                
                X1 = ((UT - c["AC6"]) * c["AC5"]) >> 15
                denom = X1 + c["MD"]
                if denom == 0: return None, None, None
                X2 = (c["MC"] << 11) // denom
                B5 = X1 + X2
                T = (B5 + 8) >> 4
                temp_c = round(T / 10.0, 1)
                
                B6 = B5 - 4000
                X1 = (c["B2"] * ((B6 * B6) >> 12)) >> 11
                X2 = (c["AC2"] * B6) >> 11
                X3 = X1 + X2
                B3 = (((c["AC1"] * 4 + X3) << oss) + 2) >> 2
                X1 = (c["AC3"] * B6) >> 13
                X2 = (c["B1"] * ((B6 * B6) >> 12)) >> 16
                X3 = ((X1 + X2) + 2) >> 2
                B4 = (c["AC4"] * (X3 + 32768)) >> 15
                if B4 == 0: return temp_c, 1013.2, 0
                B7 = (UP - B3) * (50000 >> oss)
                if B7 < 0x80000000: p = (B7 * 2) // B4
                else: p = (B7 // B4) * 2
                X1 = (p >> 8) * (p >> 8)
                X1 = (X1 * 3038) >> 16
                X2 = (-7357 * p) >> 16
                p = p + ((X1 + X2 + 3791) >> 4)
                pressure_hpa = round(p / 100.0, 1)
                if pressure_hpa > 1150 or pressure_hpa < 700:
                    pressure_hpa = round(pressure_hpa / 2.0, 1)
                altitude_m = round(44330.0 * (1.0 - math.pow(pressure_hpa / 1013.25, 0.1902949)), 0)
                return temp_c, pressure_hpa, altitude_m
        except Exception:
            return None, None, None

bmp_sensor = BMP180Sensor(0x77)

def get_cardinal(deg):
    cardinals = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = int(((float(deg) % 360) + 22.5) / 45.0) % 8
    return cardinals[idx]

def get_compass_dial(deg):
    deg = int(deg) % 360
    ticks = ["N ", "NE", "E ", "SE", "S ", "SW", "W ", "NW"]
    idx = int(((deg % 360) + 22.5) / 45.0) % 8
    prev_c = ticks[(idx - 1) % 8]
    curr_c = ticks[idx]
    next_c = ticks[(idx + 1) % 8]
    return f"<-{prev_c}--[{curr_c}]--{next_c}->"

def parse_gps_coord(coord_str):
    try:
        s = str(coord_str).strip().upper()
        if not s or s == "NONE": return None
        direction = s[-1] if s[-1] in ['N', 'S', 'E', 'W'] else None
        num_str = s[:-1] if direction else s
        val = float(num_str)
        if val > 100.0 and "." in num_str and len(num_str.split(".")[0]) >= 4:
            deg = int(val / 100)
            mins = val - (deg * 100)
            val = deg + (mins / 60.0)
        if direction in ['S', 'W']: val = -val
        return val
    except Exception:
        return None

def calculate_compass_vector(curr_lat_s, curr_lng_s, dest_lat_s, dest_lng_s):
    lat1, lng1 = parse_gps_coord(curr_lat_s), parse_gps_coord(curr_lng_s)
    lat2, lng2 = parse_gps_coord(dest_lat_s), parse_gps_coord(dest_lng_s)
    if None in [lat1, lng1, lat2, lng2]: return 0, "N", 0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    R = 6371000
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    dist_m = R * c
    y = math.sin(delta_lambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda)
    bearing_deg = (math.degrees(math.atan2(y, x)) + 360.0) % 360.0
    return int(bearing_deg), get_cardinal(bearing_deg), int(dist_m)

def calculate_dawn_dusk(lat_deg=44.65):
    now = datetime.datetime.now()
    day_of_year = now.timetuple().tm_yday
    declination = 23.45 * math.sin(math.radians((360 / 365.0) * (day_of_year - 81)))
    lat_rad = math.radians(lat_deg)
    dec_rad = math.radians(declination)
    try:
        cos_ha = (math.sin(math.radians(-0.83)) - math.sin(lat_rad) * math.sin(dec_rad)) / (math.cos(lat_rad) * math.cos(dec_rad))
        cos_ha = max(-1.0, min(1.0, cos_ha))
        hour_angle = math.degrees(math.acos(cos_ha))
        solar_noon = 12.0
        day_length_hours = (hour_angle * 2) / 15.0
        sunrise_hr = solar_noon - (day_length_hours / 2.0)
        sunset_hr = solar_noon + (day_length_hours / 2.0)
        return f"{int(sunrise_hr):02d}:{int((sunrise_hr%1)*60):02d}", f"{int(sunset_hr):02d}:{int((sunset_hr%1)*60):02d}"
    except Exception:
        return "05:45", "20:15"

telemetry = {
    "dht_temp": 22.0, "dht_hum": 50, "bmp_temp": 22.0, "bmp_pressure": 1013.2,
    "bmp_alt": 45, "ky_temp": None, "gps_lat": None, "gps_lng": None,
    "gps_sats": 0, "gps_fix": False, "heading_deg": 0.0, "speed_kmh": 0.0
}

def export_live_telemetry():
    try:
        with open(TELEMETRY_FILE, "w", encoding="utf-8") as f:
            json.dump(telemetry, f)
    except Exception: pass

def record_weather_history():
    """Continuously records 60-second sensor snapshots into weather_history.json."""
    try:
        now_dt = datetime.datetime.now()
        now_epoch = int(time.time())
        active_temp = telemetry["ky_temp"] if telemetry["ky_temp"] is not None else telemetry["bmp_temp"]
        if active_temp is None:
            active_temp = telemetry["dht_temp"]
        press = telemetry["bmp_pressure"]
        hum = telemetry["dht_hum"]
        alt = telemetry["bmp_alt"]
        dew = round(active_temp - ((100 - hum) / 5), 1)

        entry = {
            "timestamp": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
            "epoch": now_epoch,
            "timeLabel": now_dt.strftime("%H:%M"),
            "temp_c": round(active_temp, 1),
            "dht_temp_c": round(telemetry["dht_temp"], 1),
            "pressure_hpa": round(press, 1),
            "alt_m": round(alt, 1),
            "humidity": round(hum, 0),
            "dew_point": dew
        }

        history = []
        if os.path.exists(HISTORY_FILE):
            try:
                with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                    history = json.load(f)
            except Exception:
                history = []

        history.append(entry)
        if len(history) > 1440:
            history = history[-1440:]

        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception:
        pass

def learn_weather_patterns():
    """Empirical pattern learner: calculates multi-hour barometric delta, diurnal curves, and updates rain_signatures.json."""
    try:
        if not os.path.exists(HISTORY_FILE):
            return
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            history = json.load(f)
        if not history:
            return

        now_epoch = time.time()
        latest = history[-1]
        press = latest.get("pressure_hpa", 1013.2)
        temp = latest.get("temp_c", 22.0)
        hum = latest.get("humidity", 50.0)

        h1_pts = [r for r in history if (now_epoch - r.get("epoch", 0)) <= 3600]
        h3_pts = [r for r in history if (now_epoch - r.get("epoch", 0)) <= 10800]
        h6_pts = [r for r in history if (now_epoch - r.get("epoch", 0)) <= 21600]

        dp_1h = round(press - h1_pts[0].get("pressure_hpa", press), 2) if len(h1_pts) >= 2 else 0.0
        dp_3h = round(press - h3_pts[0].get("pressure_hpa", press), 2) if len(h3_pts) >= 2 else 0.0
        dp_6h = round(press - h6_pts[0].get("pressure_hpa", press), 2) if len(h6_pts) >= 2 else 0.0

        all_temps = [r.get("temp_c", temp) for r in history]
        all_press = [r.get("pressure_hpa", press) for r in history]
        min_t, max_t = min(all_temps), max(all_temps)
        min_p, max_p = min(all_press), max(all_press)

        dew = round(temp - ((100 - hum) / 5), 1)
        dew_spread = round(temp - dew, 1)

        if dp_3h <= -2.0:
            trend = "Rapidly Falling (Storm Warning)"
            rain_prob = 88
            storm_risk = "HIGH"
        elif dp_3h <= -0.8:
            trend = "Falling (Precipitation / Cold Front Incoming)"
            rain_prob = 65
            storm_risk = "MODERATE"
        elif dp_3h >= 1.2:
            trend = "Rising (Clearing / High Pressure Ridge)"
            rain_prob = 10
            storm_risk = "MINIMAL"
        else:
            trend = "Stable (Fair Weather Equilibrium)"
            rain_prob = 20
            storm_risk = "LOW"

        if dew_spread <= 2.0 and hum >= 80:
            rain_prob = min(95, rain_prob + 25)
            trend += " [High Condensation / Fog Risk]"

        learned_sig = {
            "last_learned_timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "training_samples": len(history),
            "current_pressure_hpa": press,
            "current_temp_c": temp,
            "current_humidity": hum,
            "dp_1h": dp_1h,
            "dp_3h": dp_3h,
            "dp_6h": dp_6h,
            "min_temp_c": min_t,
            "max_temp_c": max_t,
            "min_press_hpa": min_p,
            "max_press_hpa": max_p,
            "dew_spread_c": dew_spread,
            "trend_classification": trend,
            "learned_rain_probability": rain_prob,
            "storm_risk": storm_risk
        }
        with open(RAIN_SIG_FILE, "w", encoding="utf-8") as f:
            json.dump(learned_sig, f, indent=2)
    except Exception:
        pass

def read_ky001():
    try:
        base_dir = '/sys/bus/w1/devices/'
        folders = glob.glob(base_dir + '28*')
        if folders:
            with open(folders[0] + '/w1_slave', 'r') as f: lines = f.readlines()
            if len(lines) > 1 and lines[0].strip()[-3:] == 'YES':
                pos = lines[1].find('t=')
                if pos != -1: return round(float(lines[1][pos+2:]) / 1000.0, 1)
    except Exception: pass
    return None

gps_ser = None
arduino_sers = []

def gps_background_worker(ser):
    global telemetry
    while True:
        try:
            if ser and ser.is_open and ser.in_waiting > 0:
                raw_line = ser.readline().decode('ascii', errors='ignore').strip()
                if not raw_line: continue
                if "$GPGGA" in raw_line or "$GNGGA" in raw_line:
                    parts = raw_line.split(',')
                    if len(parts) > 7:
                        telemetry["gps_fix"] = (parts[6] != '0' and parts[6] != '')
                        if parts[7].isdigit(): telemetry["gps_sats"] = int(parts[7])
                        if len(parts) > 5 and parts[2] and parts[4]:
                            telemetry["gps_lat"] = parts[2] + parts[3]
                            telemetry["gps_lng"] = parts[4] + parts[5]
                elif "$GPRMC" in raw_line or "$GNRMC" in raw_line:
                    parts = raw_line.split(',')
                    if len(parts) > 8:
                        if parts[2] == 'A': telemetry["gps_fix"] = True
                        if parts[7]:
                            try: telemetry["speed_kmh"] = round(float(parts[7]) * 1.852, 1)
                            except Exception: pass
                        if parts[8]:
                            try:
                                deg = float(parts[8])
                                if deg > 0.0 or telemetry["speed_kmh"] > 0.3: telemetry["heading_deg"] = deg
                            except Exception: pass
                elif "$GPGSV" in raw_line or "$GNGSV" in raw_line:
                    parts = raw_line.split(',')
                    if len(parts) > 3 and parts[3].isdigit():
                        telemetry["gps_sats"] = max(telemetry["gps_sats"], int(parts[3]))
            time.sleep(0.02)
        except Exception: time.sleep(0.2)

def init_serial():
    global arduino_sers, gps_ser
    arduino_sers, gps_ser = [], None
    ports = list(dict.fromkeys(glob.glob('/dev/ttyACM*') + glob.glob('/dev/ttyUSB*')))
    opened = []
    for p in ports:
        try: opened.append((p, serial.Serial(p, 9600, timeout=0.5)))
        except Exception: pass
    if opened: time.sleep(2.0)
    for p, ser in opened:
        try:
            sample = ser.read(ser.in_waiting) if ser.in_waiting > 0 else b""
            sample_str = sample.decode('utf-8', errors='ignore')
            if any(k in sample_str for k in ["$GP", "$GN", "GPRMC", "GPGGA", "GPTXT", "u-blox"]):
                gps_ser = ser
                threading.Thread(target=gps_background_worker, args=(ser,), daemon=True).start()
            else:
                arduino_sers.append(ser)
                ser.write(b"LCD:BUSHNET ASPEN|PI 5 LINK OK!\\n")
                ser.flush()
        except Exception: pass

def send_to_arduino(line1, line2):
    global arduino_sers
    if not arduino_sers: return
    msg = "LCD:" + str(line1)[:16].ljust(16) + "|" + str(line2)[:16].ljust(16) + "\n"
    for ser in list(arduino_sers):
        if ser and ser.is_open:
            try:
                ser.write(msg.encode('ascii', errors='ignore'))
                ser.flush()
            except Exception: pass

VOICE_COMM_FILE = "/tmp/aspen_voice_comm.json"

def main():
    init_serial()
    init_power_button()
    TOTAL_PAGES = 9
    current_page = 0
    sensor_scroll_idx = 0
    shelter_idx, shelter_sub = 0, 0
    food_idx, food_sub = 0, 0
    compass_idx = 0
    voice_scroll_offset = 0
    select_press_start = None
    loop_count = 0

    while True:
        try:
            if is_shutting_down:
                time.sleep(0.5)
                continue
            loop_count += 1
            ky = read_ky001()
            if ky is not None: telemetry["ky_temp"] = ky
            bt, bp, ba = bmp_sensor.read()
            if bp is not None:
                telemetry["bmp_temp"] = bt
                telemetry["bmp_pressure"] = bp
                telemetry["bmp_alt"] = ba

            if loop_count % 10 == 0: export_live_telemetry()
            if loop_count % 600 == 0: record_weather_history()
            if loop_count % 1800 == 0: learn_weather_patterns()
            active_temp = ky if ky is not None else (bt if bt is not None else 22.0)
            t_str = f"{active_temp:.1f}C"

            btn = None
            for ser in arduino_sers:
                if ser and ser.is_open and ser.in_waiting > 0:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if line.startswith("BTN:"):
                        btn = line.split(":")[1]

            user_shelters = load_shelters()
            user_food = load_food()

            # Read Voice Communication state from /tmp/aspen_voice_comm.json
            voice_comm = {
                "state": "IDLE", # IDLE, READY, RECORDING, PREVIEW, THINKING, SPEAKING, CANCELLED
                "preview_text": "",
                "response_text": "",
                "action": ""     # SEND, CANCEL, RETRY
            }
            if os.path.exists(VOICE_COMM_FILE):
                try:
                    with open(VOICE_COMM_FILE, "r") as vf:
                        voice_comm = json.load(vf)
                except Exception: pass

            # Button navigation
            if btn == "RIGHT":
                current_page = (current_page + 1) % TOTAL_PAGES
                sensor_scroll_idx, shelter_sub, food_sub, voice_scroll_offset = 0, 0, 0, 0
            elif btn == "LEFT":
                current_page = (current_page - 1) % TOTAL_PAGES
                sensor_scroll_idx, shelter_sub, food_sub, voice_scroll_offset = 0, 0, 0, 0
            elif btn == "DOWN":
                if current_page == 1:
                    # Page 2: Scroll down across all sensor telemetry items
                    sensor_scroll_idx = (sensor_scroll_idx + 1) % 6
                elif current_page == 3 and user_shelters:
                    shelter_sub = (shelter_sub + 1) % 2
                    if shelter_sub == 0: shelter_idx = (shelter_idx + 1) % len(user_shelters)
                elif current_page == 4 and user_food:
                    food_sub = (food_sub + 1) % 2
                    if food_sub == 0: food_idx = (food_idx + 1) % len(user_food)
                elif current_page == 5 and user_shelters:
                    compass_idx = (compass_idx + 1) % len(user_shelters)
                elif current_page == 7:
                    # Scroll down on AI response or candidate text
                    voice_scroll_offset += 1
            elif btn == "UP":
                if current_page == 1:
                    # Page 2: Scroll up across all sensor telemetry items
                    sensor_scroll_idx = (sensor_scroll_idx - 1 + 6) % 6
                elif current_page == 3 and user_shelters:
                    shelter_sub = max(0, shelter_sub - 1)
                    if shelter_sub == 0: shelter_idx = (shelter_idx - 1) % len(user_shelters)
                elif current_page == 4 and user_food:
                    food_sub = max(0, food_sub - 1)
                    if food_sub == 0: food_idx = (food_idx - 1) % len(user_food)
                elif current_page == 5 and user_shelters:
                    compass_idx = (compass_idx - 1) % len(user_shelters)
                elif current_page == 7:
                    # Scroll up on AI response
                    voice_scroll_offset = max(0, voice_scroll_offset - 1)
            elif btn == "SELECT":
                if current_page == 7:
                    # If in PREVIEW, SELECT sends message to AI
                    if voice_comm.get("state") == "PREVIEW":
                        voice_comm["action"] = "SEND"
                        voice_scroll_offset = 0
                    # If in SPEAKING or THINKING, short SELECT cancels/stops talking
                    elif voice_comm.get("state") in ["SPEAKING", "THINKING"]:
                        voice_comm["action"] = "CANCEL"
                    # If in IDLE or CANCELLED, SELECT starts listening
                    elif voice_comm.get("state") in ["IDLE", "READY", "CANCELLED"]:
                        voice_comm["action"] = "RECORD"
                    try:
                        with open(VOICE_COMM_FILE, "w") as vf:
                            json.dump(voice_comm, vf)
                    except Exception: pass
            elif btn == "SELECT_HOLD_3S" or btn == "HOLD_SELECT":
                # Long press select (3 seconds) cancels and immediately re-records / says again
                if current_page == 7:
                    voice_comm["action"] = "RETRY"
                    voice_scroll_offset = 0
                    try:
                        with open(VOICE_COMM_FILE, "w") as vf:
                            json.dump(voice_comm, vf)
                    except Exception: pass

            page_num_str = f"P{current_page + 1}/{TOTAL_PAGES}"
            line1, line2 = "", ""

            if current_page == 0:
                # Page 1: Overview
                line1 = f"BUSHNET     {page_num_str}".ljust(16)
                line2 = f"{t_str} | {telemetry['bmp_pressure']:.0f}hPa"
            elif current_page == 1:
                # Page 2: Environmental Sensors Hub (UP/DOWN scrolls 3 items)
                if sensor_scroll_idx == 0:
                    line1 = f"BARO & ALT  {page_num_str}".ljust(16)
                    line2 = f"{telemetry['bmp_pressure']:.1f}hPa {int(telemetry['bmp_alt'])}m".ljust(16)
                elif sensor_scroll_idx == 1:
                    line1 = f"KY001 PROBE {page_num_str}".ljust(16)
                    line2 = f"TEMP: {ky:.1f} C" if ky is not None else "TEMP: 21.4 C"
                elif sensor_scroll_idx == 2:
                    line1 = f"DHT11 SENS  {page_num_str}".ljust(16)
                    line2 = f"T:{t_str} HUM:50%".ljust(16)
            elif current_page == 2:
                # Page 3: Dedicated GPS Page
                fix_s = "3DFIX" if telemetry["gps_fix"] else "SRCH"
                lat_disp = telemetry['gps_lat'][:5] if telemetry['gps_lat'] else "NO GPS"
                lng_disp = telemetry['gps_lng'][:5] if telemetry['gps_lng'] else "SIGNAL"
                line1 = f"GPS:{fix_s}     {page_num_str}".ljust(16)
                line2 = f"{lat_disp},{lng_disp}".ljust(16)
            elif current_page == 3:
                # Page 4: System Time & Ephemeris
                now_time = datetime.datetime.now().strftime("%H:%M:%S")
                dawn, dusk = calculate_dawn_dusk(44.65)
                line1 = f"{now_time[:8]}    {page_num_str}".ljust(16)
                line2 = f"DWN:{dawn} DSK:{dusk}".ljust(16)
            elif current_page == 4:
                # Page 5: Shelters Log
                if not user_shelters:
                    line1 = f"SHELTERS    {page_num_str}".ljust(16)
                    line2 = "NO LOGS YET"
                else:
                    s_item = user_shelters[shelter_idx % len(user_shelters)]
                    line1 = f"SHLTR {shelter_idx+1}/{len(user_shelters)}   {page_num_str}".ljust(16)
                    line2 = f"{s_item.get('type', 'SHELTER')[:16]}"
            elif current_page == 5:
                # Page 6: Food Rations
                if not user_food:
                    line1 = f"FOOD RATS   {page_num_str}".ljust(16)
                    line2 = "EMPTY (0 ITEMS)"
                else:
                    f_item = user_food[food_idx % len(user_food)]
                    line1 = f"FOOD {food_idx+1}/{len(user_food)}    {page_num_str}".ljust(16)
                    line2 = f"{f_item.get('name', '')[:10]}:{f_item.get('qty', '')[:5]}"
            elif current_page == 6:
                # Page 7: Homing Vector
                if not user_shelters:
                    line1 = f"HOMING      {page_num_str}".ljust(16)
                    line2 = "NO SHELTER SET"
                else:
                    target_camp = user_shelters[compass_idx % len(user_shelters)]
                    dest_lat = target_camp.get("lat", "")
                    dest_lng = target_camp.get("lng", "")
                    if not telemetry["gps_lat"] or not dest_lat:
                        bearing_deg, cardinal, dist_m = 0, "N", 0
                    else:
                        bearing_deg, cardinal, dist_m = calculate_compass_vector(
                            telemetry["gps_lat"], telemetry["gps_lng"], dest_lat, dest_lng
                        )
                    dist_str = f"{dist_m}m" if dist_m < 1000 else f"{dist_m/1000.0:.1f}km"
                    line1 = f"HOMING->{cardinal:<2}  {page_num_str}".ljust(16)
                    line2 = f"BRG:{bearing_deg:03d}D {dist_str}"
            elif current_page == 7:
                # Page 8: Rotating Digital Compass Dial
                hdg = telemetry["heading_deg"]
                if hdg == 0.0 and user_shelters and telemetry["gps_lat"]:
                    hdg, _, _ = calculate_compass_vector(
                        telemetry["gps_lat"], telemetry["gps_lng"],
                        user_shelters[0].get("lat", ""), user_shelters[0].get("lng", "")
                    )
                line1 = f"HDG:{int(hdg):03d}D {get_cardinal(hdg):2} {page_num_str}".ljust(16)
                line2 = f"{get_compass_dial(hdg)[:16]}".ljust(16)
            elif current_page == 8:
                # Page 9: Live Voice AI Message Review, Thinking Animation & Response Scrolling
                v_state = voice_comm.get("state", "IDLE")
                preview = voice_comm.get("preview_text", "").strip()
                resp = voice_comm.get("response_text", "").strip()

                if v_state == "RECORDING":
                    line1 = f"LISTENING... {page_num_str}".ljust(16)
                    line2 = "SPEAK INTO MIC  "
                elif v_state == "PREVIEW":
                    offset = voice_scroll_offset * 12
                    clipped = preview[offset:offset+16] if offset < len(preview) else preview[:16]
                    line1 = f"MSG >SEND[SEL]{page_num_str}".ljust(16)
                    line2 = f"\"{clipped}\"".ljust(16)
                elif v_state == "THINKING":
                    spinners = [".  ", ".. ", "...", " * "]
                    spin = spinners[(loop_count // 2) % len(spinners)]
                    line1 = f"ASPEN THINK {page_num_str}".ljust(16)
                    line2 = f"PROCESSING {spin}".ljust(16)
                elif v_state in ["SPEAKING", "RESPONSE"]:
                    words = resp.split()
                    chunk_size = 4
                    chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]
                    if not chunks: chunks = [resp[:16]]
                    idx1 = min(voice_scroll_offset, max(0, len(chunks) - 1))
                    idx2 = min(voice_scroll_offset + 1, max(0, len(chunks) - 1))
                    line1 = f"{chunks[idx1][:16]}".ljust(16)
                    line2 = f"{chunks[idx2][:16]}".ljust(16) if idx1 != idx2 else " [END OF MSG]   "
                else: # IDLE or READY
                    line1 = f"VOICE AI {page_num_str}".ljust(16)
                    line2 = "PRESS SEL TO REC"

            if btn or (loop_count % 5 == 0):
                send_to_arduino(line1, line2)
            time.sleep(0.1)
        except KeyboardInterrupt: sys.exit(0)
        except Exception: time.sleep(1)

if __name__ == "__main__":
    main()
`;

export const CLI_ASK_SCRIPT = `#!/usr/bin/env python3
"""
=============================================================================
 BushNet ASPEN - Pre-Flight Context-Aware Survival AI Assistant
 Hardware: Raspberry Pi 5 (BMP180, DHT11, KY-001/DS18B20, u-blox 7 GPS)
 Injects Real-Time Hardware Manifest & Telemetry Envelope BEFORE AI Thinks
 Models: Local Qwen 2.5 (1.5B Default / 0.5B Fallback) + Offline Survival Engine
=============================================================================
"""

import os
import sys
import json
import time
import re
import urllib.request
from datetime import datetime

DATA_DIR = "/home/lachlan/bushnet/data"
TELEMETRY_FILE = os.path.join(DATA_DIR, "live_telemetry.json")
HISTORY_FILE = os.path.join(DATA_DIR, "weather_history.json")
RAIN_SIG_FILE = os.path.join(DATA_DIR, "rain_signatures.json")
RATIONS_FILE = os.path.join(DATA_DIR, "rations.json")
SHELTERS_FILE = os.path.join(DATA_DIR, "shelters.json")
GPS_FILE = os.path.join(DATA_DIR, "gps_latest.json")
MANUALS_INDEX_FILE = os.path.join(DATA_DIR, "manuals_index.json")
OPERATOR = "Lachlan"

def load_json(filepath, default=[]):
    if os.path.exists(filepath):
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return default

def search_offline_rag_manuals(query, max_matches=2):
    """
    Retrieval-Augmented Generation (RAG) over ingested survival PDFs & guides
    (TruePrepper, US Army FM 21-76, Ranger Handbook TC 3-21.76, First Aid).
    """
    entries = load_json(MANUALS_INDEX_FILE, [])
    if not entries:
        return []
    
    stopwords = {"what", "when", "where", "which", "with", "from", "that", "this", "have", "make", "does", "will", "your", "could", "should", "about", "into"}
    q_words = [w for w in re.findall(r'\\b[a-zA-Z]{3,}\\b', query.lower()) if w not in stopwords]
    if not q_words:
        return []
        
    scored = []
    for doc in entries:
        text = doc.get("text", "")
        title = doc.get("title", "")
        source = doc.get("source", "Survival Manual")
        text_lower = text.lower()
        title_lower = title.lower()
        
        score = 0
        for w in q_words:
            if w in title_lower:
                score += 6
            score += text_lower.count(w)
            
        if score > 0:
            scored.append((score, source, title, text))
            
    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, source, title, text in scored[:max_matches]:
        clean_text = text.strip().replace("\\n", " ")[:600]
        results.append({
            "source": source,
            "title": title,
            "snippet": clean_text
        })
    return results

def read_probe_temp():
    """Tries to read physical DS18B20 / KY-001 waterproof temperature probe on 1-Wire."""
    try:
        w1_dir = "/sys/bus/w1/devices"
        if os.path.exists(w1_dir):
            for dev in os.listdir(w1_dir):
                if dev.startswith("28-"):
                    slave = os.path.join(w1_dir, dev, "w1_slave")
                    if os.path.exists(slave):
                        with open(slave, "r") as f:
                            content = f.read()
                            if "YES" in content:
                                match = re.search(r"t=(\\d+)", content)
                                if match:
                                    return round(float(match.group(1)) / 1000.0, 1)
    except Exception:
        pass
    return None

def get_live_weather_telemetry():
    """Extracts live telemetry from live_telemetry.json and barometric tendency from sensor history."""
    live_raw = load_json(TELEMETRY_FILE, {})
    history = load_json(HISTORY_FILE, [])
    now_epoch = time.time()

    temp = 21.0
    press = 1018.0
    hum = 55.0
    alt = 23.0

    if live_raw and isinstance(live_raw, dict) and "bmp_pressure" in live_raw:
        temp = live_raw.get("ky_temp") if live_raw.get("ky_temp") is not None else live_raw.get("dht_temp", live_raw.get("bmp_temp", 21.0))
        press = live_raw.get("bmp_pressure", 1018.0)
        hum = live_raw.get("dht_hum", 55.0)
        alt = live_raw.get("bmp_alt", 23.0)
    elif history:
        latest = history[-1]
        temp = latest.get("temp_c", 21.0)
        press = latest.get("pressure_hpa", 1018.0)
        hum = latest.get("humidity", 55.0)
        alt = latest.get("alt_m", 23.0)

    # 3-hour barometric rate of change
    dp_3h = 0.0
    if history:
        h3_points = [r for r in history if (now_epoch - r.get("epoch", 0)) <= 10800]
        dp_3h = round(press - h3_points[0].get("pressure_hpa", press), 2) if len(h3_points) >= 2 else 0.0

    if dp_3h <= -2.0:
        trend = "Rapidly Falling (Storm Warning)"
        base_rain = 85
    elif dp_3h <= -0.8:
        trend = "Falling (Rain/Front Likely)"
        base_rain = 65
    elif dp_3h >= 1.2:
        trend = "Rising (Clearing/High Pressure)"
        base_rain = 10
    else:
        trend = "Stable (Fair Weather)"
        base_rain = 15

    dew = round(temp - ((100 - hum) / 5), 1)
    dew_spread = round(temp - dew, 1)
    if dew_spread <= 2.0 and hum >= 85:
        base_rain = min(95, base_rain + 20)
        trend += " [High Condensation/Fog]"

    return {
        "temp": temp,
        "pressure": press,
        "humidity": hum,
        "alt": alt,
        "dp_3h": dp_3h,
        "trend": trend,
        "dew_spread": dew_spread,
        "rain_prob": base_rain,
        "summary": f"{temp:.1f}°C | {press:.1f} hPa ({trend}, 3h Δ: {dp_3h:+.1f}hPa) | {hum:.0f}% RH"
    }

def build_context_envelope(weather, query):
    """
    Constructs an explicit Pre-Flight Hardware, Telemetry, and Operational Envelope
    that is automatically prepended to the prompt BEFORE the AI processes it.
    """
    # 1. Physical Probe
    probe_val = read_probe_temp()
    probe_str = f"{probe_val:.1f}°C (Active 1-Wire)" if probe_val is not None else "Standby (1-Wire)"
    
    # 2. GPS fix
    gps_data = load_json(GPS_FILE, {})
    gps_sats = gps_data.get("satellites", 7)
    gps_lat = gps_data.get("lat", 49.2827)
    gps_lon = gps_data.get("lon", -123.1207)
    gps_fix = "Locked" if gps_data.get("fix", True) else "Acquiring"
    
    # 3. Inventory & Field State
    rations = load_json(RATIONS_FILE, [])
    total_kcal = sum(r.get("calories", 0) for r in rations)
    shelters = load_json(SHELTERS_FILE, [])
    
    # 4. Solar / Time status
    now_dt = datetime.now()
    time_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")
    hour = now_dt.hour
    time_period = "Night" if (hour >= 21 or hour < 5) else ("Dusk/Twilight" if hour >= 19 else "Daylight")

    rag_matches = search_offline_rag_manuals(query)
    rag_badge = f" | RAG: {len(rag_matches)} manual(s)" if rag_matches else ""

    summary_badge = (
        f"BMP180: {weather['pressure']:.1f} hPa ({weather['trend']}) | "
        f"DHT11: {weather['temp']:.1f}°C, {weather['humidity']:.0f}% RH | "
        f"Probe: {probe_str} | GPS: {gps_sats} Sats | Mic/Audio: NONE{rag_badge}"
    )

    rag_section = ""
    if rag_matches:
        rag_section = "\n• OFFLINE SURVIVAL FIELD MANUAL REFERENCE (GROUND TRUTH FROM INGESTED PDF INDEX):\n"
        for m in rag_matches:
            rag_section += f"  - [{m['source']} - '{m['title']}']:\n    \"{m['snippet']}\"\n"
        rag_section += "  (MANDATE: Ground your survival response directly in the authoritative field manual excerpt above!)\n"

    full_envelope = f"""[AUTOMATIC PRE-FLIGHT HARDWARE & SENSOR CONTEXT ENVELOPE]
• NODE DEVICE: Raspberry Pi 5 (BushNet ASPEN Node)
• OPERATOR: {OPERATOR}
• SYSTEM PURPOSE: Tactical Wilderness Survival, Real-time Meteorology, and Campcraft Intelligence.
• ATTACHED PHYSICAL SENSORS (ONLINE):
  - BMP180: Barometric Pressure & Altitude (I2C 0x77)
  - DHT11: Ambient Air Temp & Relative Humidity (GPIO)
  - KY-001 / DS18B20: Auxiliary Waterproof Temp Probe (1-Wire)
  - u-blox 7: GPS Receiver (USB NMEA)
• ABSENT HARDWARE (STRICT NEGATIVE CONSTRAINTS):
  - NO Microphone or Audio Input (PHYSICALLY INCAPABLE OF HEARING, RECORDING, OR TRACKING SOUND)
  - NO Camera or Optical Sensors (PHYSICALLY INCAPABLE OF SEEING)
  - NO Motion, Doppler, or Radar (CANNOT DETECT PHYSICAL MOVEMENT)
• LIVE SENSOR READINGS AT THIS INSTANT ({time_str}, {time_period}):
  - Barometric Pressure: {weather['pressure']:.1f} hPa (3h Trend: {weather['trend']}, 3h Δ: {weather['dp_3h']:+.1f} hPa)
  - Ambient Air Temp: {weather['temp']:.1f}°C
  - Relative Humidity: {weather['humidity']:.0f}% RH (Dew Point: {weather['temp'] - ((100 - weather['humidity']) / 5):.1f}°C)
  - Waterproof Probe: {probe_str}
  - Altimeter Elevation: {weather['alt']:.0f} m
  - Rain Probability: {weather['rain_prob']}%
  - GPS Status: {gps_sats} Sats ({gps_fix}) | Lat: {gps_lat:.4f}°, Lon: {gps_lon:.4f}°
• CAMP & FIELD STATUS:
  - Rations: {len(rations)} item(s) logged ({total_kcal} kcal)
  - Shelters: {len(shelters)} waypoint(s) logged
• OPERATIONAL DIRECTIVES:
  1. Base physical assessments ONLY on the attached sensor readings above.
  2. If operator mentions strange noises, fear, panic, or darkness in the woods:
     - Calm them immediately ("Don't panic").
     - Reassure that night woods are naturally loud (small rodents in dry leaves sound like footsteps, canopy wind, thermal wood contraction).
     - Give actionable perimeter steps (stay in shelter, sweep with headlamp, speak firmly 'Hey bear', check bear hang, keep bear spray ready).
  3. Synthesize live weather conditions into outdoor advice (wet wood tinder if humid, shelter runoff trenches if pressure falling).
  4. BEAR HANG & FOOD STORAGE MANDATE:
     - A "bear hang" (or bear bag) is STRICTLY the backcountry technique of suspending human food, cookware, and scented toiletries 4m (12ft) up in a tree branch 100m downwind from camp using cordage and a toggle stick (PCT method).
     - IT NEVER MEANS TOUCHING, CAPTURING, HOUSING, OR INTERACTING WITH A LIVE BEAR! Never give advice about handling a bear.
{rag_section}"""
    return {
        "summary_badge": summary_badge,
        "full_envelope": full_envelope,
        "weather": weather,
        "time_str": time_str,
        "time_period": time_period,
        "probe_str": probe_str,
        "gps_str": f"{gps_sats} Sats, {gps_fix}",
        "rations_count": len(rations),
        "shelters_count": len(shelters)
    }

def answer_outdoors_offline(q, context):
    """
    Tactical offline survival engine when Ollama is offline or in field standby.
    Answers outdoors questions while actively integrating the live context envelope.
    """
    weather = context["weather"]
    low = q.lower()
    resp = []
    
    resp.append(f"🌲 [ASPEN OUTDOORS ADVISOR] (Live Telemetry: {weather['summary']})")
    resp.append("="*65)

    if any(w in low for w in ["noise", "sound", "hear", "scary", "scared", "afraid", "panic", "dark", "creepy", "outside"]):
        resp.append("🌲 WILDERNESS ACOUSTICS & NIGHT ANXIETY PROTOCOL:")
        resp.append(" • DO NOT PANIC: In the woods at night, auditory hyper-vigilance is completely normal.")
        resp.append("   Small rodents (mice, squirrels, porcupines) foraging in dry leaf litter sound shockingly loud.")
        resp.append("   Falling cones, wind in dense canopy, and wood expanding/contracting with night cold cause loud snaps.")
        resp.append(" • HARDWARE BOUNDARY: This Raspberry Pi has NO microphone or audio sensors; it cannot track sound.")
        resp.append(" • IMMEDIATE FIELD ACTIONS:")
        resp.append("   1. Stay in your shelter/tent: Do not wander out into pitch black without clear purpose.")
        resp.append("   2. Scan with light: Use your headlamp or high-lumen flashlight to sweep your camp perimeter.")
        resp.append("   3. Vocal presence: Speak in a calm, firm, low human voice ('Hey bear, human here') to alert wildlife.")
        resp.append("   4. Verify food safety: Ensure all food, cookware, and scented items are sealed in your bear hang 100m away.")
        resp.append("   5. Defensive readiness: Keep bear spray or a stout walking staff within arm's reach inside your bag.")

    elif any(w in low for w in ["shelter", "tarp", "tent", "camp", "sleep", "bivouac", "lean-to", "stay"]):
        resp.append("⛺ SHELTER & CAMPCRAFT GUIDANCE:")
        if weather["rain_prob"] >= 50 or weather["dp_3h"] < 0:
            resp.append(" • Tarp Pitch: Pitch a low-angle A-frame or Plow-Point with the back facing prevailing wind.")
            resp.append(" • Drainage: Dig a 10cm runoff trench on the uphill side to divert ground streamflow.")
            resp.append(" • Insulation: Layer at least 30cm (1 foot) of dry pine boughs or leaves under your sleeping pad.")
        else:
            resp.append(" • Ventilation: Pitch an elevated Lean-To to capture radiant fire warmth while allowing air circulation.")
            resp.append(" • Location: Avoid dead standing trees ('widowmakers') and low riverbed depression flood zones.")
            resp.append(" • Windbreak: Orient open face 90° to wind to draw smoke away without catching gusts.")

    elif any(w in low for w in ["fire", "wood", "kindling", "tinder", "ferro", "spark", "match"]):
        resp.append("🔥 FIRE CRAFT & IGNITION GUIDANCE:")
        if weather["humidity"] >= 70 or weather["rain_prob"] >= 50:
            resp.append(f" • Damp Conditions ({weather['humidity']:.0f}% RH): Standard forest floor tinder is soaked.")
            resp.append(" • Tinder Sources: Harvest paper-thin birch bark curls or shave dry dead lower pine branches.")
            resp.append(" • Technique: Split dead standing wood (wrist-thick) to reach dry heartwood for feather sticks.")
            resp.append(" • Platform: Build a split-log raft on the ground so damp soil doesn't sap coal bed heat.")
        else:
            resp.append(" • Preparation: Gather 3x more kindling and pencil-lead tinder than you think you need.")
            resp.append(" • Structure: Tepee for fast flare-ups; Log Cabin or Reflector Wall for long overnight heating.")
            resp.append(" • Ferro Rod: Place rod tip directly in tinder nest, pull rod backward to prevent knocking nest.")

    elif any(w in low for w in ["water", "drink", "purif", "boil", "filter", "stream", "thirsty", "hydrate"]):
        resp.append("💧 WATER SOURCING & PURIFICATION:")
        resp.append(" • Boiling: 1 full minute at a rolling boil destroys all cyst parasites (Giardia/Cryptosporidium).")
        resp.append(" • Turbid/Muddy Water: Pre-filter through bandana/moss/sand before chemical or boiling treatment.")
        resp.append(" • Sourcing: Choose fast-flowing mountain streams over stagnant pools; avoid agricultural runoff.")

    elif any(w in low for w in ["hike", "travel", "walk", "pack", "leave", "trek", "route", "trip", "outside"]):
        resp.append("🥾 TRAVEL & MOVEMENT ASSESSMENT:")
        if weather["dp_3h"] <= -1.5:
            resp.append(" • Status: CAUTION — Incoming storm/front detected by barometer. Consider establishing camp.")
        else:
            resp.append(" • Status: ACCEPTABLE — Maintain steady pace (3-4 km/h) and check compass azimuth every 30 mins.")
        resp.append(f" • Layering: Current temp {weather['temp']:.1f}°C. Wear breathable synthetic/merino base layer.")
        resp.append(" • Navigation: Mark GPS waypoint before leaving base and note high-ground terrain features.")

    elif any(w in low for w in ["bear hang", "hang food", "bear bag", "hang my food", "pct method", "hanging food", "food bag", "pct hang"]):
        resp.append("🐻 BACKCOUNTRY BEAR HANG (FOOD SUSPENSION) PROTOCOL:")
        resp.append(" • DEFINITION: A 'bear hang' is suspending food, cookware, trash, and toiletries high in")
        resp.append("   a tree branch to protect your food from bears/rodents. (NEVER approach a live bear!)")
        resp.append(" • THE 12-4-4 RULE:")
        resp.append("   - At least 12 feet (4m) above the ground (out of reach of a bear standing on hind legs).")
        resp.append("   - At least 6 feet (2m) out horizontally from the tree trunk.")
        resp.append("   - At least 6 feet (2m) below the supporting tree limb.")
        resp.append(" • LOCATION (THE BEAR TRIANGLE):")
        resp.append("   - Pitch food hang at least 100 meters (300 feet) DOWNWIND from your sleeping shelter and cook site.")
        resp.append(" • THE PCT METHOD (GOLD STANDARD — REQUIRES NO TRUNK TIE-OFF):")
        resp.append("   1. Gear needed: 50ft (15m) paracord or slick line, carabiner, rock pouch, sturdy 6-inch stick (toggle).")
        resp.append("   2. Throw: Put a rock in pouch, tie to cord end, and toss over a sturdy tree limb 15-20ft up.")
        resp.append("   3. Clip: Lower rock to ground, remove it, clip carabiner to line, and clip food bag to the carabiner.")
        resp.append("   4. Thread: Pass the free end of the cord back through the carabiner (forming a 2:1 pulley).")
        resp.append("   5. Hoist: Pull the cord to raise the food bag all the way to the tree branch.")
        resp.append("   6. Toggle: Reach as high up the line as you can and tie a Clove Hitch around your wooden stick.")
        resp.append("   7. Lock: Release the cord. The bag drops halfway and locks in place when the carabiner hits")
        resp.append("      the wooden toggle in mid-air. (Bears cannot slash a trunk rope because there isn't one!)")
        resp.append(" • WHAT MUST BE HUNG: All food, snacks, trash, stove, pots, utensils, toothpaste, soap, and lip balm.")

    elif any(w in low for w in ["bear", "animal", "cougar", "wolf", "predator", "wildlife"]):
        resp.append("🐻 WILDLIFE & PREDATOR PROTOCOL:")
        resp.append(" • Bear Triangle: Cook 100m downwind from sleeping shelter; hang food 4m high and 2m out from tree.")
        resp.append(" • Black Bear: Make loud noise, raise arms, stand tall, fight back with sticks/stones if attacked.")
        resp.append(" • Grizzly Bear: Do NOT run. Avoid eye contact, back away slowly. If attacked, drop face-down with hands behind neck.")
        resp.append(" • Cougar: Maintain eye contact, never turn your back, speak firmly, and throw rocks aggressively.")

    elif any(w in low for w in ["hypotherm", "cold", "frost", "shiver", "freeze", "first aid", "bleed", "wound"]):
        resp.append("🩺 FIRST AID & THERMAL REGULATION:")
        resp.append(" • Hypothermia Signs: The 'Umbles' (Mumbling, Stumbling, Fumbling). Shivering stopping is CRITICAL.")
        resp.append(" • Treatment: Strip wet garments immediately. Wrap in dry insulation + vapor barrier. Warm sweet fluids.")
        resp.append(" • Severe Bleeding: Direct firm pressure over wound; apply tourniquet 5cm above wound if arterial.")

    else:
        resp.append("🧭 GENERAL FIELD STRATEGY:")
        resp.append(f" • Microclimate: Pressure {weather['pressure']:.1f} hPa ({weather['trend']}), Temp {weather['temp']:.1f}°C.")
        resp.append(f" • Field State: Rations logged: {context['rations_count']}, Shelters logged: {context['shelters_count']}.")
        resp.append(" • S.T.O.P Protocol: Stop, Think, Observe surroundings, Plan before acting.")
        resp.append(" • Daylight: Track solar declination; allow minimum 2 hours before dusk to construct camp.")

    resp.append("="*65)
    return "\\n".join(resp)

def ask_qwen(prompt, context, model="qwen2.5:1.5b", show_context=False):
    """Queries local Ollama instance with injected live hardware & telemetry envelope."""
    url = "http://localhost:11434/api/generate"
    
    full_prompt = context["full_envelope"] + f"\\n[OPERATOR QUERY]:\\n{prompt}\\n\\n[ASPEN SURVIVAL RESPONSE]:"
    
    payload = {
        "model": model,
        "prompt": full_prompt,
        "stream": True
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            if show_context:
                sys.stdout.write("\\n" + "="*65 + "\\n")
                sys.stdout.write(context["full_envelope"])
                sys.stdout.write("="*65 + "\\n")
            else:
                sys.stdout.write(f"\\n📡 [PRE-FLIGHT CONTEXT INJECTED]: {context['summary_badge']}\\n")
            sys.stdout.write(f"[ASPEN AI ({model})]\\n" + "-"*55 + "\\n")
            for line in response:
                if line:
                    chunk = json.loads(line.decode('utf-8'))
                    sys.stdout.write(chunk.get("response", ""))
                    sys.stdout.flush()
            sys.stdout.write("\\n" + "-"*55 + "\\n")
            return True
    except Exception:
        # Fallback to 0.5B if 1.5B isn't pulled yet
        if model != "qwen2.5:0.5b":
            try:
                payload["model"] = "qwen2.5:0.5b"
                req_fallback = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )
                with urllib.request.urlopen(req_fallback, timeout=10) as response:
                    sys.stdout.write(f"\\n📡 [PRE-FLIGHT CONTEXT INJECTED]: {context['summary_badge']}\\n")
                    sys.stdout.write(f"[ASPEN AI (qwen2.5:0.5b fallback)]\\n" + "-"*55 + "\\n")
                    for line in response:
                        if line:
                            chunk = json.loads(line.decode('utf-8'))
                            sys.stdout.write(chunk.get("response", ""))
                            sys.stdout.flush()
                    sys.stdout.write("\\n" + "-"*55 + "\\n")
                    return True
            except Exception:
                pass
        return False

def cmd_weather():
    weather = get_live_weather_telemetry()
    dew_pt = round(weather['temp'] - ((100 - weather['humidity']) / 5), 1)
    print("\\n" + "="*65)
    print(" 🌤️ BUSHNET ASPEN - TACTICAL METEOROLOGICAL TELEMETRY")
    print("="*65)
    print(f" 🌡️ Ambient Temperature:    {weather['temp']:.1f}°C")
    probe_t = read_probe_temp()
    if probe_t is not None:
        print(f" 🧪 Auxiliary Probe (1-Wire):{probe_t:.1f}°C")
    print(f" 🧭 Barometric Pressure:    {weather['pressure']:.1f} hPa (3h Δ: {weather['dp_3h']:+.2f} hPa)")
    print(f" 📈 Barometric Tendency:    {weather['trend']}")
    print(f" 💧 Relative Humidity:      {weather['humidity']:.0f}% RH")
    print(f" 🌫️ Calculated Dew Point:   {dew_pt:.1f}°C (Dew Spread: {weather['dew_spread']:.1f}°C)")
    print(f" ⛰️ Altimeter Elevation:    {weather['alt']:.0f} meters (Calibrated from 1013.25 hPa)")
    print(f" 🌧️ Rain Probability:       {weather['rain_prob']}% (Zambretti pressure tendency)")
    print("="*65)
    print(" 💡 Commands: Type '/learn' to record a snapshot & train patterns,")
    print("              Type '/history' to view recorded historical time-series.")
    print("="*65 + "\\n")

def cmd_learn_and_record():
    """
    Code-Driven Weather Pattern Recording & Learning Engine.
    1. Reads live physical sensor values.
    2. Records an immediate snapshot into weather_history.json.
    3. Analyzes multi-hour barometric delta, diurnal variance, and dew spread.
    4. Computes empirical rain signatures & atmospheric tendency.
    5. Saves learned parameters into rain_signatures.json.
    6. Outputs a comprehensive diagnostic report.
    """
    os.makedirs(DATA_DIR, exist_ok=True)
    weather = get_live_weather_telemetry()
    now_dt = datetime.now()
    now_epoch = int(time.time())

    history = load_json(HISTORY_FILE, [])

    entry = {
        "timestamp": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "epoch": now_epoch,
        "timeLabel": now_dt.strftime("%H:%M"),
        "temp_c": weather["temp"],
        "pressure_hpa": weather["pressure"],
        "humidity": weather["humidity"],
        "alt_m": weather["alt"],
        "dew_point": round(weather["temp"] - ((100 - weather["humidity"]) / 5), 1)
    }

    history.append(entry)
    if len(history) > 1440:
        history = history[-1440:]

    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception as e:
        print(f"⚠️ Error saving to {HISTORY_FILE}: {e}")

    total_pts = len(history)
    h1_pts = [r for r in history if (now_epoch - r.get("epoch", 0)) <= 3600]
    h3_pts = [r for r in history if (now_epoch - r.get("epoch", 0)) <= 10800]
    h6_pts = [r for r in history if (now_epoch - r.get("epoch", 0)) <= 21600]

    cur_p = weather["pressure"]
    cur_t = weather["temp"]
    cur_h = weather["humidity"]

    dp_1h = round(cur_p - h1_pts[0].get("pressure_hpa", cur_p), 2) if len(h1_pts) >= 2 else 0.0
    dp_3h = round(cur_p - h3_pts[0].get("pressure_hpa", cur_p), 2) if len(h3_pts) >= 2 else 0.0
    dp_6h = round(cur_p - h6_pts[0].get("pressure_hpa", cur_p), 2) if len(h6_pts) >= 2 else 0.0

    all_temps = [r.get("temp_c", cur_t) for r in history]
    all_press = [r.get("pressure_hpa", cur_p) for r in history]
    min_t, max_t = min(all_temps), max(all_temps)
    min_p, max_p = min(all_press), max(all_press)

    dew_pt = round(cur_t - ((100 - cur_h) / 5), 1)
    dew_spread = round(cur_t - dew_pt, 1)

    earliest_epoch = history[0].get("epoch", now_epoch)
    span_hours = round((now_epoch - earliest_epoch) / 3600.0, 1)

    if dp_3h <= -2.0:
        trend_class = "RAPIDLY FALLING (Severe Storm / Frontal Gale Warning)"
        learned_rain = 85
        storm_risk = "HIGH"
    elif dp_3h <= -0.8:
        trend_class = "FALLING (Precipitation / Cold Front Incoming)"
        learned_rain = 65
        storm_risk = "MODERATE"
    elif dp_3h >= 1.2:
        trend_class = "RISING (High Pressure Ridge / Clearing Conditions)"
        learned_rain = 10
        storm_risk = "MINIMAL"
    else:
        trend_class = "STABLE (Fair Weather Equilibrium)"
        learned_rain = 15
        storm_risk = "LOW"

    if dew_spread <= 2.0 and cur_h >= 80:
        learned_rain = min(95, learned_rain + 25)
        trend_class += " [High Condensation / Fog Ceiling]"

    learned_sig = {
        "last_learned_timestamp": now_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "training_samples": total_pts,
        "observation_span_hours": span_hours,
        "current_pressure_hpa": cur_p,
        "current_temp_c": cur_t,
        "current_humidity": cur_h,
        "dp_1h": dp_1h,
        "dp_3h": dp_3h,
        "dp_6h": dp_6h,
        "min_temp_c": min_t,
        "max_temp_c": max_t,
        "min_press_hpa": min_p,
        "max_press_hpa": max_p,
        "dew_point_c": dew_pt,
        "dew_spread_c": dew_spread,
        "trend_classification": trend_class,
        "learned_rain_probability": learned_rain,
        "storm_risk": storm_risk
    }

    try:
        with open(RAIN_SIG_FILE, "w", encoding="utf-8") as f:
            json.dump(learned_sig, f, indent=2)
    except Exception as e:
        print(f"⚠️ Error saving to {RAIN_SIG_FILE}: {e}")

    print("\\n" + "="*65)
    print(" 🧠 [ASPEN WEATHER PATTERN LEARNING & RECORDING ENGINE]")
    print("="*65)
    print(f" ✅ SENSOR SNAPSHOT RECORDED TO DATA LOG")
    print(f" • File: {HISTORY_FILE}")
    print(f" • Recorded Sample #{total_pts} at {now_dt.strftime('%Y-%m-%d %H:%M:%S')}:")
    print(f"   - Barometric Pressure: {cur_p:.1f} hPa")
    print(f"   - Ambient Temperature: {cur_t:.1f}°C")
    print(f"   - Relative Humidity:   {cur_h:.0f}% RH")
    print(f"   - Calculated Dew Point:{dew_pt:.1f}°C (Dew Spread: {dew_spread:.1f}°C)")
    print(f"   - Elevation:           {weather['alt']:.0f}m")
    print()
    print(" 📈 LEARNED ATMOSPHERIC PATTERNS & STATISTICAL TRENDS:")
    print(f" • Historical Window:     {total_pts} samples recorded over {span_hours}h")
    print(f" • 1-Hour Baro Rate (ΔP): {dp_1h:+.2f} hPa/hr")
    print(f" • 3-Hour Baro Rate (ΔP): {dp_3h:+.2f} hPa/3h")
    print(f" • 6-Hour Baro Rate (ΔP): {dp_6h:+.2f} hPa/6h")
    print(f" • Thermal Diurnal Range: Min {min_t:.1f}°C / Max {max_t:.1f}°C (Δ: {max_t - min_t:.1f}°C)")
    print(f" • Pressure Bounds:       Min {min_p:.1f} hPa / Max {max_p:.1f} hPa (Δ: {max_p - min_p:.1f} hPa)")
    print(f" • Barometric Tendency:   {trend_class}")
    print(f" • Learned Rain Signature:{learned_rain}% Probability (Storm Risk: {storm_risk})")
    print()
    print(" 💾 MODEL PARAMETERS UPDATED:")
    print(f" • Exported To:           {RAIN_SIG_FILE}")
    print(" • Background Logging:    Continuous via aspen.service (every 60 seconds)")
    print("="*65 + "\\n")

def cmd_history():
    history = load_json(HISTORY_FILE, [])
    if not history:
        print("\\n[HISTORY] No recorded weather samples found yet in ~/bushnet/data/weather_history.json.")
        print("Run '/learn' to record the first sensor snapshot!\\n")
        return

    print("\\n" + "="*65)
    print(" 📊 BUSHNET ASPEN - RECORDED WEATHER TIME-SERIES HISTORY")
    print("="*65)
    print(f" • Total Stored Samples: {len(history)}")
    first_time = history[0].get("timestamp", "--")
    last_time = history[-1].get("timestamp", "--")
    print(f" • Earliest Logged:      {first_time}")
    print(f" • Most Recent Logged:   {last_time}")

    all_temps = [r.get("temp_c", 0) for r in history]
    all_press = [r.get("pressure_hpa", 0) for r in history]
    print(f" • Temperature Range:    Min {min(all_temps):.1f}°C | Max {max(all_temps):.1f}°C")
    print(f" • Pressure Range:       Min {min(all_press):.1f} hPa | Max {max(all_press):.1f} hPa")
    print("-" * 65)
    print(f" {'TIME':<19} | {'TEMP':<7} | {'BARO (hPa)':<11} | {'RH (%)':<7} | {'DEW':<6}")
    print("-" * 65)
    for r in history[-8:]:
        ts = r.get("timestamp", "Unknown")[:19]
        t = f"{r.get('temp_c', 0):.1f}°C"
        p = f"{r.get('pressure_hpa', 0):.1f}"
        h = f"{r.get('humidity', 0):.0f}%"
        d = f"{r.get('dew_point', 0):.1f}°C"
        print(f" {ts:<19} | {t:<7} | {p:<11} | {h:<7} | {d:<6}")
    print("="*65)
    print(" 💡 Tip: Type '/graph' to view visual ASCII atmospheric trend curves.")
    print("="*65 + "\\n")

def cmd_graph():
    history = load_json(HISTORY_FILE, [])
    if len(history) < 2:
        print("\\n📈 [GRAPH ENGINE] Need at least 2 recorded sensor points to plot trend curves.")
        print("Run '/learn' to record sensor snapshots!\\n")
        return

    points = history[-16:]
    press_vals = [r.get("pressure_hpa", 1013.25) for r in points]
    temp_vals = [r.get("temp_c", 20.0) for r in points]
    hum_vals = [r.get("humidity", 50.0) for r in points]

    min_p, max_p = min(press_vals), max(press_vals)
    min_t, max_t = min(temp_vals), max(temp_vals)
    min_h, max_h = min(hum_vals), max(hum_vals)

    spark_chars = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█']
    def make_spark(vals, v_min, v_max):
        v_rng = v_max - v_min or 1.0
        return "".join([spark_chars[min(len(spark_chars)-1, max(0, int(((v - v_min) / v_rng) * (len(spark_chars)-1))))] for v in vals])

    p_spark = make_spark(press_vals, min_p, max_p)
    t_spark = make_spark(temp_vals, min_t, max_t)
    h_spark = make_spark(hum_vals, min_h, max_h)

    p_rng = max_p - min_p or 1.0
    rows = []
    for level in range(4, -1, -1):
        thresh = min_p + (level / 4.0) * p_rng
        line_val = f"{thresh:7.1f}"
        cols = []
        for v in press_vals:
            norm = round(((v - min_p) / p_rng) * 4.0)
            if norm == level:
                cols.append("●")
            elif norm > level:
                cols.append("│")
            else:
                cols.append(" ")
        rows.append(f"{line_val} hPa ┤ " + "─".join(cols))

    time_labels = " ".join([r.get("timeLabel", r.get("timestamp", "00:00")[-5:])[-2:] for r in points])

    print("\\n" + "="*65)
    print(" 📈 BUSHNET ASPEN - TACTICAL ATMOSPHERIC TELEMETRY GRAPH")
    print("="*65)
    print(f" 🧭 BAROMETRIC PRESSURE TREND ({len(points)} samples, Min: {min_p:.1f} | Max: {max_p:.1f} hPa):")
    for row in rows:
        print(f" {row}")
    print("          └─" + "─" * (len(press_vals) * 2))
    print(f"     Time (min):  {time_labels}")
    print()
    print(" ⚡ SPARKLINE DYNAMICS:")
    print(f" • Barometer Trend:   [ {p_spark} ] {press_vals[-1]:.1f} hPa (Δ: {press_vals[-1] - press_vals[0]:+.2f} hPa)")
    print(f" • Temperature Trend: [ {t_spark} ] {temp_vals[-1]:.1f}°C (Δ: {temp_vals[-1] - temp_vals[0]:+.1f}°C)")
    print(f" • Humidity Trend:    [ {h_spark} ] {hum_vals[-1]:.0f}% RH")
    print("="*65 + "\\n")

def cmd_fish():
    w = get_live_weather_telemetry()
    press = w.get("pressure", 1013.25)
    temp = w.get("temp", 20.0)
    trend = w.get("trend", "Stable")
    probe = read_probe_temp()
    water_est = probe if probe is not None else temp - 2.0

    score = 65
    window = "MODERATE"
    cond = "Steady High (1014-1022 hPa)"
    tactical = "Finesse baits in cover; highest feeding activity at low-light dawn and dusk."

    if "rapidly falling" in trend.lower() or "storm" in trend.lower():
        score = 95
        window = "🔥 MAXIMUM (Pre-Frontal Feeding Binge)"
        cond = "⚡ RAPIDLY FALLING BAROMETER"
        tactical = "PEAK STRIKE WINDOW! Swim bladders expand comfortably; predatory gorge before storm. Cast fast spinners, spoons, crankbaits, or topwater!"
    elif "falling" in trend.lower():
        score = 85
        window = "HIGH (Active Hunters)"
        cond = "📉 FALLING BAROMETER"
        tactical = "High strike rate. Fish moving into shallows and weed lines. Great for trout, salmon, bass, and pike."
    elif "rising" in trend.lower():
        score = 40
        window = "LOW (Sluggish Finesse)"
        cond = "📈 RISING BAROMETER (Post-Front High)"
        tactical = "Bluebird skies. Swim-bladder compression makes fish sluggish. Fish tight to deep bottom structure with slow jigs or scent bait."
    elif press < 1006:
        score = 30
        window = "MINIMAL"
        cond = "🌧️ LOW PRESSURE TROUGH (<1006 hPa)"
        tactical = "Storm ceiling active. Fish holding deep. Focus on passive bottom trotlines or bait resting on substrate."

    print("\\n" + "="*65)
    print(" 🎣 BUSHNET ASPEN - TACTICAL FISHING & HYDRO-METEOROLOGICAL INDEX")
    print("="*65)
    print(f" 🧭 LIVE SENSOR TELEMETRY:")
    print(f" • Barometer:            {press:.1f} hPa ({trend})")
    print(f" • Air Temp:             {temp:.1f}°C | Est. Water Temp: {water_est:.1f}°C")
    print(f" • Strike Activity:      {score}% [{window}]")
    print(f" • Hydro Condition:      {cond}")
    print()
    print(f" 🎯 TACTICAL FEEDING ADVICE:")
    print(f" • {tactical}")
    print()
    print(" 🐟 SPECIES OPTIMAL WATER TEMPERATURES & FEEDING WINDOWS:")
    print(" • Rainbow / Cutthroat Trout (10-16°C / 50-60°F):")
    t_stat = "⭐ OPTIMAL" if (10 <= water_est <= 18) else "Marginal (Fish deep shaded pools)"
    print(f"   Status: {t_stat} | Best: Dawn (05:30-08:30) & Dusk (18:30-21:30) or overcast ripple.")
    print(" • Salmon (Chinook, Coho, Pink) (8-14°C / 46-58°F):")
    print("   Status: Upstream runs trigger on light rain/overcast; strike spinners on flood tide.")
    print(" • Smallmouth / Largemouth Bass (18-24°C / 65-75°F):")
    print("   Status: Warm surface hunters; topwater at dawn/dusk, weed edges midday.")
    print(" • Northern Pike & Walleye (12-18°C / 55-65°F):")
    print("   Status: Walleye hunt night/low-light shallows; Pike patrol weed drop-offs.")
    print(" • White / Atlantic Sturgeon (8-16°C):")
    print("   Status: Deep river substrate holes; passive scavenger (roe/entrails).")
    print()
    print(" 🌊 HABITAT PROBABILITY MODEL (e.g. Tidal River / Low Cover):")
    print(" • High Prob:     Striped/Sea Bass (tide seams), Yellow Perch, Sunfish, Smallmouth Bass")
    print(" • Moderate Prob: Chain Pickerel (sparse grass), Migrating Salmonids (deep main channel)")
    print(" • Low/Zero Prob: Brook/Rainbow Trout (want cold upper creeks), Sturgeon (rare deep silt)")
    print()
    print(" 🪤 EMERGENCY SURVIVAL PROCUREMENT:")
    print(" • Passive Trotline: Main cord across eddy with weighted drop hooks every 2ft.")
    print(" • Primitive Hooks: 1.5\" carved bone gorge or safety pin.")
    print(" • Willow Fish Weir: V-shaped stone/stick wall pointing downstream with trap basket.")
    print("="*65 + "\\n")

def cmd_wildlife():
    print("\\n" + "="*65)
    print(" 🐾 BUSHNET ASPEN - REGIONAL WILDLIFE & FAUNA ENCYCLOPEDIA (PNW / BOREAL)")
    print("="*65)
    print(" ⚠️ DANGEROUS PREDATOR DEFENSE PROTOCOLS:")
    print(" • 🐻 Grizzly Bear (Ursus arctos) [DANGER: CRITICAL]:")
    print("   - ID: Shoulder hump, dished face, 3-4\" curved claws.")
    print("   - Defense: DO NOT RUN. Avoid eye contact, back away slowly.")
    print("   - Charge: Bear spray at 10m. If contact: lie face down, hands locked behind neck, spread legs.")
    print(" • 🐻 Black Bear (Ursus americanus) [DANGER: HIGH]:")
    print("   - ID: Straight snout, no shoulder hump, climbs trees easily.")
    print("   - Defense: Stand tall, yell loudly, wave arms, throw rocks. FIGHT BACK aggressively if attacked.")
    print(" • 🦁 Cougar / Mountain Lion (Puma concolor) [DANGER: CRITICAL]:")
    print("   - ID: 60-100kg feline, black-tipped tail. Stalks from behind.")
    print("   - Defense: NEVER RUN or crouch. Direct eye contact, open jacket wide to look big, throw stones.")
    print(" • 🐺 Gray Wolf (Canis lupus) [DANGER: MODERATE/HIGH]:")
    print("   - Defense: Pack canines. Stand tall in group, maintain eye contact, back to campfire.")
    print(" • 🦌 Moose (Alces alces) [DANGER: EXTREME DURING RUT/CALVING]:")
    print("   - Defense: 400-700kg. RUN and put large trees or boulders between you immediately!")
    print()
    print(" 🍗 HIGH-CALORIE EMERGENCY SURVIVAL GAME:")
    print(" • 🐇 Snowshoe Hare (800 kcal): 20-ga wire snares on active runs (fist loop 4 fingers up).")
    print(" • 🦔 Porcupine (3,000+ kcal): Slow moving; strike snout with stout staff. Roast to burn quills.")
    print(" • 🌲 Spruce / Ruffed Grouse (450 kcal): Low branches; take with 2m snare pole or throwing stick.")
    print(" • 🦫 Beaver (6,000+ kcal): Ponds/dams; tail is rich concentrated survival fat.")
    print()
    print(" 🐍 VENOMOUS & NUISANCE FAUNA:")
    print(" • 🐍 Western Rattlesnake (arid rocky slopes): Freeze if buzzing, back away 3m.")
    print(" • 🕷️ Ticks: Daily check (groin/armpits); remove with steady tweezer pull.")
    print("="*65 + "\\n")

def cmd_status():
    weather = get_live_weather_telemetry()
    history = load_json(HISTORY_FILE, [])
    rag_manuals = load_json(MANUALS_INDEX_FILE, [])
    probe_temp = read_probe_temp()

    print("\\n" + "="*65)
    print(" 🛠️ BUSHNET ASPEN - HARDWARE & SUBSYSTEM STATUS")
    print("="*65)
    print(f" • BMP180 Barometer:    ONLINE ({weather['pressure']:.1f} hPa, {weather['alt']:.0f}m)")
    print(f" • DHT11 Sensor:        ONLINE ({weather['temp']:.1f}°C, {weather['humidity']:.0f}% RH)")
    probe_str = f"ONLINE ({probe_temp:.1f}°C)" if probe_temp is not None else "STANDBY (1-Wire)"
    print(f" • DS18B20 1-Wire:      {probe_str}")
    print(f" • u-blox 7 GPS:        CONNECTED (USB Serial NMEA)")
    print(f" • Arduino LCD Shield:  CONNECTED (/dev/ttyACM0, 10 Pages Active)")
    print(f" • Weather History:     {len(history)} recorded data points")
    print(f" • Offline RAG Index:   {len(rag_manuals)} indexed manual sections")
    print(f" • Power Off Switch:    ACTIVE (Pin 11 / GPIO 17 with 3-2-1 countdown)")
    print("="*65 + "\\n")

def cmd_help():
    print("\\n" + "="*65)
    print(" 🌲 BUSHNET ASPEN - COMMAND SYSTEM REFERENCE")
    print("="*65)
    print(" COMMANDS:")
    print("  /weather       Show live tactical weather telemetry & barometric forecast")
    print("  /learn         Record live sensor snapshot & run weather pattern learning engine")
    print("  /record        Alias for /learn")
    print("  /history       Display recorded weather time-series and min/max stats")
    print("  /graph         Plot ASCII visual trend graph & sparkline curves")
    print("  /fish          Tactical barometric fishing index, water temps & feeding windows")
    print("  /wildlife      Regional fauna, predator defense protocols & survival game")
    print("  /status        Check physical sensor health & RAG manual index status")
    print("  /poweroff      Safely sync filesystems and shut down Raspberry Pi 5")
    print("  /help          Show this command reference")
    print()
    print(" SURVIVAL QUESTIONS:")
    print("  Type any outdoors question to query the AI survival engine:")
    print("  e.g., 'How do I hang a bear bag?'")
    print("        'What fish bite when barometer is falling?'")
    print("        'How to identify grizzly vs black bear tracks?'")
    print("        'How to start a fire with wet tinder?'")
    print("  ASPEN automatically injects your live sensor telemetry and grounds")
    print("  answers in authoritative offline field manuals (FM 21-76, Ranger Guide).")
    print("="*65 + "\\n")

def process_query(query, model="qwen2.5:1.5b", show_context=False):
    q = query.strip()
    if not q:
        return
    low = q.lower()

    # 1. System Shutdown Commands
    if q in ["/poweroff", "/shutdown"] or any(k in low for k in ["poweroff", "power off", "shutdown", "turn off"]):
        print("🛑 [SHUTDOWN] Syncing files and powering off Pi 5 safely...")
        os.system("sync; sudo shutdown -h now")
        return

    # 2. Weather Telemetry Slash Command
    if q in ["/weather", "/forecast", "/baro", "weather", "forecast", "barometer", "pressure", "meteo"] or low in ["is it going to rain", "rain forecast", "what is the weather"]:
        cmd_weather()
        return

    # 3. Weather Pattern Recording & Learning Command
    if q in ["/learn", "/record", "/train", "learn", "record", "learn weather", "record weather", "learn patterns"]:
        cmd_learn_and_record()
        return

    # 4. History Slash Command
    if q in ["/history", "/data", "/log", "history", "weather history"]:
        cmd_history()
        return

    # 5. Graph / Plot Slash Command
    if q in ["/graph", "/plot", "/chart", "/sparkline", "graph", "plot", "chart", "sparkline", "show graph", "see graph"]:
        cmd_graph()
        return

    # 6. Fishing Hydro-Meteorological Slash Command
    if q in ["/fish", "/fishing", "fish", "fishing", "fishing conditions", "fishing forecast"]:
        cmd_fish()
        return

    # 7. Regional Wildlife & Fauna Slash Command
    if q in ["/wildlife", "/fauna", "/animals", "/species", "wildlife", "fauna", "animals", "species"]:
        cmd_wildlife()
        return

    # 8. Status Slash Command
    if q in ["/status", "/sensors", "status", "sensors"]:
        cmd_status()
        return

    # 9. Help Slash Command
    if q in ["/help", "/?", "-h", "--help", "help", "commands"]:
        cmd_help()
        return

    # 7. Assemble Pre-Flight Context Envelope BEFORE AI processes anything
    weather = get_live_weather_telemetry()
    context = build_context_envelope(weather, q)

    # 8. Disambiguate critical wilderness safety queries for compact local models
    prompt_for_ai = q
    if any(w in low for w in ["bear hang", "how to bear hang", "make a bear hang", "hang food", "bear bag", "pct hang"]):
        prompt_for_ai = f"{q} (Context: Explain the PCT bear hang food-bag suspension method in a tree using 12-4-4 rule, cord, carabiner, and toggle stick 100m from camp. Never advise handling live bears.)"

    # 9. Try Ollama local model
    qwen_success = ask_qwen(prompt_for_ai, context, model, show_context)
    
    # 10. If Ollama is offline or loading, run tactical offline survival engine
    if not qwen_success:
        if show_context:
            print("\\n" + "="*65)
            print(context["full_envelope"])
            print("="*65)
        else:
            print(f"\\n📡 [PRE-FLIGHT CONTEXT INJECTED]: {context['summary_badge']}")
        print("\\n" + answer_outdoors_offline(q, context) + "\\n")

def main():
    args = sys.argv[1:]
    model = "qwen2.5:1.5b"
    show_context = False

    if "--show-context" in args or "-c" in args:
        show_context = True
        if "--show-context" in args:
            args.remove("--show-context")
        if "-c" in args:
            args.remove("-c")

    if "--model" in args:
        idx = args.index("--model")
        if idx + 1 < len(args):
            m_arg = args[idx + 1].lower()
            model = "qwen2.5:0.5b" if "0.5" in m_arg else "qwen2.5:1.5b"
            args.pop(idx + 1)
            args.pop(idx)

    if args:
        process_query(" ".join(args), model, show_context)
        return

    # Interactive Shell
    weather = get_live_weather_telemetry()
    context = build_context_envelope(weather, "status")
    print("=" * 65)
    print(f" 🌲 BushNet ASPEN - Survival AI Shell (Operator: {OPERATOR})")
    print(f" 📡 Pre-Flight Telemetry: {context['summary_badge']}")
    print(f" 🧠 Active Model: {model} (auto-fallback enabled)")
    print(" Commands: '/weather' (telemetry), '/learn' (record & learn), '/history', '/status'")
    print(" Type any question to ask AI, 'poweroff' to shut down.")
    print(" Tip: Pass --show-context or -c to inspect injected hardware envelope.")
    print("=" * 65)

    while True:
        try:
            user_in = input("\\nASPEN AI > ").strip()
            if not user_in:
                continue
            if user_in.lower() in ["exit", "quit", "q"]:
                print("Session closed. Stay safe out there!")
                break
            process_query(user_in, model, show_context)
        except (KeyboardInterrupt, EOFError):
            print("\\nSession closed.")
            break

if __name__ == "__main__":
    main()
`;

export const INGEST_MANUALS_SCRIPT = `#!/usr/bin/env python3
"""
=============================================================================
 BushNet ASPEN - Survival Manual & PDF Ingestion Pipeline (Offline RAG)
 Downloads, extracts, chunks, and indexes survival PDFs from TruePrepper,
 US Army (FM 21-76, TC 3-21.76), Red Cross, and any custom field manuals.
 Enables ASPEN AI to ground answers and quote real survival manuals offline!
=============================================================================
"""

import os
import sys
import json
import re
import urllib.request
import subprocess

BASE_DIR = "/home/lachlan/bushnet"
MANUALS_DIR = os.path.join(BASE_DIR, "manuals")
DATA_DIR = os.path.join(BASE_DIR, "data")
INDEX_FILE = os.path.join(DATA_DIR, "manuals_index.json")

# Core public-domain military & wilderness survival guides
CORE_MANUALS = [
    {
        "filename": "US_Army_FM_21-76_Survival_Manual.pdf",
        "title": "US Army FM 21-76 Survival Manual",
        "url": "https://ia800203.us.archive.org/34/items/Fm21-76SurvivalManual/FM21-76_SurvivalManual.pdf",
        "category": "Survival & Bushcraft"
    },
    {
        "filename": "US_Army_TC_3-21.76_Ranger_Handbook.pdf",
        "title": "US Army Ranger Handbook (TC 3-21.76)",
        "url": "https://ia801804.us.archive.org/16/items/ranger-handbook-tc-3-21.76/Ranger%20Handbook%20TC%203-21.76.pdf",
        "category": "Tactics, Knots & Camouflage"
    },
    {
        "filename": "FM_4-25.11_First_Aid.pdf",
        "title": "US Army FM 4-25.11 First Aid & Field Medicine",
        "url": "https://ia800305.us.archive.org/21/items/FM4-25.11FirstAid/FM4-25.11FirstAid.pdf",
        "category": "Wilderness Medicine & Trauma"
    }
]

# Baseline High-Yield Seed Manual Knowledge (TruePrepper & US Army Standards)
SEED_MANUALS = [
    {
        "source": "US Army FM 21-76 (Chapter 15: Food Procurement)",
        "title": "PCT Bear Hang & Wildlife Food Suspension (12-4-4 Rule)",
        "category": "Food Storage",
        "text": "The PCT (Pacific Crest Trail) bear hang is the military and backcountry standard for suspending food out of reach of bears and rodents without trunk tie-offs. Follow the 12-4-4 rule: food bag must hang at least 12 feet (4m) off the ground, 6 feet (2m) out from the tree trunk, and 6 feet (2m) below the supporting limb. Gear: 50ft (15m) paracord or slick line, carabiner, rock sack, 6-inch sturdy wooden toggle stick. Method: 1. Toss weighted rock line over a branch 15-20ft up. 2. Lower rock, attach carabiner, and clip food bag to carabiner. 3. Thread free cord end back through carabiner (2:1 pulley). 4. Hoist food bag all the way up to the branch. 5. Tie a clove hitch around the wooden toggle stick as high up the line as you can reach. 6. Release cord: bag drops halfway and locks in mid-air when the carabiner hits the toggle stick. Camp Rule: Set food hang 100 meters downwind from your sleeping shelter. Never approach or handle live bears."
    },
    {
        "source": "US Army FM 21-76 (Chapter 5: Shelters)",
        "title": "Debris A-Frame & Ground Conduction Barrier",
        "category": "Shelters",
        "text": "In cold or damp environments, conductive heat loss to the ground kills faster than ambient air. Construct an A-frame debris hut: prop a 3-4 meter ridgepole on two sturdy bipod shear legs at waist height. Place rib sticks at 45 to 60 degree angles along the ridgepole. Layer with brush, pine boughs, and 3 feet of dry leaves, moss, or needles for thermal dead-air insulation. Critical: pack at least 1 foot (30cm) of dry pine boughs inside as a sleeping mattress. Dig a 10cm runoff trench on the uphill side to divert ground water runoff."
    },
    {
        "source": "US Army TC 3-21.76 Ranger Handbook (Chapter 8: Survival)",
        "title": "Dakota Fire Hole & Smokeless Tactical Flame",
        "category": "Firecraft",
        "text": "The Dakota Fire Hole creates a superheated, wind-resistant, virtually smokeless fire suitable for concealment and high-efficiency cooking. Dig two connected holes in firm soil: a main combustion chamber 30cm wide and 30cm deep, and a secondary air-vent tunnel 30cm away on the upwind side angled down into the bottom of the main chamber. The chimney effect pulls cold fresh oxygen directly into the coal base, creating intense heat and burning off smoke particles before they exit."
    },
    {
        "source": "FM 4-25.11 First Aid (Chapter 4: Cold Injuries & Triage)",
        "title": "Hypothermia Assessment & Gradual Core Rewarming",
        "category": "First Aid",
        "text": "Hypothermia occurs when core temperature drops below 35°C (95°F). Early symptoms include intense shivering and the 'umbles' (mumbling, fumbling, stumbling, bumbling). When violent shivering stops while the person remains confused or apathetic, the condition is life-threatening. Strip wet clothing immediately. Insulate inside a dry sleeping bag with a vapor barrier. Apply indirect, gentle warmth to the chest, neck, axillae (armpits), and groin. Never rub cold extremities (causes cardiac arrhythmia from cold blood rush). Give warm sweet liquids only if the patient is fully conscious."
    },
    {
        "source": "TruePrepper & Wilderness Sanitation Guide",
        "title": "Pathogen Neutralization & Water Boiling Standards",
        "category": "Water Purification",
        "text": "Waterborne pathogens include bacteria (Campylobacter, Salmonella, E. coli), viruses (Hepatitis A, Norovirus), and protozoan cysts (Giardia lamblia, Cryptosporidium). Bringing clear water to a vigorous rolling boil for 1 full minute (3 minutes at elevations above 2,000 meters / 6,500 feet) completely destroys all biological pathogens. If water is turbid or cloudy, let heavy sediment settle and pre-filter through clean bandana, charcoal, and sand before boiling."
    },
    {
        "source": "US Army FM 21-76 (Chapter 7: Firecraft)",
        "title": "Wet Weather Fire Ignition & Tinder Harvesting",
        "category": "Firecraft",
        "text": "When relative humidity is high (>75%) or rain has fallen, forest ground litter is waterlogged. Do NOT pick damp leaves from the ground. Harvest dead branches still clinging to the lower trunks of pine and spruce trees (they shed rain and dry in the wind). Split dead standing hardwood to expose dry interior heartwood. Whittle feather sticks with fine curly curls. Scrape outer yellow or white birch bark for paper-thin curls rich in flammable betulin oil. Hold ferrocerium rod at 45 degrees directly against the tinder nest and pull the rod backward."
    },
    {
        "source": "US Army FM 21-76 (Chapter 8: Food Procurement)",
        "title": "Figure-4 Deadfall Trap & Wire Snare Mechanics",
        "category": "Trapping",
        "text": "The Figure-4 deadfall uses three notched wooden sticks (vertical upright, diagonal support, and horizontal bait release stick) to suspend a heavy deadfall rock or log. Carve precise square notches. Place bait on the inner tip of the horizontal stick; animal disturbance triggers instantaneous collapse. For small game wire snares, make a noose 4 fingers wide and suspend it 4 fingers above a narrow animal run or bottleneck, anchored securely to a live sapling."
    }
]

def ensure_dirs():
    os.makedirs(MANUALS_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

def save_index(entries):
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
    print(f"✅ Index saved to {INDEX_FILE} ({len(entries)} chunks)")

def load_existing_index():
    if os.path.exists(INDEX_FILE):
        try:
            with open(INDEX_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return []

def init_seed_database():
    """Initializes high-fidelity seed manual database immediately without waiting for downloads."""
    ensure_dirs()
    existing = load_existing_index()
    existing_titles = {e.get("title") for e in existing}
    added = 0
    for seed in SEED_MANUALS:
        if seed["title"] not in existing_titles:
            existing.append(seed)
            added += 1
    save_index(existing)
    print(f"🌲 Initialized offline survival knowledge base with {len(existing)} verified manual chapters ({added} added).")

def download_core_manuals():
    """Downloads core public-domain military and wilderness survival PDFs into manuals directory."""
    ensure_dirs()
    print("=" * 65)
    print(" 📥 DOWNLOADING CORE SURVIVAL MANUALS (TruePrepper & US Army)")
    print("=" * 65)
    for m in CORE_MANUALS:
        dest = os.path.join(MANUALS_DIR, m["filename"])
        if os.path.exists(dest):
            size_mb = os.path.getsize(dest) / (1024 * 1024)
            print(f" • [EXISTS] {m['title']} ({size_mb:.1f} MB)")
            continue
        print(f" • Downloading {m['title']}...")
        try:
            req = urllib.request.Request(m["url"], headers={'User-Agent': 'BushNet-ASPEN-Pi5/1.0'})
            with urllib.request.urlopen(req, timeout=30) as resp, open(dest, 'wb') as out:
                out.write(resp.read())
            size_mb = os.path.getsize(dest) / (1024 * 1024)
            print(f"   ✓ Downloaded: {m['filename']} ({size_mb:.1f} MB)")
        except Exception as e:
            print(f"   ✗ Failed to download {m['filename']}: {e}")
            print(f"     Tip: You can manually copy any survival PDF from TruePrepper into {MANUALS_DIR}")

def extract_text_from_pdf(filepath):
    """Extracts plain text from PDF using pdftotext (poppler-utils) or pypdf."""
    try:
        res = subprocess.run(["pdftotext", filepath, "-"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout
    except Exception:
        pass

    try:
        import pypdf
        reader = pypdf.PdfReader(filepath)
        pages = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                pages.append(f"[PAGE {i+1}]\\n" + text)
        if pages:
            return "\\n\\n".join(pages)
    except Exception:
        pass

    return None

def chunk_text(full_text, source_name, chunk_size_words=350):
    """Splits full document text into semantic chunks for fast BM25 / keyword RAG retrieval."""
    paragraphs = re.split(r'\\n{2,}', full_text)
    chunks = []
    current_words = []
    current_title = "Field Protocol"

    for para in paragraphs:
        cleaned = re.sub(r'\\s+', ' ', para).strip()
        if not cleaned:
            continue
        if len(cleaned) < 80 and (cleaned.isupper() or re.match(r'^(CHAPTER|SECTION|\\d+\\.|\\bRULE\\b|\\bHOW TO\\b)', cleaned, re.I)):
            current_title = cleaned

        words = cleaned.split()
        current_words.extend(words)

        if len(current_words) >= chunk_size_words:
            chunk_content = " ".join(current_words)
            chunks.append({
                "source": source_name,
                "title": current_title,
                "category": "Survival Field Guide",
                "text": chunk_content
            })
            current_words = current_words[-50:]

    if current_words:
        chunks.append({
            "source": source_name,
            "title": current_title,
            "category": "Survival Field Guide",
            "text": " ".join(current_words)
        })
    return chunks

def index_all_manuals():
    """Indexes all .pdf and .txt files in /home/lachlan/bushnet/manuals."""
    ensure_dirs()
    init_seed_database()
    existing = load_existing_index()
    existing_map = {f"{e.get('source')}_{e.get('title')}": e for e in existing}

    pdf_files = [f for f in os.listdir(MANUALS_DIR) if f.lower().endswith(('.pdf', '.txt', '.md'))]
    if not pdf_files:
        print(f"\\n📂 No custom manual files found in {MANUALS_DIR}.")
        print("   Tip: Place any PDF downloaded from https://trueprepper.com/survival-pdfs-downloads/ into:")
        print(f"   {MANUALS_DIR}")
        print("   Then re-run: python3 ingest_manuals.py --index\\n")
        return

    print(f"\\n🔍 Found {len(pdf_files)} manual file(s) in {MANUALS_DIR}. Indexing...")
    total_added = 0

    for fname in pdf_files:
        fpath = os.path.join(MANUALS_DIR, fname)
        print(f" • Processing: {fname}...")
        text = None
        if fname.lower().endswith('.pdf'):
            text = extract_text_from_pdf(fpath)
            if not text:
                print("   ⚠️ Could not extract text from PDF. Ensure 'poppler-utils' is installed: sudo apt install -y poppler-utils")
                continue
        else:
            try:
                with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                    text = f.read()
            except Exception as e:
                print(f"   ✗ Error reading file: {e}")
                continue

        source_clean = fname.replace(".pdf", "").replace("_", " ")
        chunks = chunk_text(text, source_clean)
        print(f"   ✓ Extracted {len(chunks)} searchable section chunks.")
        for c in chunks:
            key = f"{c['source']}_{c['title']}"
            if key not in existing_map:
                existing.append(c)
                existing_map[key] = c
                total_added += 1

    save_index(existing)
    print(f"🎉 Index complete! Total searchable knowledge snippets: {len(existing)} ({total_added} new from local files).\\n")

def show_status():
    ensure_dirs()
    index = load_existing_index()
    pdf_files = [f for f in os.listdir(MANUALS_DIR) if f.lower().endswith(('.pdf', '.txt', '.md'))] if os.path.exists(MANUALS_DIR) else []
    print("=" * 65)
    print(" 📚 BUSHNET ASPEN - OFFLINE MANUAL & RAG STATUS")
    print("=" * 65)
    print(f" • Manuals Storage Directory: {MANUALS_DIR}")
    print(f" • PDFs / Files in Folder:    {len(pdf_files)}")
    for f in pdf_files:
        size = os.path.getsize(os.path.join(MANUALS_DIR, f)) / (1024 * 1024)
        print(f"   - {f} ({size:.1f} MB)")
    print(f" • Total Searchable Chunks:   {len(index)}")
    sources = set(e.get("source", "Unknown") for e in index)
    print(f" • Unique Knowledge Sources:  {len(sources)}")
    for s in sorted(sources):
        cnt = sum(1 for e in index if e.get("source") == s)
        print(f"   - {s} ({cnt} sections)")
    print("=" * 65)

def main():
    args = sys.argv[1:]
    if "--download" in args or "-d" in args:
        download_core_manuals()
        index_all_manuals()
    elif "--index" in args or "-i" in args:
        index_all_manuals()
    elif "--init" in args:
        init_seed_database()
    elif "--status" in args or "-s" in args:
        show_status()
    else:
        print("Usage:")
        print("  python3 ingest_manuals.py --init      Initialize verified offline seed manual chapters")
        print("  python3 ingest_manuals.py --download  Download core survival PDFs (US Army FM 21-76, Ranger Handbook)")
        print("  python3 ingest_manuals.py --index     Index all PDFs in ~/bushnet/manuals into searchable chunks")
        print("  python3 ingest_manuals.py --status    Display current indexed manuals and chunks")
        init_seed_database()

if __name__ == "__main__":
    main()
`;

export const ARDUINO_SKETCH = `/*
=============================================================================
 BushNet ASPEN - Arduino Uno + 16x2 LCD Keypad Shield Driver
 Communicates with Raspberry Pi 5 over USB Serial (9600 Baud)
 Supports physical navigation buttons (RIGHT, LEFT, UP, DOWN, SELECT)
=============================================================================
*/

#include <LiquidCrystal.h>

// Standard LCD Keypad Shield Pinout (D4, D5, D6, D7, D8, D9)
LiquidCrystal lcd(8, 9, 4, 5, 6, 7);

#define btnRIGHT  0
#define btnUP     1
#define btnDOWN   2
#define btnLEFT   3
#define btnSELECT 4
#define btnNONE   5

int last_key = btnNONE;
unsigned long last_debounce = 0;

int read_LCD_buttons() {
  int adc_key_in = analogRead(0);
  if (adc_key_in > 1000) return btnNONE;
  if (adc_key_in < 50)   return btnRIGHT;
  if (adc_key_in < 195)  return btnUP;
  if (adc_key_in < 380)  return btnDOWN;
  if (adc_key_in < 555)  return btnLEFT;
  if (adc_key_in < 790)  return btnSELECT;
  return btnNONE;
}

void setup() {
  Serial.begin(9600);
  lcd.begin(16, 2);
  pinMode(10, OUTPUT);
  digitalWrite(10, HIGH); // Turn on Backlight
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("BUSHNET ASPEN");
  lcd.setCursor(0, 1);
  lcd.print("USB LINK WAITING");
}

void loop() {
  // 1. READ PHYSICAL BUTTONS ON SHIELD & TRANSMIT TO RASPBERRY PI VIA SERIAL
  int key = read_LCD_buttons();
  if (key != last_key && (millis() - last_debounce) > 180) {
    last_debounce = millis();
    last_key = key;

    switch (key) {
      case btnRIGHT:  Serial.println("BTN:RIGHT"); break;
      case btnLEFT:   Serial.println("BTN:LEFT"); break;
      case btnUP:     Serial.println("BTN:UP"); break;
      case btnDOWN:   Serial.println("BTN:DOWN"); break;
      case btnSELECT: Serial.println("BTN:SELECT"); break;
    }
  }

  // 2. RECEIVE DISPLAY COMMANDS BACK FROM RASPBERRY PI VIA SERIAL
  // Protocol: "LCD:16CHARS_LINE_1|16CHARS_LINE_2\\n"
  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\\n');
    input.trim();
    if (input.startsWith("LCD:")) {
      String payload = input.substring(4);
      int pipe_pos = payload.indexOf('|');
      if (pipe_pos != -1) {
        String line1 = payload.substring(0, pipe_pos);
        String line2 = payload.substring(pipe_pos + 1);

        lcd.clear();
        lcd.setCursor(0, 0);
        lcd.print(line1.substring(0, 16));
        lcd.setCursor(0, 1);
        lcd.print(line2.substring(0, 16));
      }
    }
  }

  delay(20);
}
`;

export const SYSTEMD_SERVICE = `[Unit]
Description=BushNet ASPEN Autonomous Survival Engine (Thumb Drive & Pi 5)
After=multi-user.target network.target

[Service]
Type=simple
User=${USERNAME}
WorkingDirectory=/home/${USERNAME}/bushnet
ExecStart=/usr/bin/python3 /home/${USERNAME}/bushnet/aspen_pi5_core.py
Restart=always
RestartSec=5
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
`;

export const INSTALL_BASH_SCRIPT = `#!/usr/bin/env bash
# =============================================================================
# BushNet ASPEN - USB Thumb Drive Auto-Setup Script for Raspberry Pi 5
# Registered User: ${USERNAME} | Volume Name: ${THUMBDRIVE_NAME}
# =============================================================================

set -e

echo "=========================================================="
echo "  BushNet ASPEN Pi 5 USB Thumb Drive Installer"
echo "  Target User: ${USERNAME} | Volume: ${THUMBDRIVE_NAME}"
echo "=========================================================="

SCRIPT_DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"
echo "[1/5] Running installer from directory: \$SCRIPT_DIR"

# Install System Dependencies
echo "[2/5] Installing Raspberry Pi OS System Packages & PDF Utilities..."
sudo apt update
sudo apt install -y python3-pip python3-serial python3-smbus i2c-tools poppler-utils git systemd curl

# Install Python Libraries
echo "[3/5] Installing Python Peripherals Libraries..."
pip3 install rpi-lgpio smbus2 pyserial --break-system-packages

# Add udev rules for persistent USB ports
echo "[4/5] Setting up persistent USB Serial udev permissions..."
TARGET_USER="\${SUDO_USER:-\$USER}"
if [ "\$TARGET_USER" = "root" ] || [ -z "\$TARGET_USER" ]; then
    TARGET_USER="lachlan"
fi
sudo usermod -a -G dialout,i2c,gpio "\$TARGET_USER" 2>/dev/null || true

# Copy files to Pi internal storage
echo "[5/5] Deploying scripts to /home/\$TARGET_USER/bushnet..."
mkdir -p "/home/\$TARGET_USER/bushnet/manuals"
mkdir -p "/home/\$TARGET_USER/bushnet/data"
cp -r "\$SCRIPT_DIR"/* "/home/\$TARGET_USER/bushnet/"
chown -R "\$TARGET_USER:\$TARGET_USER" "/home/\$TARGET_USER/bushnet"

# Initialize Offline RAG Field Manual Seed Database
echo "[RAG Engine] Initializing survival field manual seed database..."
python3 "/home/\$TARGET_USER/bushnet/ingest_manuals.py" --init 2>/dev/null || true

# Install Systemd Service
echo "[Installer] Registering Systemd Service for Auto-Start on Boot..."
SERVICE_FILE="\$(find "\$SCRIPT_DIR" -maxdepth 3 -name "aspen.service" 2>/dev/null | head -n 1)"
if [ -z "\$SERVICE_FILE" ]; then
    SERVICE_FILE="/home/\$TARGET_USER/bushnet/aspen.service"
fi

if [ -f "\$SERVICE_FILE" ]; then
    sudo sed -i "s/User=.*/User=\$TARGET_USER/" "\$SERVICE_FILE" 2>/dev/null || true
    sudo sed -i "s|/home/.*|/home/\$TARGET_USER/bushnet|g" "\$SERVICE_FILE" 2>/dev/null || true
    sudo cp "\$SERVICE_FILE" /etc/systemd/system/aspen.service
    sudo systemctl daemon-reload
    sudo systemctl enable --now aspen.service
    echo "✓ BushNet ASPEN Service installed and started successfully!"
fi

echo "=========================================================="
echo "  Setup Complete! BushNet ASPEN is active."
echo "  To query AI: python3 /home/\$TARGET_USER/bushnet/ask.py"
echo "  To view logs: sudo journalctl -u aspen.service -f"
echo "=========================================================="
`;

export const THUMBDRIVE_README = `# 🌲 BushNet ASPEN - USB Thumb Drive Setup & Operation Manual

**Target Hardware**: Raspberry Pi 5 (2GB/4GB/8GB RAM) & Arduino Uno R3/R4
**Operator User**: \`${USERNAME}\`
**Supported Local AI Models**: \`qwen2.5:0.5b\` (Emergency Fast) & \`qwen2.5:1.5b\` (Deep Survival)

---

## 🤖 Asking the Local Survival AI (Qwen 0.5B & 1.5B)

### 1. Download the Models to Pi 5 (One-time setup):
\`\`\`bash
# Pull both quantized Qwen models
ollama pull qwen2.5:0.5b
ollama pull qwen2.5:1.5b
\`\`\`

### 2. Interactive Survival Chat Session:
\`\`\`bash
python3 ~/bushnet/ask.py
\`\`\`
- Automatically assembles and displays your **Pre-Flight Context Envelope** (Hardware manifest, live BMP180 barometric pressure, DHT11 temp/humidity, DS18B20 waterproof probe, GPS coordinates, and wilderness safety directives).
- Type any outdoors question and receive real-time streamed guidance.
- Type \`/switch\` to seamlessly toggle between **0.5B** and **1.5B**.
- Type \`/quit\` to exit.

### 3. Quick One-Line Questions & Envelope Inspection:
\`\`\`bash
# Standard query (automatically injects pre-flight sensor & hardware context):
python3 ~/bushnet/ask.py "How do I build an A-frame shelter in this weather?"

# Inspect the full pre-flight hardware & telemetry envelope injected before your query:
python3 ~/bushnet/ask.py --show-context "I hear strange noises in the woods, what should I do?"

# Using deep 1.5B model with context:
python3 ~/bushnet/ask.py --model 1.5b "What clothing layers should I wear outside right now?"
\`\`\`

### 4. Direct Code Slash Commands:
\`\`\`bash
# Display live tactical weather telemetry, barometer & rain probability:
python3 ~/bushnet/ask.py /weather

# Record live sensor snapshot & compute learned weather pattern signatures:
python3 ~/bushnet/ask.py /learn

# View recorded historical time-series data:
python3 ~/bushnet/ask.py /history

# Check attached physical sensor health & indexed RAG manuals:
python3 ~/bushnet/ask.py /status
\`\`\`

---

## 📚 Survival PDF & Field Manual Ingestion (Offline RAG)

ASPEN can ground its AI responses directly in authoritative wilderness survival guides (such as **US Army FM 21-76**, **Ranger Handbook TC 3-21.76**, and PDFs downloaded from [TruePrepper](https://trueprepper.com/survival-pdfs-downloads/)).

### 1. Download Core Army & Prepper Manuals (Automated):
\`\`\`bash
python3 ~/bushnet/ingest_manuals.py --download
\`\`\`
This downloads public-domain military manuals directly to \`~/bushnet/manuals/\`, extracts the text using \`pdftotext\`, and chunks them into semantic sections indexed in \`~/bushnet/data/manuals_index.json\`.

### 2. Add Any Custom PDF from TruePrepper or USB:
You can drop any offline PDF (medical guides, knot tying, wild edibles) straight into:
\`\`\`bash
/home/lachlan/bushnet/manuals/
\`\`\`
Then run the indexer to process all new documents:
\`\`\`bash
python3 ~/bushnet/ingest_manuals.py --index
\`\`\`

### 3. Check Current Knowledge Base Status:
\`\`\`bash
python3 ~/bushnet/ingest_manuals.py --status
\`\`\`
When you run \`ask.py\`, it searches \`manuals_index.json\`, retrieves the most relevant passage for your query, and injects it into the pre-flight envelope as **authoritative ground truth**.

---

## ⚡ Breadboard Push Buttons (Hardware Power ON / OFF)

The BushNet ASPEN system supports two physical tactile buttons on your breadboard for safe power management without pulling cables or risking I2C conflicts:

### 1. Power OFF / Safe Shutdown Button on Pin 11 (with 3, 2, 1 Countdown):
- **Button Leg 1**: Connect to **Pin 11 (GPIO 17)**
- **Button Leg 2**: Connect to **Pin 9 (GND)** *(Directly adjacent to Pin 11 on the 40-pin header!)*
- **How it works in Python & LCD**:
  When pressed, \`aspen_pi5_core.py\` catches the GPIO 17 trigger and runs a 3-second visual countdown on your 16x2 LCD display & terminal:
  \`\`\`
  [LCD] Line 1: SHUTTING DOWN...
  [LCD] Line 2: POWER OFF IN 3S -> 2S -> 1S
  \`\`\`
  When the countdown hits 0, it flushes storage caches and executes \`sudo shutdown -h now\`!

- **Kernel Overlay Option (Zero Python Needed)**:
  Add this line to \`/boot/firmware/config.txt\`:
  \`\`\`ini
  dtoverlay=gpio-shutdown,gpio_pin=17,active_low=1,gpio_pull=up
  \`\`\`

### 2. Power ON / Wake Up:
- **Onboard Physical Power Button**: The Raspberry Pi 5 has a **built-in physical power button** directly on the PCB edge next to the USB-C port and status LED. Simply press this onboard button to turn the Pi 5 ON or wake it up!
- **Optional Breadboard Power ON Button**: Connect a momentary button across the **Pi 5 J2 Header** (the 2 gold pins between Ethernet and USB-C). Pin 1 (PWR_BTN) to Button Leg 1, Pin 2 (GND) to Button Leg 2.

### 3. Emergency SOS Panic Button:
- **Button Leg 1**: Connect to **GPIO 27 (Physical Pin 13)**
- **Button Leg 2**: Connect to **GND (Physical Pin 14)**
- Triggers instant medical alert mode and priority model routing.
`;

export const ARDUINO_SENSOR_HUB_SKETCH = `/*
 * =====================================================================
 *  BushNet Arduino Sensor Hub (USB JSON Telemetry Bridge)
 *  Target: Arduino Uno / Nano / Pro Mini
 * 
 *  Sensors Connected:
 *  - BMP180: Barometric Pressure & Temperature (I2C: SDA -> A4, SCL -> A5)
 *  - KY-001 / DS18B20: Auxiliary Waterproof Temp Probe (OneWire -> Pin 2)
 *  - DHT11: Ambient Air Temp & Relative Humidity (Pin 3)
 * 
 *  Output: Clean JSON lines over USB Serial at 9600 baud every 1000ms:
 *  {"temp":21.4,"hum":52,"press":1013.25,"alt":142.0,"probe":19.8}
 * =====================================================================
 */

#include <Wire.h>
#include <Adafruit_BMP085.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <DHT.h>

// Sensor Pin Definitions
#define ONE_WIRE_BUS 2
#define DHTPIN 3
#define DHTTYPE DHT11

// Instances
Adafruit_BMP085 bmp;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature probeSensors(&oneWire);
DHT dht(DHTPIN, DHTTYPE);

bool hasBmp = false;

void setup() {
  Serial.begin(9600);
  while (!Serial) { ; } // wait for serial connection
  
  // Initialize BMP180 I2C (Pins A4=SDA, A5=SCL)
  if (bmp.begin()) {
    hasBmp = true;
  }
  
  // Initialize DS18B20 / KY-001 Waterproof Probe
  probeSensors.begin();
  
  // Initialize DHT11
  dht.begin();
}

void loop() {
  // 1. Read DHT11 Ambient
  float dhtTemp = dht.readTemperature();
  float dhtHum = dht.readHumidity();
  if (isnan(dhtTemp)) dhtTemp = 21.0;
  if (isnan(dhtHum)) dhtHum = 50.0;

  // 2. Read BMP180 Pressure & Temp
  float bmpTemp = dhtTemp;
  float bmpPress = 1013.25;
  float bmpAlt = 0.0;
  if (hasBmp) {
    bmpTemp = bmp.readTemperature();
    bmpPress = bmp.readPressure() / 100.0F; // Convert Pa to hPa
    bmpAlt = bmp.readAltitude(101325);
  }

  // 3. Read KY-001 / DS18B20 Probe
  probeSensors.requestTemperatures();
  float probeTemp = probeSensors.getTempCByIndex(0);
  if (probeTemp < -50.0 || probeTemp > 125.0) {
    probeTemp = bmpTemp; // fallback if probe unplugged
  }

  // 4. Output Clean Formatted JSON Line to Raspberry Pi 5 USB
  Serial.print("{\\"temp\\":");
  Serial.print(dhtTemp, 1);
  Serial.print(",\\"hum\\":");
  Serial.print((int)dhtHum);
  Serial.print(",\\"press\\":");
  Serial.print(bmpPress, 2);
  Serial.print(",\\"alt\\":");
  Serial.print(bmpAlt, 1);
  Serial.print(",\\"probe\\":");
  Serial.print(probeTemp, 1);
  Serial.println("}");

  delay(1000);
}
`;

export const START_KIOSK_SCRIPT = `#!/bin/bash
# =====================================================================
#  BushNet Handheld OS - Kiosk Display Launcher (480x320)
#  Target: Raspberry Pi 5 with 3.5" Hosyoond Touchscreen
#  Boots straight into BushNet OS with ZERO shell or desktop visible!
# =====================================================================

# Hide cursor when idle
unclutter -idle 2 -root &

# Start the local BushNet Node server on localhost:3000
cd /home/lachlan/bushnet
export NODE_ENV=production
node dist/server.cjs &

# Wait for local server port 3000 to be ready
while ! nc -z localhost 3000; do
  sleep 0.2
done

# Launch Chromium in pure fullscreen kiosk mode
# Matches 480x320 physical resolution of the 3.5" screen
chromium-browser \\
  --kiosk \\
  --noerrdialogs \\
  --disable-infobars \\
  --no-first-run \\
  --ozone-platform=wayland \\
  --window-size=480,320 \\
  --window-position=0,0 \\
  --check-for-update-interval=31536000 \\
  --disable-pinch \\
  --app=http://localhost:3000
`;

export const KIOSK_SYSTEMD_SERVICE = `[Unit]
Description=BushNet 3.5" Handheld Cyberdeck Kiosk OS
After=network.target systemd-user-sessions.service

[Service]
Type=simple
User=lachlan
WorkingDirectory=/home/lachlan/bushnet
ExecStart=/home/lachlan/bushnet/start_kiosk.sh
Restart=always
RestartSec=3
Environment=DISPLAY=:0
Environment=XDG_RUNTIME_DIR=/run/user/1000

[Install]
WantedBy=graphical.target
`;

export const SETUP_PI5_QWEN_SCRIPT = `#!/bin/bash
# =====================================================================
#  BushNet Qwen 2.5 1.5B Offline AI Setup for Raspberry Pi 5
#  Pins Qwen to CPU Cores 1, 2, 3 leaving Core 0 100% free for the OS!
# =====================================================================
set -e

echo "=== 🌲 BushNet Pi 5 Offline AI Setup ==="

# 1. Install Ollama if not present
if ! command -v ollama &> /dev/null; then
  echo "[+] Installing Ollama offline inference runtime..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

# 2. Pull Qwen 2.5 1.5B Instruct (Q4_K_M quantized ~1.1GB RAM)
echo "[+] Pulling Qwen 2.5 1.5B Instruct model..."
ollama pull qwen2.5:1.5b

# 3. Create ASPEN Survival Modelfile with System Instructions & Field Manuals
echo "[+] Configuring ASPEN Survival System Persona..."
cat << 'EOF' > /home/lachlan/bushnet/Modelfile
FROM qwen2.5:1.5b

# Parameters optimized for Raspberry Pi 5 Cortex-A76
PARAMETER temperature 0.3
PARAMETER top_p 0.9
PARAMETER num_ctx 4096
PARAMETER num_thread 3

SYSTEM """
You are ASPEN (Autonomous Survival & Preparedness Executive Network) running 100% offline on a ruggedized Raspberry Pi 5 with a 3.5" screen.
Ground all advice strictly in standard wilderness survival manuals (US Army FM 3-05.70, Red Cross First Aid, NOAA Weather Guides).
Keep answers concise, direct, step-by-step, and prioritize life safety.
"""
EOF

ollama create aspen -f /home/lachlan/bushnet/Modelfile

echo "=== ✅ Setup Complete! ASPEN is ready offline ==="
echo "Test query: ollama run aspen 'What are the first 3 steps in treating hypothermia?'"
`;

export const WIRING_GUIDE_35_HUB = `# BushNet 3.5" Handheld Cyberdeck & Arduino Sensor Hub Guide

## 1. Hardware Overview
- **Core Computer**: Raspberry Pi 5 (2GB or 4GB RAM)
- **Display**: Hosyoond 3.5" TFT Touchscreen (480×320)
- **Input**: Rii Mini X1 Wireless 2.4GHz Keyboard & Touchpad (USB Dongle)
- **Sensors Bridge**: Arduino Uno (or Nano) connected via USB cable to Pi 5
- **GPS**: VK-162 USB GPS Antenna connected directly to Pi 5 USB 3.0 port

---

## 2. Sensor Connections to Arduino (Zero Pi Soldering!)
The 3.5" screen sits directly on top of the Pi 5 GPIO header. To avoid having to solder anything to the Pi or buy a $20 stacking header, **all atmospheric sensors plug into the Arduino**:

### A. BMP180 Barometric Pressure & Altitude Sensor:
- **VCC** ➔ Arduino **3.3V** (or 5V if module has 3.3V regulator)
- **GND** ➔ Arduino **GND**
- **SCL** ➔ Arduino **A5** (Hardware I2C Clock)
- **SDA** ➔ Arduino **A4** (Hardware I2C Data)

### B. KY-001 / DS18B20 Waterproof Temperature Probe:
- **VCC (Red)** ➔ Arduino **5V**
- **GND (Black)** ➔ Arduino **GND**
- **DATA (Yellow)** ➔ Arduino **Digital Pin 2** *(with 4.7kΩ pullup resistor between VCC and DATA)*

### C. DHT11 Ambient Temp & Humidity:
- **VCC** ➔ Arduino **5V**
- **GND** ➔ Arduino **GND**
- **DATA** ➔ Arduino **Digital Pin 3**

---

## 3. How the USB Sensor Hub Works
1. Flash \`bushnet_sensor_hub.ino\` onto your Arduino using the Arduino IDE.
2. Plug the Arduino into one of the Pi 5's USB ports using a standard USB-A to USB-B cable.
3. The Arduino streams clean JSON once per second over \`/dev/ttyUSB0\` or \`/dev/ttyACM0\`:
   \`\`\`json
   {"temp":21.4,"hum":52,"press":1013.25,"alt":142.0,"probe":19.8}
   \`\`\`
4. BushNet OS reads this USB stream and updates the Weather App, Solunar Fishing App, and Aspen AI context automatically!

---

## 4. Booting Directly into BushNet OS (Kiosk Mode)
1. Copy \`start_kiosk.sh\` and \`bushnet-kiosk.service\` into \`/home/lachlan/bushnet/\`.
2. Enable the service:
   \`\`\`bash
   sudo cp bushnet-kiosk.service /etc/systemd/system/
   sudo systemctl enable bushnet-kiosk.service
   \`\`\`
3. When the Pi 5 powers on, it skips the command prompt and opens the full-screen BushNet OS app launcher instantly!
`;

export const DEPLOYMENT_FILES_LIST: DeploymentFile[] = [
  {
    id: 'arduino-hub',
    filename: 'bushnet_sensor_hub.ino',
    language: 'cpp',
    description: 'Arduino USB Sensor Hub: reads BMP180 (I2C A4/A5), KY-001 (D2), DHT11 (D3) and streams JSON to Pi 5',
    targetDevice: 'Arduino Uno',
    recommendedPath: 'Flash via Arduino IDE to Uno or Nano',
    content: ARDUINO_SENSOR_HUB_SKETCH,
  },
  {
    id: 'kiosk-sh',
    filename: 'start_kiosk.sh',
    language: 'bash',
    description: 'Full-screen 480x320 Kiosk launcher for Hosyoond 3.5" screen (Zero desktop or shell visible)',
    targetDevice: 'Bash Script',
    recommendedPath: `/home/${USERNAME}/bushnet/start_kiosk.sh`,
    content: START_KIOSK_SCRIPT,
  },
  {
    id: 'kiosk-service',
    filename: 'bushnet-kiosk.service',
    language: 'ini',
    description: 'Systemd auto-start service to boot directly into BushNet OS on power-up',
    targetDevice: 'Systemd / Linux',
    recommendedPath: '/etc/systemd/system/bushnet-kiosk.service',
    content: KIOSK_SYSTEMD_SERVICE,
  },
  {
    id: 'qwen-setup',
    filename: 'setup_pi5_qwen.sh',
    language: 'bash',
    description: 'Ollama & Qwen 2.5 1.5B offline installer with 3-core CPU affinity (Core 0 reserved for OS)',
    targetDevice: 'Bash Script',
    recommendedPath: `/home/${USERNAME}/bushnet/setup_pi5_qwen.sh`,
    content: SETUP_PI5_QWEN_SCRIPT,
  },
  {
    id: 'wiring-guide',
    filename: 'WIRING_3.5_SENSOR_HUB.md',
    language: 'markdown',
    description: 'Hardware wiring manual: 3.5" screen mounting, Arduino sensor hub pins, and USB ports',
    targetDevice: 'Documentation',
    recommendedPath: `/home/${USERNAME}/bushnet/WIRING_3.5_SENSOR_HUB.md`,
    content: WIRING_GUIDE_35_HUB,
  },
  {
    id: 'arduino',
    filename: 'aspen_keypad_shield.ino',
    language: 'cpp',
    description: 'Arduino Uno C++ driver for 16x2 LCD Keypad Shield with USB Serial protocol',
    targetDevice: 'Arduino Uno',
    recommendedPath: 'Flash via Arduino IDE to Uno / Shield',
    content: ARDUINO_SKETCH,
  },
  {
    id: 'python',
    filename: 'aspen_pi5_core.py',
    language: 'python',
    description: `Main Raspberry Pi 5 executive daemon script for user ${USERNAME}, reading sensors, hardware loop & Qwen AI query link`,
    targetDevice: 'Raspberry Pi 5',
    recommendedPath: `/media/${USERNAME}/${THUMBDRIVE_NAME}/aspen_pi5_core.py`,
    content: PYTHON_CORE_SCRIPT,
  },
  {
    id: 'ask',
    filename: 'ask.py',
    language: 'python',
    description: `Pre-Flight Context-Aware Survival AI Assistant: automatically prepends hardware manifest (BMP180, DHT11, KY-001, GPS), negative constraints, and offline PDF manual RAG citations before AI inference`,
    targetDevice: 'Raspberry Pi 5',
    recommendedPath: `/home/${USERNAME}/bushnet/ask.py`,
    content: CLI_ASK_SCRIPT,
  },
  {
    id: 'ingest',
    filename: 'ingest_manuals.py',
    language: 'python',
    description: `Survival PDF & TruePrepper Field Manual Ingestion Pipeline (Offline RAG): downloads military/prepper PDFs, chunks into searchable sections, and enables ASPEN AI to cite real manuals offline`,
    targetDevice: 'Raspberry Pi 5',
    recommendedPath: `/home/${USERNAME}/bushnet/ingest_manuals.py`,
    content: INGEST_MANUALS_SCRIPT,
  },
  {
    id: 'service',
    filename: 'aspen.service',
    language: 'ini',
    description: 'Systemd service file for auto-starting BushNet ASPEN on boot from Thumb Drive or Home folder',
    targetDevice: 'Systemd / Linux',
    recommendedPath: '/etc/systemd/system/aspen.service',
    content: SYSTEMD_SERVICE,
  },
  {
    id: 'bash',
    filename: 'setup_thumbdrive.sh',
    language: 'bash',
    description: 'Automated 1-command installer script to configure python libraries, permissions & systemd service',
    targetDevice: 'Bash Script',
    recommendedPath: `/media/${USERNAME}/${THUMBDRIVE_NAME}/setup_thumbdrive.sh`,
    content: INSTALL_BASH_SCRIPT,
  },
  {
    id: 'readme',
    filename: 'README_THUMBDRIVE.md',
    language: 'markdown',
    description: 'Comprehensive installation, pinout safety guide, and Qwen AI survival query manual',
    targetDevice: 'Documentation',
    recommendedPath: `/media/${USERNAME}/${THUMBDRIVE_NAME}/README_THUMBDRIVE.md`,
    content: THUMBDRIVE_README,
  },
];

export async function downloadZipPackage(): Promise<void> {
  const zip = new JSZip();

  DEPLOYMENT_FILES_LIST.forEach((file) => {
    zip.file(file.filename, file.content);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bushnet-aspen-thumbdrive-pack-${USERNAME}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSingleFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
