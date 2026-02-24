# Modern Enterprise Glassmorphism Design System

Ein wiederverwendbares Design-System für professionelle B2B/SaaS-Anwendungen.

## 🎨 Design-Philosophie

**Kernprinzipien:**
- **Glassmorphism** - Halbtransparente Elemente mit Blur-Effekten
- **Dark-Mode-First** - Optimiert für dunkle Themes mit Light-Mode-Support
- **Semantic Tokens** - Alle Farben über CSS-Variablen
- **Micro-Animations** - Subtile, performante Animationen
- **Status-Driven** - Klare visuelle Hierarchie durch Farben

---

## 📦 1. CSS Variables (index.css)

Kopiere diesen Code in deine `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* ===== CORE PALETTE ===== */
    --background: 210 20% 98%;
    --foreground: 220 30% 15%;

    --card: 0 0% 100%;
    --card-foreground: 220 30% 15%;

    --popover: 0 0% 100%;
    --popover-foreground: 220 30% 15%;

    /* Primary - Deep Navy (Vertrauenswürdig, Professionell) */
    --primary: 220 60% 20%;
    --primary-foreground: 0 0% 100%;

    /* Secondary - Light Gray (Neutral, Clean) */
    --secondary: 210 15% 95%;
    --secondary-foreground: 220 30% 25%;

    --muted: 210 15% 92%;
    --muted-foreground: 220 10% 50%;

    /* Accent - Teal (Modern, Aktiv) */
    --accent: 175 60% 40%;
    --accent-foreground: 0 0% 100%;

    --destructive: 0 72% 55%;
    --destructive-foreground: 0 0% 100%;

    --border: 210 20% 90%;
    --input: 210 20% 90%;
    --ring: 175 60% 40%;

    --radius: 0.5rem;

    /* ===== STATUS COLORS ===== */
    --status-shipped: 160 70% 40%;     /* Grün - Erfolg/Abgeschlossen */
    --status-processing: 200 80% 50%;  /* Blau - In Bearbeitung */
    --status-pending: 40 90% 50%;      /* Gelb/Orange - Wartend */
    --status-exception: 0 72% 55%;     /* Rot - Fehler/Problem */
    --status-return: 280 60% 50%;      /* Lila - Retoure/Spezial */

    /* ===== GRADIENTS ===== */
    --gradient-hero: linear-gradient(135deg, hsl(220 60% 20%) 0%, hsl(220 50% 30%) 100%);
    --gradient-card: linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(210 20% 98%) 100%);
    --gradient-accent: linear-gradient(135deg, hsl(175 60% 40%) 0%, hsl(175 50% 50%) 100%);

    /* ===== SHADOWS ===== */
    --shadow-sm: 0 1px 2px 0 hsl(220 30% 15% / 0.05);
    --shadow-md: 0 4px 6px -1px hsl(220 30% 15% / 0.07), 0 2px 4px -2px hsl(220 30% 15% / 0.05);
    --shadow-lg: 0 10px 15px -3px hsl(220 30% 15% / 0.08), 0 4px 6px -4px hsl(220 30% 15% / 0.05);
    --shadow-card: 0 1px 3px hsl(220 30% 15% / 0.06), 0 1px 2px hsl(220 30% 15% / 0.04);

    /* ===== SIDEBAR ===== */
    --sidebar-background: 220 60% 20%;
    --sidebar-foreground: 210 20% 90%;
    --sidebar-primary: 175 60% 50%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 220 50% 28%;
    --sidebar-accent-foreground: 0 0% 100%;
    --sidebar-border: 220 50% 25%;
    --sidebar-ring: 175 60% 50%;
  }

  .dark {
    --background: 220 30% 8%;
    --foreground: 210 20% 95%;

    --card: 220 30% 12%;
    --card-foreground: 210 20% 95%;

    --popover: 220 30% 12%;
    --popover-foreground: 210 20% 95%;

    --primary: 175 60% 50%;
    --primary-foreground: 220 30% 8%;

    --secondary: 220 25% 16%;
    --secondary-foreground: 210 20% 90%;

    --muted: 220 25% 16%;
    --muted-foreground: 210 15% 65%;

    --accent: 175 60% 50%;
    --accent-foreground: 220 30% 8%;

    --destructive: 0 65% 55%;
    --destructive-foreground: 0 0% 100%;

    --border: 220 25% 22%;
    --input: 220 25% 22%;
    --ring: 175 60% 50%;

    /* Dark Mode Status - Höherer Kontrast */
    --status-shipped: 160 70% 50%;
    --status-processing: 200 80% 55%;
    --status-pending: 40 90% 55%;
    --status-exception: 0 72% 60%;
    --status-return: 280 60% 60%;

    --sidebar-background: 220 35% 6%;
    --sidebar-foreground: 210 20% 92%;
    --sidebar-primary: 175 60% 50%;
    --sidebar-primary-foreground: 220 30% 8%;
    --sidebar-accent: 220 30% 14%;
    --sidebar-accent-foreground: 210 20% 95%;
    --sidebar-border: 220 25% 16%;
    --sidebar-ring: 175 60% 50%;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
    font-family: 'Inter', system-ui, sans-serif;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Inter', system-ui, sans-serif;
    font-weight: 600;
  }
}

/* ===== UTILITY CLASSES ===== */
@layer utilities {
  /* Text Gradient */
  .text-gradient {
    @apply bg-clip-text text-transparent;
    background-image: var(--gradient-accent);
  }

  /* Shadows */
  .shadow-card {
    box-shadow: var(--shadow-card);
  }

  .shadow-elevated {
    box-shadow: var(--shadow-lg);
  }

  /* Glassmorphism */
  .glass {
    @apply backdrop-blur-md bg-white/70 dark:bg-black/40;
  }

  .glass-card {
    @apply backdrop-blur-md bg-white/80 dark:bg-card/80 border border-white/20 dark:border-white/10;
  }

  .glass-strong {
    @apply backdrop-blur-xl bg-white/90 dark:bg-card/90;
  }

  /* Glow Effects */
  .glow-accent {
    box-shadow: 0 0 20px hsl(var(--accent) / 0.3), 0 0 40px hsl(var(--accent) / 0.15);
  }

  .glow-success {
    box-shadow: 0 0 20px hsl(var(--status-shipped) / 0.3), 0 0 40px hsl(var(--status-shipped) / 0.15);
  }

  .glow-warning {
    box-shadow: 0 0 20px hsl(var(--status-pending) / 0.3), 0 0 40px hsl(var(--status-pending) / 0.15);
  }

  .glow-danger {
    box-shadow: 0 0 20px hsl(var(--status-exception) / 0.3), 0 0 40px hsl(var(--status-exception) / 0.15);
  }

  /* Gradient Border */
  .gradient-border {
    position: relative;
  }

  .gradient-border::before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: inherit;
    background: linear-gradient(135deg, hsl(var(--accent) / 0.5), transparent 50%, hsl(var(--primary) / 0.3));
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
  }

  /* Animation Classes */
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }

  .animate-slide-up {
    animation: slideUp 0.4s ease-out;
  }

  .animate-scale-in {
    animation: scaleIn 0.3s ease-out;
  }

  .animate-glow-pulse {
    animation: glowPulse 2s ease-in-out infinite;
  }
}

/* ===== KEYFRAMES ===== */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { 
    opacity: 0;
    transform: translateY(10px);
  }
  to { 
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes glowPulse {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 20px hsl(var(--accent) / 0.2);
  }
  50% {
    opacity: 0.8;
    box-shadow: 0 0 30px hsl(var(--accent) / 0.4);
  }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    hsl(var(--muted)) 0%,
    hsl(var(--muted-foreground) / 0.1) 50%,
    hsl(var(--muted)) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}

/* Card Entrance with Stagger */
@keyframes cardEntrance {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-card-entrance {
  animation: cardEntrance 0.5s ease-out forwards;
}

.animate-card-entrance-1 { animation-delay: 0ms; }
.animate-card-entrance-2 { animation-delay: 100ms; }
.animate-card-entrance-3 { animation-delay: 200ms; }
.animate-card-entrance-4 { animation-delay: 300ms; }

/* Interactive Cards */
.card-interactive {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.card-interactive:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  border-color: hsl(var(--accent) / 0.3);
}

/* Button Lift Effect */
.btn-lift {
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}

.btn-lift:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px hsl(var(--primary) / 0.25);
}

/* Theme Transition */
.theme-transition * {
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.2s ease !important;
}
```

---

## 📦 2. Tailwind Config (tailwind.config.ts)

```typescript
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
        },
        status: {
          shipped: "hsl(var(--status-shipped))",
          processing: "hsl(var(--status-processing))",
          pending: "hsl(var(--status-pending))",
          exception: "hsl(var(--status-exception))",
          return: "hsl(var(--status-return))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'elevated': 'var(--shadow-lg)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
```

---

## 🧩 3. Beispiel-Komponenten

### Glass Card

```tsx
export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(
      "glass-card rounded-xl p-6 shadow-card",
      "gradient-border",
      "hover:shadow-elevated hover:scale-[1.02] transition-all duration-300",
      className
    )}>
      {children}
    </div>
  );
}
```

### Metric Card

```tsx
export function MetricCard({ title, value, icon, trend }: MetricCardProps) {
  return (
    <div className="glass-card gradient-border rounded-xl p-5 
                    hover:shadow-elevated hover:scale-[1.02] hover:-translate-y-1 
                    transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-xl 
                        bg-accent/10 text-accent">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/30">
          <span className={cn(
            "px-2 py-0.5 rounded-full text-xs font-medium",
            trend.isPositive 
              ? "bg-status-shipped/10 text-status-shipped" 
              : "bg-status-exception/10 text-status-exception"
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        </div>
      )}
    </div>
  );
}
```

### Status Badge

```tsx
const statusStyles = {
  shipped: "bg-status-shipped/10 text-status-shipped",
  processing: "bg-status-processing/10 text-status-processing",
  pending: "bg-status-pending/10 text-status-pending",
  exception: "bg-status-exception/10 text-status-exception",
  return: "bg-status-return/10 text-status-return",
};

export function StatusBadge({ status }: { status: keyof typeof statusStyles }) {
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-xs font-medium",
      statusStyles[status]
    )}>
      {status}
    </span>
  );
}
```

---

## 🎨 4. Farbpaletten-Varianten

### Option A: Teal/Navy (Default - wie diese App)
```css
--primary: 220 60% 20%;   /* Deep Navy */
--accent: 175 60% 40%;    /* Teal */
```

### Option B: Purple/Violet (SaaS/Creative)
```css
--primary: 260 60% 25%;   /* Deep Purple */
--accent: 280 70% 55%;    /* Bright Violet */
```

### Option C: Green/Emerald (Fintech/Sustainability)
```css
--primary: 160 60% 15%;   /* Deep Forest */
--accent: 155 70% 45%;    /* Emerald */
```

### Option D: Orange/Warm (E-Commerce/Energy)
```css
--primary: 25 80% 20%;    /* Deep Brown */
--accent: 25 90% 55%;     /* Vibrant Orange */
```

---

## 📝 5. Best Practices

### ✅ DO:
- Immer `hsl(var(--token))` verwenden, nie direkte Farben
- `glass-card` für erhöhte Elemente
- `animate-fade-in` für erscheinende Elemente
- Status-Farben für Zustände konsistent verwenden

### ❌ DON'T:
- Keine `text-white` oder `bg-black` direkt verwenden
- Keine hardcoded Shadows wie `shadow-lg` ohne Token
- Keine Animationen länger als 0.5s (außer Loops)

---

## 🔧 6. Setup-Checkliste

1. [ ] `index.css` kopieren
2. [ ] `tailwind.config.ts` anpassen
3. [ ] Inter Font in `index.html` laden:
   ```html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
   ```
4. [ ] `tailwindcss-animate` Plugin installieren:
   ```bash
   npm install tailwindcss-animate
   ```
5. [ ] Theme-Toggle implementieren (next-themes empfohlen)

---

## 📚 Inspiration & Referenzen

- [Linear.app](https://linear.app) - Developer-focused SaaS
- [Vercel Dashboard](https://vercel.com) - Modern cloud UI
- [Stripe Dashboard](https://stripe.com) - Data visualization
- [Apple Human Interface Guidelines](https://developer.apple.com/design/)
- [Shadcn/ui](https://ui.shadcn.com) - Component library

---

**Version:** 1.0  
**Erstellt:** Januar 2026  
**Lizenz:** MIT - Frei verwendbar
