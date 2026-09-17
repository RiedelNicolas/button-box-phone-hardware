# Telephone Soundboard / Teléfono Soundboard 📞🔊

Interactive 3D Engineering Blueprint for the **Telephone Soundboard** hardware modding project.

A classic push-button landline telephone converted into an autonomous soundboard playing pre-recorded MP3 tracks upon pressing its original keys (K1 through K5), using the mechanical hook switch as the master power cut-off for a true **0.000 µA standby current**.

---

## 🚀 Live Demo & CI/CD Deployment

This project includes a fully automated **GitHub Actions CI/CD workflow** ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)) that validates code and deploys the blueprint to **GitHub Pages**.

### Enable GitHub Pages in your repository:
1. Go to your GitHub repository: `https://github.com/RiedelNicolas/button-box-phone-hardware`
2. Click **Settings** > **Pages** (in the left sidebar).
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Push to `main` (or trigger manually via the **Actions** tab with "Run workflow").
5. Your live site will be published automatically at:  
   👉 **`https://riedelnicolas.github.io/button-box-phone-hardware/`**

---

## 💻 Local Quickstart / Inicio Rápido Local

Run a local server with Python or Node:

```bash
# Option 1: Python 3
python3 -m http.server 8080

# Option 2: Node / npx
npx serve -l 8080 .
```

Open [http://localhost:8080](http://localhost:8080) in any modern browser.

---

## 🌐 Language Selector / Selector de Idioma

The blueprint features an instant language switcher at the top right of the CAD header:
- **`EN`**: Full English technical documentation and interface.
- **`ES`**: Documentación técnica e interfaz completa en castellano.

Your language selection is saved automatically in `localStorage`.

---

## 🎨 Distinct Color-Coded Trigger Keys (1 - 5)

All trigger buttons on both the **3D Telephone Keypad** and the **3D Breadboard Circuit** are clearly elevated and color-coded to match their signal routing, without visual clutter on the button face:

| Key / Pin | Color Code | Hex Code | Default Soundboard Track |
| :---: | :---: | :---: | :--- |
| **1** (Pin K1) | **Emerald Green** | `#10b981` | Retro Chime & Greeting (`00001.mp3`) |
| **2** (Pin K2) | **Electric Blue** | `#3b82f6` | 56k Modem Handshake Sequence (`00002.mp3`) |
| **3** (Pin K3) | **Purple** | `#8b5cf6` | Telco SIT Error Tone (`00003.mp3`) |
| **4** (Pin K4) | **Amber Orange** | `#f59e0b` | Cartoon Boing Sound Effect (`00004.mp3`) |
| **5** (Pin K5) | **Crimson Red** | `#ef4444` | 8-Bit Victory Fanfare (`00005.mp3`) |

Keys 6, 7, 8, 9, *, 0, and # are styled in clean white with crisp slate numbering.

---

## 📐 3D Blueprint Modes

1. **Complete Phone (`Teléfono Completo`):** Side-by-side classic telephone layout (cradle on the left, keypad on the right, zero superposition) with interactive hook switch plungers, liftable handset, and dynamic coiled cord.
2. **Breadboard PoC (`Banco PoC`):** Desktop bench setup with MB102 power module, JQ6500-16P module, 5 tactile pushbuttons, 8Ω mini speaker, and color-matched Dupont jumpers.
3. **Internal Modding & Schematic (`Modding Interno`):** Transparent X-Ray view demonstrating the mechanical hook switch series cut-off of the +5V line (0µA) and the internal earpiece speaker.
