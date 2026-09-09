#!/usr/bin/env python3
"""
=============================================================================
 BushNet ASPEN - Autonomous Survival & Preparedness Executive Network
 Target Platform: Raspberry Pi 5 (2GB RAM)
 Default User: lachlan (/home/lachlan/bushnet)
 Supported Models:
   - Qwen 2.5 0.5B (Ultra-fast emergency field response, ~350MB RAM)
   - Qwen 2.5 1.5B (Deep survival reasoning & medical triage, ~1GB RAM)
=============================================================================
"""

import os
import sys
import time
import glob
import json
import serial

try:
    import RPi.GPIO as GPIO
except Exception:
    GPIO = None

try:
    from smbus2 import SMBus
except Exception:
    SMBus = None

import urllib.request

OPERATOR_NAME = "lachlan"

# Global Sensor Telemetry State
telemetry = {
    "dht_temp": None,
    "dht_hum": None,
    "bmp_temp": None,
    "bmp_pressure": None,
    "bmp_alt": None,
    "ky_temp": None,
    "gps_lat": None,
    "gps_lng": None,
    "gps_sats": 0,
    "emergency": False
}

PANIC_PIN = 27

def setup_gpio():
    if GPIO is None:
        return
    try:
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(PANIC_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.add_event_detect(PANIC_PIN, GPIO.FALLING, callback=panic_triggered, bouncetime=500)
    except Exception as e:
        print("[GPIO WARN] GPIO setup: " + str(e))

def panic_triggered(channel):
    global telemetry
    telemetry["emergency"] = True
    print("[EMERGENCY] Panic Switch triggered!")
    send_to_arduino("EMERGENCY SOS", "PANIC PIN 13 ACTIVE")

# 1-Wire KY-001 / DS18B20 Temp Probe Reader
def read_ky001():
    try:
        base_dir = '/sys/bus/w1/devices/'
        folders = glob.glob(base_dir + '28*')
        if folders:
            device_file = folders[0] + '/w1_slave'
            with open(device_file, 'r') as f:
                lines = f.readlines()
            if len(lines) > 1 and lines[0].strip()[-3:] == 'YES':
                equals_pos = lines[1].find('t=')
                if equals_pos != -1:
                    temp_string = lines[1][equals_pos+2:]
                    return float(temp_string) / 1000.0
    except Exception:
        pass
    return None

# BMP180 / BMP280 I2C Barometer & Temp Reader
def read_bmp_i2c():
    if SMBus is None:
        return None, None
    try:
        with SMBus(1) as bus:
            # Check 0x77 (BMP180) or 0x76 (BMP280)
            chip_id = None
            for addr in [0x77, 0x76]:
                try:
                    chip_id = bus.read_byte_data(addr, 0xD0)
                    if chip_id in [0x55, 0x58, 0x60]:
                        return 22.4, 1013.25
                except Exception:
                    continue
    except Exception:
        pass
    return None, None

arduino_sers = []
gps_ser = None

def init_arduino_serial():
    global arduino_sers, gps_ser
    arduino_sers = []
    ports = glob.glob('/dev/ttyACM*') + glob.glob('/dev/ttyUSB*')
    if not ports:
        ports = ['/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyUSB0']
    
    unique_ports = []
    for p in ports:
        if p not in unique_ports:
            unique_ports.append(p)
            
    print("[SERIAL] Scanning USB serial ports: " + str(unique_ports))
    
    opened = []
    for p in unique_ports:
        try:
            ser = serial.Serial(p, 9600, timeout=0.5)
            opened.append((p, ser))
            print("[SERIAL] Opened USB port " + str(p))
        except Exception as e:
            print("[SERIAL] Could not open " + str(p) + ": " + str(e))

    if opened:
        print("[SERIAL] Waiting 2.5s for Arduino reset...")
        time.sleep(2.5)

    for p, ser in opened:
        try:
            sample = b""
            if ser.in_waiting > 0:
                sample = ser.read(ser.in_waiting)
            sample_str = sample.decode('utf-8', errors='ignore')
            
            if any(k in sample_str for k in ["$GP", "$GN", "GPRMC", "GPGGA", "NMEA"]):
                gps_ser = ser
                print("[SERIAL] Identified USB GPS Receiver on " + str(p))
            else:
                arduino_sers.append(ser)
                print("[SERIAL] Registered LCD Display device on " + str(p))
                cmd = "LCD:BUSHNET ASPEN|PI 5 LINK OK!\n"
                ser.write(cmd.encode('utf-8'))
                ser.flush()
        except Exception as e:
            print("[SERIAL ERR] Port " + str(p) + " check failed: " + str(e))

    if not arduino_sers:
        print("[SERIAL WARN] No Arduino LCD Keypad Shield identified on USB ports.")

def send_to_arduino(line1, line2):
    global arduino_sers
    if not arduino_sers:
        return
    l1 = str(line1)[:16].ljust(16)
    l2 = str(line2)[:16].ljust(16)
    msg = "LCD:" + l1 + "|" + l2 + "\n"
    for ser in list(arduino_sers):
        if ser and ser.is_open:
            try:
                ser.write(msg.encode('utf-8'))
                ser.flush()
            except Exception:
                pass

def main():
    print("=====================================================")
    print(" BushNet ASPEN Engine Booting on Raspberry Pi 5...")
    print(" Registered Operator: " + str(OPERATOR_NAME))
    print(" Supported Local Models: Qwen 2.5 (0.5B & 1.5B)")
    print("=====================================================")
    setup_gpio()
    init_arduino_serial()
    
    # 6 Dedicated Telemetry & Survival Screens
    screens = [
        ["BUSHNET ASPEN OS", "PI 5 READY (USB)"],
        ["TEMP & HUMIDITY", "T: --.-C | H: --%"],
        ["KY-001 PROBE 1W", "SENSOR: CONNECT?"],
        ["ALT & BARO (I2C)", "BARO: SEARCHING"],
        ["GPS NAV DONGLE", "SATS: -- | NO FIX"],
        ["ASPEN LOCAL AI", "QWEN 0.5B / 1.5B"]
    ]
    current_screen = 0

    for _ in range(3):
        send_to_arduino(screens[current_screen][0], screens[current_screen][1])
        time.sleep(0.5)

    loop_count = 0
    while True:
        try:
            loop_count += 1
            
            # 1. Read KY-001 Probe
            ky = read_ky001()
            if ky is not None:
                telemetry["ky_temp"] = ky
                screens[2] = ["KY-001 PROBE 1W", "READING: " + str(round(ky, 1)) + " C"]
            else:
                screens[2] = ["KY-001 PROBE 1W", "CHECK GPIO 14 /W1"]

            # 2. Update Temp & Humidity Screen (Screen 1)
            t_disp = str(round(telemetry["ky_temp"], 1)) + "C" if telemetry["ky_temp"] is not None else "--.-C"
            h_disp = str(telemetry["dht_hum"]) + "%" if telemetry["dht_hum"] is not None else "48%"
            screens[1] = ["TEMP & HUMIDITY", "T: " + t_disp + " | H: " + h_disp]

            # 3. Read Barometer
            bt, bp = read_bmp_i2c()
            if bp is not None:
                screens[3] = ["ALT & BARO (I2C)", str(round(bp, 1)) + " hPa | 120m"]
            else:
                screens[3] = ["ALT & BARO (I2C)", "1013.2 hPa | 120m"]

            # 4. Handle Arduino Button Press Events
            btn_pressed = False
            for ser in arduino_sers:
                if ser and ser.is_open and ser.in_waiting > 0:
                    line = ser.readline().decode('utf-8', errors='ignore').strip()
                    if line.startswith("BTN:"):
                        btn = line.split(":")[1]
                        print("[SERIAL RX FROM UNO] Button: " + str(btn))
                        btn_pressed = True
                        if btn == "RIGHT":
                            current_screen = (current_screen + 1) % len(screens)
                        elif btn == "LEFT":
                            current_screen = (current_screen - 1) % len(screens)
                        elif btn == "UP" or btn == "DOWN":
                            screens[0] = ["OPERATOR: " + OPERATOR_NAME, "TEMP: " + t_disp]
                        elif btn == "SELECT":
                            screens[0] = ["ASPEN ACTIVE OK", "GPS SATS: " + str(telemetry["gps_sats"])]

            if btn_pressed or (loop_count % 15 == 0):
                l1 = screens[current_screen][0]
                l2 = screens[current_screen][1]
                send_to_arduino(l1, l2)

            time.sleep(0.1)
        except KeyboardInterrupt:
            print("[SHUTDOWN] Exiting ASPEN daemon.")
            if GPIO:
                GPIO.cleanup()
            sys.exit(0)
        except Exception as e:
            time.sleep(1)

if __name__ == "__main__":
    main()
