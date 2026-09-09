// =============================================================================
// BUSHNET CYBERDECK CLAMSHELL CAD MODEL (OpenSCAD)
// Hardware: 
//   - Freenove 5.0" DSI Touchscreen (121mm x 76mm)
//   - Rii Mini X1 Wireless Keyboard (151mm x 59mm x 12.5mm)
//   - Anker PowerCore III 20000mAh (158mm x 74.5mm x 19.3mm)
//   - Raspberry Pi 5 + Official Active Cooler (85mm x 56mm)
//   - VK-162 USB GPS Puck (49mm x 38mm x 16mm)
//   - Sensor Snorkel Bay (BMP180 + DHT11 + KY-001 isolated mounts)
//   - Snap-On Protective Hinge Cable Spine (Protects DSI ribbon)
// =============================================================================

$fn = 40; // Surface smoothness (set to 60 for final STL export)

// -----------------------------------------------------------------------------
// USER VIEW CONTROLS (Change these to inspect or export individual parts!)
// -----------------------------------------------------------------------------
view_mode       = "assembled"; // Options: "assembled", "exploded", "base_only", "lid_only", "door_only", "shroud_only"
clamshell_angle = 115;         // Opening angle in degrees (0 = closed, 115 = open laptop view)
show_hardware   = false;       // Set to false for 100% clean printable view (no fake placeholder cubes)

// -----------------------------------------------------------------------------
// CORE CHASSIS DIMENSIONS (mm)
// -----------------------------------------------------------------------------
chassis_w = 170.0; // Outer width
chassis_d = 148.0; // Outer depth (front to back)
wall_t    = 3.0;   // 3mm impact-resistant rugged wall thickness
corner_r  = 6.0;   // Rounded safety corners

base_h    = 32.0;  // Base height (accommodates 19.5mm Anker + keyboard tray + Pi 5)
lid_h     = 14.0;  // Lid height (accommodates Freenove 5.0" DSI panel + bezel hood)

// Hardware Clearances (+0.8mm for comfortable 3D printing slip fit)
anker_l = 158.5 + 1.0;
anker_w = 74.5 + 1.0;
anker_h = 19.5 + 0.8;

rii_l   = 151.0 + 1.0;
rii_w   = 59.0 + 1.0;
rii_h   = 12.5 + 0.5;

screen_w = 121.5 + 0.8;
screen_h = 76.5 + 0.8;
screen_glass_w = 108.0;
screen_glass_h = 65.0;

pi5_l   = 85.0;
pi5_w   = 56.0;

// -----------------------------------------------------------------------------
// MAIN RENDER SELECTOR
// -----------------------------------------------------------------------------
if (view_mode == "assembled") {
    assembled_view();
} else if (view_mode == "exploded") {
    exploded_view();
} else if (view_mode == "base_only") {
    base_chassis();
} else if (view_mode == "lid_only") {
    screen_lid();
} else if (view_mode == "door_only") {
    battery_charging_door();
} else if (view_mode == "shroud_only") {
    hinge_cable_shroud();
}

// -----------------------------------------------------------------------------
// 1. ASSEMBLED VIEW
// -----------------------------------------------------------------------------
module assembled_view() {
    // Bottom Base
    base_chassis();
    
    // Battery charging door snapped closed on right side
    translate([chassis_w/2 - wall_t - 0.5, 42, 6])
        battery_charging_door();

    // Hinge Pivot & Top Screen Lid
    translate([0, chassis_d - 12, base_h - 2]) {
        rotate([clamshell_angle, 0, 0]) {
            translate([0, - (chassis_d - 12), - (base_h - 2)])
                screen_lid();
        }
    }

    // Optional translucent hardware mockups
    if (show_hardware) {
        hardware_mockups();
    }
}

// -----------------------------------------------------------------------------
// 2. EXPLODED VIEW
// -----------------------------------------------------------------------------
module exploded_view() {
    base_chassis();

    translate([0, 0, 45])
        screen_lid();

    translate([chassis_w/2 + 25, 42, 6])
        battery_charging_door();

    if (show_hardware) {
        translate([0, 0, 15]) hardware_mockups();
    }
}

// -----------------------------------------------------------------------------
// 3. BOTTOM BASE CHASSIS
// -----------------------------------------------------------------------------
module base_chassis() {
    color([0.22, 0.23, 0.24]) // Rugged tactical dark slate
    difference() {
        // Outer Shell
        rounded_box(chassis_w, chassis_d, base_h, corner_r);

        // Internal Cavity
        translate([wall_t, wall_t, wall_t])
            rounded_box(chassis_w - wall_t*2, chassis_d - wall_t*2, base_h, corner_r - 1.5);

        // Rii Mini X1 Keyboard Recessed Cradle (Front deck)
        translate([(chassis_w - rii_l)/2, 8, base_h - rii_h]) {
            cube([rii_l, rii_w, rii_h + 2]);
        }

        // Thumb Pry Scoop for Easy Keyboard Removal
        translate([chassis_w/2, 8, base_h])
            cylinder(r=11, h=10, center=true);

        // Power Switch Relief Notch for Rii keyboard top edge
        translate([chassis_w/2 - 50, 8 + rii_w - 2, base_h - 6])
            cube([20, 6, 8]);

        // Power Bank Charging Port Door Window (Right side wall)
        translate([chassis_w - wall_t - 2, 30, 6])
            cube([wall_t + 4, 26, 16]);

        // Weather-Resistant Downward Intake Louvers for Pi 5 Cooler (Rear wall)
        for (i = [-3:3]) {
            translate([chassis_w/2 - 35 + i*8, chassis_d - wall_t - 1, 10])
                rotate([-30, 0, 0])
                    cube([5, wall_t + 3, 3]);
        }

        // Downward Exhaust Louvers (Left side wall)
        for (j = [0:4]) {
            translate([-1, chassis_d - 45 + j*8, 12])
                rotate([0, 30, 0])
                    cube([wall_t + 3, 5, 3]);
        }

        // Isolated Sensor Snorkel Vents (Front-left bottom corner away from Pi CPU)
        for (k = [0:2]) {
            translate([8 + k*6, -1, 6])
                cube([3, wall_t + 2, 8]);
        }

        // Hinge Pin Bore Hole
        translate([-1, chassis_d - 12, base_h - 6])
            rotate([0, 90, 0])
                cylinder(r=1.75, h=chassis_w + 2); // Fits 3mm brass pin / M3 rod
    }

    // INTERNAL COMPARTMENT WALLS & MOUNTS
    // -------------------------------------------------------------
    // SENSOR FIREWALL & DEDICATED MOUNTING CRADLES (Front-Left Corner)
    // Thermal isolation barrier
    translate([wall_t, 34, wall_t])
        cube([36, wall_t, base_h - wall_t - rii_h]);
    translate([36 + wall_t, wall_t, wall_t])
        cube([wall_t, 34, base_h - wall_t - rii_h]);

    // 1. DHT11 Blue Sensor Cradle (15.5mm x 12.5mm form-fit slot)
    translate([wall_t + 3, 5, wall_t]) {
        difference() {
            cube([18.5, 15.5, 7]);
            translate([1.5, 1.5, 1]) cube([15.5, 12.5, 7]); // Snug pocket for DHT11
            translate([4, -1, 0]) cube([10, 4, 5]);         // Airflow cutout to grill
        }
    }

    // 2. BMP180 Pressure Sensor Standoff (13mm x 10mm breakout post)
    translate([wall_t + 25, 8, wall_t]) {
        difference() {
            cylinder(r=2.5, h=5.5);
            cylinder(r=1.0, h=6.5); // M2 screw pilot
        }
    }

    // 3. KY-001 Temperature Sensor Standoff
    translate([wall_t + 25, 24, wall_t]) {
        difference() {
            cylinder(r=2.5, h=5.5);
            cylinder(r=1.0, h=6.5); // M2 screw pilot
        }
    }

    // Sensor Wire Pass-Through Tunnel into Pi 5 Bay
    translate([20, 33, wall_t]) {
        difference() {
            cube([12, wall_t + 2, 8]);
            translate([1, -1, 1]) cube([10, wall_t + 4, 6]); // Tunnel for 4 jumper wires
        }
    }

    // Anker Power Bank Retention Rails (Front lower chamber)
    translate([(chassis_w - anker_l)/2 - wall_t, 6, wall_t]) {
        cube([wall_t, anker_w, anker_h]);
    }
    translate([(chassis_w + anker_l)/2, 6, wall_t]) {
        cube([wall_t, anker_w, anker_h]);
    }

    // Raspberry Pi 5 Mounting Standoffs (Rear Chamber)
    pi_x_offset = chassis_w/2 - pi5_l/2;
    pi_y_offset = chassis_d - wall_t - pi5_w - 12;
    standoff_h = 5.0;

    translate([pi_x_offset, pi_y_offset, wall_t]) {
        // 4x Pi 5 standard mounting holes (58mm x 49mm)
        pi_standoff(0, 0, standoff_h);
        pi_standoff(58, 0, standoff_h);
        pi_standoff(0, 49, standoff_h);
        pi_standoff(58, 49, standoff_h);
    }

    // VK-162 GPS Puck Mounting Cradle (Top rear deck, points straight at sky)
    translate([wall_t + 4, chassis_d - 48, base_h - 10]) {
        difference() {
            cube([42, 38, 8]);
            translate([2, 2, 2]) cube([38, 34, 8]); // Pocket for GPS receiver
        }
    }

    // 4x Keyboard Tray Neodymium Magnet Sockets (5.2mm diameter x 2.2mm depth)
    translate([(chassis_w - rii_l)/2 + 10, 14, base_h - rii_h - 2]) magnet_socket();
    translate([(chassis_w + rii_l)/2 - 10, 14, base_h - rii_h - 2]) magnet_socket();
    translate([(chassis_w - rii_l)/2 + 10, 8 + rii_w - 8, base_h - rii_h - 2]) magnet_socket();
    translate([(chassis_w + rii_l)/2 - 10, 8 + rii_w - 8, base_h - rii_h - 2]) magnet_socket();

    // Hinge Knuckles (Base side)
    translate([12, chassis_d - 12, base_h - 6]) hinge_knuckle(20);
    translate([chassis_w - 32, chassis_d - 12, base_h - 6]) hinge_knuckle(20);
}

// -----------------------------------------------------------------------------
// 4. TOP SCREEN LID (Freenove 5.0" DSI Display)
// -----------------------------------------------------------------------------
module screen_lid() {
    color([0.28, 0.30, 0.32]) // Slightly lighter tactical olive/graphite
    difference() {
        // Outer Lid Shell
        rounded_box(chassis_w, chassis_d, lid_h, corner_r);

        // Screen Cavity
        translate([wall_t, wall_t, wall_t])
            rounded_box(chassis_w - wall_t*2, chassis_d - wall_t*2, lid_h + 2, corner_r - 1.5);

        // Active Display Viewport Window with 45° Sun Hood Bezel
        translate([(chassis_w - screen_glass_w)/2, (chassis_d - screen_glass_h)/2 + 8, -1]) {
            cube([screen_glass_w, screen_glass_h, wall_t + 2]);
        }

        // DSI Ribbon Cable Pass-Through Slot (Near hinge)
        translate([chassis_w/2 - 25, chassis_d - 22, -1])
            cube([50, 4, lid_h + 2]);

        // Hinge Pin Bore Hole
        translate([-1, chassis_d - 12, 6])
            rotate([0, 90, 0])
                cylinder(r=1.75, h=chassis_w + 2);
    }

    // Screen Mounting Posts (M2.5 brass heat-set inserts or screws)
    sx = (chassis_w - screen_w)/2;
    sy = (chassis_d - screen_h)/2 + 8;
    translate([sx, sy, wall_t]) {
        screen_post(4, 4);
        screen_post(screen_w - 4, 4);
        screen_post(4, screen_h - 4);
        screen_post(screen_w - 4, screen_h - 4);
    }

    // Hinge Center Knuckle (Mates with base knuckles)
    translate([36, chassis_d - 12, 6])
        hinge_knuckle(chassis_w - 72);
}

// -----------------------------------------------------------------------------
// 5. BATTERY CHARGING SNAP DOOR
// -----------------------------------------------------------------------------
module battery_charging_door() {
    color([0.15, 0.65, 0.45]) // BushNet Emerald accent
    difference() {
        union() {
            // Door Plate
            cube([wall_t + 0.5, 27.5, 17.5]);

            // Snap Latch Lip
            translate([wall_t, 2, 3])
                cube([2, 4, 11]);

            // Weather Seal Gasket Ridge
            translate([wall_t, 5, 2])
                cube([1.5, 18, 13.5]);
        }
        // Finger Grip Grooves
        for (g = [0:3]) {
            translate([-0.5, 8 + g*3, 2])
                cube([1, 1.5, 13]);
        }
    }
}

// -----------------------------------------------------------------------------
// 6. HELPER MODULES & HARDWARE MOCKUPS
// -----------------------------------------------------------------------------
module rounded_box(x, y, z, r) {
    hull() {
        translate([r, r, 0]) cylinder(r=r, h=z);
        translate([x - r, r, 0]) cylinder(r=r, h=z);
        translate([r, y - r, 0]) cylinder(r=r, h=z);
        translate([x - r, y - r, 0]) cylinder(r=r, h=z);
    }
}

module pi_standoff(x, y, h) {
    translate([x, y, 0]) {
        difference() {
            cylinder(r=3.2, h=h);
            cylinder(r=1.2, h=h + 1); // M2.5 screw pilot hole
        }
    }
}

module screen_post(x, y) {
    translate([x, y, 0]) {
        difference() {
            cylinder(r=3.0, h=4.5);
            cylinder(r=1.2, h=5.5);
        }
    }
}

module magnet_socket() {
    cylinder(r=2.6, h=2.5); // 5.2mm diameter for 5mm neodymium disc
}

module hinge_knuckle(length) {
    rotate([0, 90, 0]) {
        difference() {
            cylinder(r=5.5, h=length);
            cylinder(r=1.8, h=length + 1); // 3mm pin clearance
        }
    }
}

module hardware_mockups() {
    // 1. Anker PowerCore III 20000mAh (Black rounded brick)
    translate([(chassis_w - anker_l)/2, 8, wall_t]) {
        color([0.1, 0.1, 0.1, 0.65])
            rounded_box(anker_l, anker_w, anker_h, 4);
    }

    // 2. Rii Mini X1 Keyboard (Matte black with touch pad)
    translate([(chassis_w - rii_l)/2, 8, base_h - rii_h]) {
        color([0.15, 0.15, 0.18, 0.75])
            rounded_box(rii_l, rii_w, rii_h, 3);
    }

    // 3. Raspberry Pi 5 + Cooler (Green PCB)
    translate([chassis_w/2 - pi5_l/2, chassis_d - wall_t - pi5_w - 12, wall_t + 5]) {
        color([0.1, 0.6, 0.2, 0.8])
            cube([pi5_l, pi5_w, 2]); // PCB
        translate([15, 8, 2])
            color([0.3, 0.3, 0.3, 0.8])
                cube([45, 40, 12]); // Active Cooler
    }

    // 4. VK-162 GPS (Square black puck)
    translate([wall_t + 6, chassis_d - 46, base_h - 8]) {
        color([0.05, 0.05, 0.05, 0.85])
            cube([38, 34, 14]);
    }
}
