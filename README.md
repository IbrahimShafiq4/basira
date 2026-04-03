# 👁️ بصيرة — تطبيق التذكير اليومي للصم
## Daily Reminder PWA for Deaf & Hard-of-Hearing Users

---

## 🚀 Quick Start (Run Locally)

### Option 1 — Python (Simplest)
```bash
# Navigate to the app folder
cd deaf-reminder-app

# Python 3
python3 -m http.server 8080

# Then open: http://localhost:8080
```

### Option 2 — Node.js / npx
```bash
cd deaf-reminder-app
npx serve .
# Or: npx http-server . -p 8080
```

### Option 3 — VS Code Live Server
1. Install the **Live Server** extension
2. Right-click `index.html` → **Open with Live Server**

> ⚠️ PWA features (Service Worker, Install prompt) require **HTTPS** in production.
> For local dev, `localhost` is treated as secure by browsers.

---

## 📁 Project Structure

```
deaf-reminder-app/
├── index.html          ← Main HTML (single page app)
├── style.css           ← Full design system + animations
├── script.js           ← All app logic (modular, commented)
├── manifest.json       ← PWA manifest
├── service-worker.js   ← Offline caching
├── generate_icons.py   ← Icon generator script
├── assets/
│   ├── icons/          ← PWA icons (72–512px, PNG + SVG)
│   └── screenshots/    ← App screenshots (optional)
└── README.md
```

---

## ✨ Features

### 🔔 Visual Alert System
- Full-screen overlay when a task time arrives
- **Flashing background** animation
- **Shake animation** (simulates vibration)
- **Pulse animation** on icon
- Repeats every N seconds (configurable: 3/5/10/15s)
- **No auto-dismiss** — requires user to press "تم ✓"

### 📋 Task Management
- Add / Edit / Delete tasks
- Each task has: Title, Description, Time, Icon (12 options), Color tag (8 colors)
- Enable/Disable tasks per day
- Mark tasks as Done

### 🕌 Quick Templates
- Fajr / Dhuhr / Asr / Maghrib / Isha prayers
- Medicine reminder
- Meeting reminder
- One-tap to pre-fill the form

### 📅 Calendar View
- Full monthly calendar
- Highlighted days with tasks
- Click any day to view its tasks
- Navigate months

### ⚙️ Settings
- Dark / Light mode toggle
- Vibration API toggle
- Browser notifications permission
- Repeat interval selector
- Clear all data

### 📱 PWA Capabilities
- **Installable** (Add to Home Screen)
- **Offline support** via Service Worker
- **Standalone** display (no browser UI)
- RTL Arabic layout

---

## 🎨 Design System

| Token | Value |
|-------|-------|
| Primary | `#6C63FF` |
| Font | Cairo / Tajawal (Google Fonts) |
| Border Radius | 12–32px |
| Animations | Spring easing, 150–400ms |
| Layout | Mobile-first, max-width 390px |

---

## 🔧 Customization

### Add new templates
In `script.js`, add to the `TEMPLATES` object:
```js
custom: {
  title: 'عنوانك',
  desc:  'وصف المهمة',
  icon:  '🎯',
  color: '#45B7D1',
  time:  '09:00'
}
```
Then add a chip button in `index.html`.

### Change alert repeat interval default
In `script.js`, change `DEFAULT_SETTINGS.repeatInterval` (seconds).

### Add more icons
In `index.html`, add more `.icon-opt` buttons inside `#iconPicker`.

---

## 🌐 Deploy to Production

### Netlify (Free)
```bash
# Drag & drop the folder at netlify.com/drop
```

### GitHub Pages
```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR_USER/basira.git
git push -u origin main
# Enable Pages in repo settings → main branch
```

### Vercel
```bash
npx vercel --prod
```

> Remember: HTTPS is required for Service Workers & Install prompts in production.

---

## 📖 Technical Notes

- **No frameworks** — pure HTML/CSS/Vanilla JS
- **localStorage** for all persistence
- **Notification API** for system notifications
- **Vibration API** for haptic feedback
- **Service Worker** with cache-first strategy
- Modular JS functions, each well-commented
- Supports RTL Arabic layout natively

---

## ♿ Accessibility

- High contrast color system
- Large touch targets (min 44px)
- ARIA labels on icon buttons
- RTL/LTR direction awareness
- Large readable text (Cairo font)
- Dark mode for reduced eye strain

---

*بصيرة — Vision for all* 👁️
