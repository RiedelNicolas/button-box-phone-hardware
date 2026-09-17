/**
 * Internationalization (i18n) dictionary for Teléfono Soundboard Blueprint
 * Complete support for English (EN) and Spanish (ES).
 */

export const translations = {
  en: {
    // Header
    projectTitle: "Telephone Soundboard",
    projectBadge: "BLUEPRINT V1.0",
    projectSub: "REV 1.0 • AUTONOMOUS HARDWARE SCHEMATIC • 0µA PHYSICAL POWER CUTOFF",
    statusStandby: "0 µA COMPLETE CUT-OFF (HUNG UP)",
    statusLive: "5V LIVE (OFF-HOOK)",
    currentActive: "~45 mA (Active)",
    currentStandby: "0.000 µA (Physically Open)",

    // View Tabs
    viewPhone: "Complete Phone",
    viewBreadboard: "Breadboard PoC",
    viewModding: "Internal Modding & Schematic",

    // Context Banners
    contextPhone: "<strong>View: Complete Telephone</strong> — Click the handset to lift/dock (ON/OFF) or click keys 1-5 to trigger audio clips.",
    contextBreadboard: "<strong>View: PoC Bench (Phase 1)</strong> — Desktop test circuit on breadboard with MB102, JQ6500-16P, 5 pushbuttons and 8Ω mini speaker.",
    contextModding: "<strong>View: Internal Modding & Wiring</strong> — Internal architecture with hook switch in series with 5V positive (0µA cut-off) and speaker in earpiece.",

    // Floating Controls
    btnLiftHandset: "Lift Handset (5V ON)",
    btnDropHandset: "Hang Up (0µA)",
    btnXray: "X-Ray / Cutaway",
    btnResetCam: "Reset View",
    volLabel: "VOL",

    // Sidebar Tabs
    tabConcept: "1. Concept",
    tabBom: "2. BOM",
    tabArch: "3. Wiring",
    tabPlan: "4. Roadmap",
    tabSound: "5. Sounds",

    // Tab 1: Concept
    conceptTitle: "General Concept",
    conceptSubtitle: "A classic landline push-button telephone modified into an autonomous soundboard playing pre-recorded MP3s upon pressing its original keys, leveraging the mechanical hook switch as the master power cut-off.",
    cardZeroPowerTitle: "0 µA Physical Cutoff Principle",
    cardZeroPowerText: "Unlike microcontrollers kept in continuous Deep Sleep (which still draw 15 to 80 mA), this design routes the mechanical hook switch contacts directly in series with the positive 5V supply line.",
    metricStandbyLabel: "Standby Draw",
    metricBootLabel: "JQ6500 Boot Time",
    metricFootnote: "*Upon lifting the handset, internal leaf contacts snap closed instantly, powering up the JQ6500 module with zero perceptible lag.",
    cardAutonomousTitle: "Autonomous Key Trigger Mode (Key Mode)",
    cardAutonomousText: "The JQ6500-16P module features 5 dedicated hardware trigger pins (<strong>K1 through K5</strong>). Pulling any pin to ground (GND) via a momentary push immediately fires the assigned track without requiring an Arduino or microcontroller.",
    cardAcousticTitle: "Concealed Earpiece Acoustics",
    cardAcousticText: "The slim 8Ω mini speaker replaces the original carbon/dynamic earpiece capsule inside the handset. Audio plays directly into the user's ear for an authentic telephone call feel.",

    // Tab 2: BOM
    bomTitle: "Bill of Materials (BOM)",
    bomSubtitle: "Complete list of components required for Phase 1 (Desktop PoC) and the final modified telephone. Click 'View' to focus the 3D camera on any part.",
    bomSectionPoc: "Proof of Concept (PoC Bench)",
    bomSectionFinal: "Final Hardware (Telephone Chassis)",
    colComponent: "Component",
    colQty: "Qty",
    colDetail: "Details",
    col3D: "3D",
    btnView3D: "🔍 View",

    // BOM items
    bomJQ6500: "JQ6500-16P MP3 Module (2MB/4MB SPI Flash)",
    bomMB102: "MB102 Breadboard Power Supply (3.3V/5V)",
    bomSpeaker: "Mini Speaker 8Ω 0.5W/1W (slim profile)",
    bomPushbuttons: "5x Tactile Pushbuttons 6x6x5mm",
    bomBreadboard: "Breadboard 400 or 830 tie-points",
    bomPowerSupply: "Switching Adapter 9V/12V DC 1A (5.5x2.1mm)",
    bomDupont: "Dupont Jumpers M-M & M-F (20cm set)",
    bomPhoneChassis: "Vintage Push-button Landline Phone",
    bomHookSwitch: "Mechanical Hook Switch (0µA cut-off)",
    bomKeypad: "Original Keypad Matrix (Keys 1-5 to GND)",

    // Tab 3: Architecture & Wiring
    archTitle: "Connections & JQ6500 Pinout",
    archSubtitle: "Direct hardware wiring without code or microcontrollers. Keypad keys bridge trigger pins directly to ground (Active LOW).",
    cardPowerAudioTitle: "Power & Audio Connections",
    vccDesc: "Pin 1 (VCC) &rarr; Hook Switch Output (+5V)",
    gndDesc: "Pin 4 (GND) &rarr; Common Ground (0V)",
    spkPDesc: "Pin 2 (SPK+) &rarr; Mini Speaker (+)",
    spkMDesc: "Pin 3 (SPK-) &rarr; Mini Speaker (-)",
    cardTriggersTitle: "Keypad Triggers (Active LOW)",
    triggersSubtitle: "Each key connects the trigger pin to ground when pressed. Internal pull-up resistors included in chip.",
    k1Desc: "Pin 15 (K1) &rarr; Original Key [1]",
    k2Desc: "Pin 14 (K2) &rarr; Original Key [2]",
    k3Desc: "Pin 13 (K3) &rarr; Original Key [3]",
    k4Desc: "Pin 12 (K4) &rarr; Original Key [4]",
    k5Desc: "Pin 11 (K5) &rarr; Original Key [5]",
    track1: "Track 00001.mp3",
    track2: "Track 00002.mp3",
    track3: "Track 00003.mp3",
    track4: "Track 00004.mp3",
    track5: "Track 00005.mp3",

    // Tab 4: Roadmap
    planTitle: "Execution Roadmap by Phases",
    planSubtitle: "Step-by-step engineering roadmap from breadboard proof-of-concept to final telephone assembly.",
    progressLabel: "PROJECT PROGRESS",
    progressCompleted: "{percent}% Completed ({checked}/{total} steps)",
    phase1Title: "Phase 1: Desktop PoC Validation",
    phase1Badge: "BREADBOARD",
    phase2Title: "Phase 2: Hardware Adaptation",
    phase2Badge: "MODDING",
    phase3Title: "Phase 3: Final Launch & Assembly",
    phase3Badge: "ASSEMBLY",

    // Phase 1 steps
    step1_1: "Insert MB102 module into breadboard and configure voltage jumpers to 5V.",
    step1_2: "Place JQ6500-16P module straddling the central trough; connect VCC and GND.",
    step1_3: "Solder wire leads to the 8Ω mini speaker and connect to SPK+ and SPK- pins.",
    step1_4: "Insert 5 tactile pushbuttons connecting one lead to GND and the other to K1..K5.",
    step1_5: "Connect JQ6500 to PC via USB; flash audio files named 00001.mp3 through 00005.mp3.",
    step1_6: "Simulate hanging up and lifting by connecting and disconnecting the 5V power line.",

    // Phase 2 steps
    step2_1: "Disassemble telephone chassis and remove obsolete telecom circuit boards.",
    step2_2: "Locate Normally Open (NO) contacts on mechanical hook switch with multimeter.",
    step2_3: "Isolate keypad traces and solder individual wires from keys 1-5 to K1..K5 + GND.",
    step2_4: "Install slim 8Ω mini speaker inside handset earpiece capsule, secure with foam.",
    step2_5: "Route speaker audio wires down through the original coiled handset cord.",

    // Phase 3 steps
    step3_1: "Mount internal 5V regulator and JQ6500 module onto base plate with standoffs.",
    step3_2: "Install 5.5mm DC barrel jack on rear panel for external power adapter.",
    step3_3: "Perform complete functional test: lift -> dial tone / audio -> hang up (0µA cut).",
    step3_4: "Fasten chassis with original screws. Ready for deployment!",

    // Tab 5: Soundboard
    soundTitle: "Virtual Soundboard Console",
    soundSubtitle: "Test real-time audio playback simulating keys K1 through K5, or upload your own custom MP3 tracks.",
    soundTrack1Title: "Track 1: Retro Chime & Greeting",
    soundTrack2Title: "Track 2: 56k Modem Handshake",
    soundTrack3Title: "Track 3: Telco SIT Error Announcement",
    soundTrack4Title: "Track 4: Cartoon Boing FX",
    soundTrack5Title: "Track 5: 8-Bit Victory Fanfare",
    soundBadgeCustom: "Custom MP3",
    uploadTooltip: "Upload custom MP3 file",

    // Toasts & Messages
    toastHungUp: "⚠️ The phone is hung up (0µA). Lift the handset first to power the circuit!",
    toastPlayingTrack: "🔊 Playing Track K{key} (0000{key}.mp3)",
    toastPulseLow: "⚡ LOW pulse on pin K{key} -> Triggering Track",
    toastAudioLoaded: "✅ Custom audio loaded for Key K{key}: {name}",
    toastAudioError: "❌ Failed to decode audio file for K{key}"
  },

  es: {
    // Header
    projectTitle: "Teléfono Soundboard",
    projectBadge: "BLUEPRINT V1.0",
    projectSub: "REV 1.0 • ESQUEMA HARDWARE AUTÓNOMO • CORTE FÍSICO 0µA",
    statusStandby: "0 µA CORTE TOTAL (COLGADO)",
    statusLive: "5V LIVE (DESCOLGADO)",
    currentActive: "~45 mA (Activo)",
    currentStandby: "0.000 µA (Físicamente abierto)",

    // View Tabs
    viewPhone: "Teléfono Completo",
    viewBreadboard: "Banco PoC (Breadboard)",
    viewModding: "Modding Interno & Esquema",

    // Context Banners
    contextPhone: "<strong>Vista: Teléfono Ensamblado</strong> — Hacé clic en el tubo para descolgar (ON) o en las teclas 1-5 para disparar audios.",
    contextBreadboard: "<strong>Vista: Banco PoC (Fase 1)</strong> — Circuito de prueba sobre protoboard con MB102, JQ6500-16P, 5 pulsadores y mini parlante de 8Ω.",
    contextModding: "<strong>Vista: Modding & Ruteo Interno</strong> — Arquitectura interna con el switch de horquilla intercalado en el positivo de 5V (corte 0µA) y parlante en el auricular.",

    // Floating Controls
    btnLiftHandset: "Descolgar Tubo (5V ON)",
    btnDropHandset: "Colgar Tubo (0µA)",
    btnXray: "Rayos X / Corte",
    btnResetCam: "Reset Vista",
    volLabel: "VOL",

    // Sidebar Tabs
    tabConcept: "1. Concepto",
    tabBom: "2. BOM",
    tabArch: "3. Conexiones",
    tabPlan: "4. Plan",
    tabSound: "5. Sonidos",

    // Tab 1: Concept
    conceptTitle: "Concepto General",
    conceptSubtitle: "Un teléfono de línea clásico modificado para reproducir audios MP3 pregrabados al presionar sus teclas originales, utilizando el switch mecánico de la horquilla como llave de corte general de energía.",
    cardZeroPowerTitle: "Principio de Corte 0 µA",
    cardZeroPowerText: "A diferencia de soluciones que mantienen el microcontrolador en modo Deep Sleep (que consumen entre 15 y 80 mA continuos), este diseño intercala el interruptor de la horquilla directamente en el cable positivo de 5V.",
    metricStandbyLabel: "Consumo Colgado",
    metricBootLabel: "Arranque JQ6500",
    metricFootnote: "*Al descolgar, los contactos de lámina metálica se cierran instantáneamente, energizando el módulo JQ6500 de manera transparente para el usuario.",
    cardAutonomousTitle: "Disparo de Audios Autónomo (Key Mode)",
    cardAutonomousText: "El módulo JQ6500-16P posee pines dedicados (<strong>K1 a K5</strong>). Al llevar cualquiera de estos pines a masa (GND) mediante un pulso momentáneo, el chip reproduce de inmediato la pista correspondiente sin requerir Arduino ni programación adicional.",
    cardAcousticTitle: "Acústica Oculta",
    cardAcousticText: "El mini parlante de 8 Ohms reemplaza la antigua cápsula del auricular dentro del tubo telefónico. Esto garantiza que la experiencia sea idéntica a una llamada real: el sonido viaja directamente al oído del usuario.",

    // Tab 2: BOM
    bomTitle: "Lista de Componentes (BOM)",
    bomSubtitle: "Listado completo de componentes para la Fase 1 (PoC en escritorio) y el hardware final. Hacé clic en 'Ver en 3D' para enfocar el modelo.",
    bomSectionPoc: "Prueba de Concepto (PoC)",
    bomSectionFinal: "Hardware Final",
    colComponent: "Componente",
    colQty: "Cant.",
    colDetail: "Detalle / Función",
    col3D: "3D",
    btnView3D: "🔍 Ver",

    // BOM items
    bomJQ6500: "JQ6500-16P Módulo MP3 2MB/4MB Flash",
    bomMB102: "Fuente MB102 3.3V/5V protoboard",
    bomSpeaker: "Mini Parlante 8Ω 0.5W/1W slim chato",
    bomPushbuttons: "5x Pulsadores táctiles 6x6x5mm",
    bomBreadboard: "Protoboard 400 u 830 puntos",
    bomPowerSupply: "Fuente Switching 9V o 12V DC 1A (5.5x2.1mm)",
    bomDupont: "Cables Dupont M-M y M-H (set 20cm)",
    bomPhoneChassis: "Teléfono Clásico a botonera",
    bomHookSwitch: "Switch de Horquilla (corte 0µA)",
    bomKeypad: "Teclado Original (teclas 1-5 a masa)",

    // Tab 3: Architecture & Wiring
    archTitle: "Conexiones & Pinout JQ6500",
    archSubtitle: "Mapeo directo de hardware sin microcontrolador. Las teclas puentean los pines de disparo a GND.",
    cardPowerAudioTitle: "Alimentación y Audio",
    vccDesc: "Pin 1 (VCC) &rarr; Salida Horquilla (+5V)",
    gndDesc: "Pin 4 (GND) &rarr; Masa Común (0V)",
    spkPDesc: "Pin 2 (SPK+) &rarr; Parlante Borne (+)",
    spkMDesc: "Pin 3 (SPK-) &rarr; Parlante Borne (-)",
    cardTriggersTitle: "Disparadores de Teclado (Active LOW)",
    triggersSubtitle: "Cada tecla conecta el pin a masa al ser pulsada. Pull-up integrado en chip.",
    k1Desc: "Pin 15 (K1) &rarr; Tecla [1] original",
    k2Desc: "Pin 14 (K2) &rarr; Tecla [2] original",
    k3Desc: "Pin 13 (K3) &rarr; Tecla [3] original",
    k4Desc: "Pin 12 (K4) &rarr; Tecla [4] original",
    k5Desc: "Pin 11 (K5) &rarr; Tecla [5] original",
    track1: "Pista 00001.mp3",
    track2: "Pista 00002.mp3",
    track3: "Pista 00003.mp3",
    track4: "Pista 00004.mp3",
    track5: "Pista 00005.mp3",

    // Tab 4: Roadmap
    planTitle: "Plan de Ejecución por Fases",
    planSubtitle: "Hoja de ruta paso a paso desde el prototipo en protoboard hasta el ensamblaje en el teléfono.",
    progressLabel: "PROGRESO DEL PROYECTO",
    progressCompleted: "{percent}% Completado ({checked}/{total} pasos)",
    phase1Title: "Fase 1: Validación PoC en Escritorio",
    phase1Badge: "PROTOBOARD",
    phase2Title: "Fase 2: Adaptación del Hardware",
    phase2Badge: "MODDING",
    phase3Title: "Fase 3: Lanzamiento y Ensamblaje",
    phase3Badge: "FINAL",

    // Phase 1 steps
    step1_1: "Montar MB102 en la protoboard y configurar selectores en 5V.",
    step1_2: "Insertar JQ6500-16P en la ranura central y conectar pines VCC y GND.",
    step1_3: "Soldar cables al mini parlante de 8Ω y conectar a SPK+ y SPK-.",
    step1_4: "Cablear los 5 pulsadores táctiles entre K1..K5 y el riel GND.",
    step1_5: "Conectar JQ6500 a la PC por USB y cargar los audios 00001.mp3 a 00005.mp3.",
    step1_6: "Simular acción de colgar/descolgar desconectando el cable de 5V.",

    // Phase 2 steps
    step2_1: "Desarmar el teléfono de línea y retirar circuitos obsoletos.",
    step2_2: "Identificar con multímetro los contactos Normal Abierto (NO) de la horquilla.",
    step2_3: "Aislar las pistas del teclado original y soldar cables a las teclas 1 a 5.",
    step2_4: "Instalar el mini parlante dentro de la cápsula del auricular del tubo.",
    step2_5: "Ruter los cables de audio a través del cable espiralado original.",

    // Phase 3 steps
    step3_1: "Fijar el módulo JQ6500 y la fuente dentro del chasis con separadores.",
    step3_2: "Montar conector DC 5.5mm en la parte trasera del teléfono.",
    step3_3: "Realizar prueba de ciclo completo: descolgar -> audio -> colgar (corte 0µA).",
    step3_4: "Cerrar carcasa con sus tornillos originales. ¡Listo para la cancha!",

    // Tab 5: Soundboard
    soundTitle: "Consola Soundboard Virtual",
    soundSubtitle: "Probá el disparo de audio en tiempo real simulando las teclas K1 a K5 o cargá tus propios archivos MP3.",
    soundTrack1Title: "Pista 1: Saludo & Chime Vintage",
    soundTrack2Title: "Pista 2: Handshake Módem 56k",
    soundTrack3Title: "Pista 3: Tono SIT Error Telco",
    soundTrack4Title: "Pista 4: Efecto Cartoon Boing",
    soundTrack5Title: "Pista 5: Fanfarria Victoria 8-Bit",
    soundBadgeCustom: "MP3 Personalizado",
    uploadTooltip: "Cargar MP3 personalizado",

    // Toasts & Messages
    toastHungUp: "⚠️ El teléfono está colgado (0µA). ¡Descolgalo primero para energizar el circuito!",
    toastPlayingTrack: "🔊 Reproduciendo Pista K{key} (0000{key}.mp3)",
    toastPulseLow: "⚡ Pulso LOW en pin K{key} -> Reproduciendo Pista",
    toastAudioLoaded: "✅ Audio cargado para Tecla K{key}: {name}",
    toastAudioError: "❌ Error al procesar audio para K{key}"
  }
};
