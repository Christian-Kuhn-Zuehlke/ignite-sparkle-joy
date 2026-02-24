# Architektur-Entscheidung: Monolith vs. Separate Produkte
## Fulfillment Hub, Execution Layer, Shopfloor Experience Layer

**Datum:** 2025-01-27  
**Empfehlung:** 🎯 **Hybrid-Ansatz: Monorepo mit separaten Apps**

---

## 🤔 **DIE FRAGE**

Sollten die 3 Produkte:
- **A)** Separately aufgebaut werden (3 separate Repos/Projekte)?
- **B)** Als Monolith (alles in einem Projekt)?
- **C)** Hybrid (Monorepo mit separaten Apps)?

---

## 📊 **ARCHITEKTUR-OPTIONEN ANALYSE**

### **Option A: Separate Repositories/Projekte**

**Struktur:**
```
fulfillment-hub/          (React Frontend)
execution-layer/          (Backend Service)
shopfloor-experience/     (Mobile/PWA App)
```

**Vorteile:**
- ✅ Klare Trennung
- ✅ Unabhängige Deployment
- ✅ Separate Teams möglich
- ✅ Unterschiedliche Tech-Stacks möglich

**Nachteile:**
- ❌ Code-Duplikation (Types, Utils, Auth)
- ❌ Schwierigeres Code-Sharing
- ❌ Mehr Repos zu verwalten
- ❌ Komplexere CI/CD

**Bewertung:** ⭐⭐⭐ **3/5** - Gut für große Teams, aber Overhead

---

### **Option B: Monolith (Alles in einem Projekt)**

**Struktur:**
```
src/
  apps/
    fulfillment-hub/
    execution-layer/
    shopfloor-experience/
  shared/
    types/
    utils/
    components/
```

**Vorteile:**
- ✅ Einfaches Code-Sharing
- ✅ Ein Repo
- ✅ Einfache CI/CD
- ✅ Schnelle Entwicklung

**Nachteile:**
- ❌ Größeres Bundle (auch wenn nicht genutzt)
- ❌ Schwierigeres Deployment (alles zusammen)
- ❌ Weniger Flexibilität

**Bewertung:** ⭐⭐⭐ **3/5** - Gut für Start, aber limitierend

---

### **Option C: Monorepo mit separaten Apps (EMPFOHLEN)** ⭐

**Struktur:**
```
clarity-flow-79/
  apps/
    fulfillment-hub/          # React Web App (aktuell)
      src/
      package.json
    shopfloor-experience/      # React Native / PWA
      src/
      package.json
  packages/
    shared/                    # Shared Types, Utils
      types/
      utils/
    execution-core/            # Execution Layer Logic
      src/
      package.json
  supabase/
    functions/
      execution-api/           # Execution Layer API
```

**Vorteile:**
- ✅ Code-Sharing einfach (shared packages)
- ✅ Separate Deployment möglich
- ✅ Klare Trennung der Apps
- ✅ Ein Repo (einfache Verwaltung)
- ✅ Flexible Tech-Stacks pro App
- ✅ Type-Safety über Apps hinweg

**Nachteile:**
- ⚠️ Etwas komplexere Struktur
- ⚠️ Monorepo-Tooling nötig (Turborepo, Nx, etc.)

**Bewertung:** ⭐⭐⭐⭐⭐ **5/5** - Beste Balance

---

## 🎯 **MEINE EMPFEHLUNG: HYBRID-ANSATZ**

### **Struktur:**

```
clarity-flow-79/
├── apps/
│   ├── fulfillment-hub/          # Layer 2 - Web App
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── ...
│   │   └── package.json
│   │
│   └── shopfloor-experience/      # Layer 4 - Mobile/PWA
│       ├── src/
│       │   ├── picker/
│       │   ├── packer/
│       │   ├── returns/
│       │   └── ...
│       └── package.json
│
├── packages/
│   ├── shared/                    # Shared Code
│   │   ├── types/                 # TypeScript Types
│   │   │   ├── orders.ts
│   │   │   ├── jobs.ts
│   │   │   └── sla.ts
│   │   ├── utils/                 # Shared Utilities
│   │   │   ├── date.ts
│   │   │   └── formatting.ts
│   │   └── constants/             # Shared Constants
│   │
│   ├── execution-core/            # Execution Layer Logic
│   │   ├── src/
│   │   │   ├── orchestrator.ts
│   │   │   ├── prioritization.ts
│   │   │   ├── queue-manager.ts
│   │   │   └── wave-manager.ts
│   │   └── package.json
│   │
│   └── ui/                        # Shared UI Components
│       ├── button/
│       ├── input/
│       └── ...
│
├── supabase/
│   ├── functions/
│   │   ├── execution-api/        # Execution Layer API
│   │   │   └── index.ts
│   │   └── ...
│   └── migrations/
│
└── package.json                   # Root (Monorepo Config)
```

---

## 🏗️ **DETAILLIERTE ARCHITEKTUR**

### **1. Fulfillment Hub (App 1) - Web App**

**Technologie:**
- ✅ React + TypeScript (aktuell)
- ✅ Vite (aktuell)
- ✅ Supabase Client

**Zweck:**
- Visibility & Self-Service
- Dashboards
- Reports
- Konfiguration

**Deployment:**
- ✅ Separate Deployment (Vercel, Netlify, etc.)
- ✅ Kann unabhängig deployed werden

**Code-Sharing:**
- ✅ Nutzt `@shared/types` für Order-Types
- ✅ Nutzt `@shared/utils` für Formatierung
- ✅ Nutzt `@execution-core` für Priorisierungs-Logik (optional)

---

### **2. Execution Layer (Backend Service)**

**Technologie:**
- ✅ Supabase Edge Functions (Deno)
- ✅ Oder: Separater Node.js Service (wenn komplexer)

**Zweck:**
- Job-Orchestrierung
- SLA-basierte Priorisierung
- Queue-Management
- Wellensteuerung

**Architektur-Optionen:**

#### **Option 1: Supabase Edge Functions (Empfohlen für Start)**
```
supabase/functions/execution-api/
  ├── index.ts              # Main API
  ├── orchestrator.ts       # Job-Orchestrierung
  ├── prioritization.ts    # SLA-basierte Priorisierung
  └── queue-manager.ts      # Queue-Management
```

**Vorteile:**
- ✅ Kein separater Server nötig
- ✅ Skaliert automatisch
- ✅ Einfache Integration mit Supabase DB
- ✅ Serverless (kosteneffizient)

**Nachteile:**
- ⚠️ 50s Timeout (kann limitierend sein)
- ⚠️ Weniger Flexibilität als eigener Service

#### **Option 2: Separater Node.js Service (Für später)**
```
services/execution-layer/
  ├── src/
  │   ├── api/              # REST API
  │   ├── orchestrator/      # Orchestrierung
  │   ├── prioritization/   # Priorisierung
  │   └── queue/            # Queue-Management
  └── package.json
```

**Vorteile:**
- ✅ Volle Kontrolle
- ✅ Keine Timeout-Limits
- ✅ Komplexere Logik möglich

**Nachteile:**
- ❌ Separater Server nötig
- ❌ Mehr Infrastruktur

**Empfehlung:** Start mit Supabase Functions, später migrieren falls nötig

---

### **3. Shopfloor Experience Layer (App 2) - Mobile/PWA**

**Technologie:**
- ✅ React Native (für native Apps)
- ✅ Oder: PWA (Progressive Web App) - einfacher Start
- ✅ Barcode-Scanner-Integration

**Zweck:**
- Scanner-UI für Picker
- Packstation-UI
- Retourenbearbeitung

**Deployment:**
- ✅ Separate App (App Store / Play Store)
- ✅ Oder: PWA (kein Store nötig)

**Code-Sharing:**
- ✅ Nutzt `@shared/types` für Job-Types
- ✅ Nutzt `@shared/utils` für Formatierung
- ✅ Eigene UI-Komponenten (Mobile-optimiert)

---

## 🔧 **TECHNISCHE UMSETZUNG**

### **Monorepo-Setup mit Turborepo (Empfohlen)**

**Installation:**
```bash
npm install -g turbo
npx create-turbo@latest
```

**Struktur:**
```json
// package.json (Root)
{
  "name": "clarity-flow-79",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "dev:hub": "turbo run dev --filter=fulfillment-hub",
    "dev:shopfloor": "turbo run dev --filter=shopfloor-experience"
  }
}
```

**Vorteile:**
- ✅ Parallele Builds
- ✅ Caching
- ✅ Task-Pipelines
- ✅ Einfaches Code-Sharing

---

### **Alternative: Nx Monorepo**

**Vorteile:**
- ✅ Sehr mächtig
- ✅ Graph-basierte Dependency-Analyse
- ✅ Code-Generierung

**Nachteile:**
- ⚠️ Mehr Overhead
- ⚠️ Steilerer Learning-Curve

**Empfehlung:** Turborepo für Start (einfacher)

---

## 📦 **CODE-SHARING STRATEGIE**

### **Shared Packages:**

#### **1. @shared/types**
```typescript
// packages/shared/types/src/orders.ts
export interface Order {
  id: string;
  source_no: string;
  // ...
}

// packages/shared/types/src/jobs.ts
export interface Job {
  id: string;
  order_id: string;
  job_type: 'pick' | 'pack' | 'return';
  priority: number;
  // ...
}
```

**Nutzung:**
```typescript
// In fulfillment-hub
import { Order } from '@shared/types';

// In shopfloor-experience
import { Job } from '@shared/types';

// In execution-core
import { Order, Job } from '@shared/types';
```

#### **2. @shared/utils**
```typescript
// packages/shared/utils/src/date.ts
export function formatDate(date: Date): string {
  // ...
}

// packages/shared/utils/src/sla.ts
export function calculateSLADeadline(order: Order): Date {
  // ...
}
```

#### **3. @execution-core**
```typescript
// packages/execution-core/src/prioritization.ts
export function calculateJobPriority(order: Order): number {
  // SLA-basierte Priorisierung
}

// packages/execution-core/src/orchestrator.ts
export class ExecutionOrchestrator {
  async processNewOrder(order: Order): Promise<Job[]> {
    // ...
  }
}
```

**Nutzung:**
- ✅ Fulfillment Hub kann für Anzeige nutzen
- ✅ Execution Layer nutzt für Berechnung
- ✅ Shopfloor nutzt für Validierung

---

## 🚀 **DEPLOYMENT-STRATEGIE**

### **Separate Deployment, aber koordiniert:**

```
┌─────────────────────────────────────┐
│  Fulfillment Hub                    │
│  (Vercel / Netlify)                 │
│  → https://hub.msdirect.ch          │
└─────────────────────────────────────┘
              │
              │ API Calls
              ▼
┌─────────────────────────────────────┐
│  Execution Layer API                 │
│  (Supabase Functions / Node Service)│
│  → https://api.msdirect.ch          │
└─────────────────────────────────────┘
              │
              │ API Calls
              ▼
┌─────────────────────────────────────┐
│  Shopfloor Experience               │
│  (PWA / React Native)               │
│  → https://shopfloor.msdirect.ch    │
│  → App Store / Play Store           │
└─────────────────────────────────────┘
```

**Vorteile:**
- ✅ Jede App kann unabhängig deployed werden
- ✅ Unterschiedliche Release-Zyklen möglich
- ✅ Rollback pro App möglich

---

## 🎯 **KONKRETE EMPFEHLUNG**

### **Phase 1: Monorepo aufsetzen (1 Woche)**

**Schritte:**
1. ✅ Turborepo installieren
2. ✅ Aktuelle App nach `apps/fulfillment-hub/` verschieben
3. ✅ `packages/shared/` erstellen
4. ✅ Types & Utils extrahieren

**Struktur:**
```
clarity-flow-79/
├── apps/
│   └── fulfillment-hub/     # Aktuelle App
├── packages/
│   └── shared/              # Neu
└── supabase/
```

---

### **Phase 2: Execution Layer (Monat 4-6)**

**Schritte:**
1. ✅ `packages/execution-core/` erstellen
2. ✅ Execution-Logik implementieren
3. ✅ `supabase/functions/execution-api/` erstellen
4. ✅ API-Endpunkte implementieren

**Struktur:**
```
├── packages/
│   ├── shared/
│   └── execution-core/      # Neu
└── supabase/
    └── functions/
        └── execution-api/   # Neu
```

---

### **Phase 3: Shopfloor Experience (Monat 7-9)**

**Schritte:**
1. ✅ `apps/shopfloor-experience/` erstellen
2. ✅ PWA oder React Native Setup
3. ✅ Scanner-UI implementieren
4. ✅ API-Integration mit Execution Layer

**Struktur:**
```
├── apps/
│   ├── fulfillment-hub/
│   └── shopfloor-experience/ # Neu
```

---

## 📊 **VERGLEICH DER OPTIONEN**

| Kriterium | Separate Repos | Monolith | Monorepo (Empfohlen) |
|-----------|----------------|----------|----------------------|
| **Code-Sharing** | ❌ Schwierig | ✅ Einfach | ✅ Sehr einfach |
| **Deployment** | ✅ Unabhängig | ❌ Zusammen | ✅ Unabhängig |
| **Team-Skalierung** | ✅ Gut | ⚠️ Limitierend | ✅ Sehr gut |
| **Wartbarkeit** | ⚠️ Mittel | ✅ Einfach | ✅ Sehr einfach |
| **Type-Safety** | ❌ Schwierig | ✅ Einfach | ✅ Sehr einfach |
| **Komplexität** | ⚠️ Hoch | ✅ Niedrig | ⚠️ Mittel |
| **Flexibilität** | ✅ Sehr hoch | ❌ Niedrig | ✅ Hoch |

---

## 🎯 **FAZIT & EMPFEHLUNG**

### **Meine Empfehlung: Monorepo mit separaten Apps**

**Warum:**
1. ✅ **Code-Sharing** - Types, Utils, Logik geteilt
2. ✅ **Separate Deployment** - Jede App unabhängig
3. ✅ **Type-Safety** - TypeScript über Apps hinweg
4. ✅ **Skalierbar** - Teams können parallel arbeiten
5. ✅ **Pragmatisch** - Start einfach, später erweiterbar

### **Konkrete Struktur:**

```
clarity-flow-79/                    # Monorepo
├── apps/
│   ├── fulfillment-hub/           # Web App (aktuell)
│   └── shopfloor-experience/       # Mobile/PWA (neu)
├── packages/
│   ├── shared/                    # Shared Types & Utils
│   └── execution-core/            # Execution Logic
└── supabase/
    └── functions/
        └── execution-api/          # Execution API
```

### **Vorteile dieser Struktur:**

1. ✅ **Ein Repo** - Einfache Verwaltung
2. ✅ **Code-Sharing** - Keine Duplikation
3. ✅ **Separate Apps** - Klare Trennung
4. ✅ **Flexible Deployment** - Jede App einzeln
5. ✅ **Type-Safety** - TypeScript überall
6. ✅ **Skalierbar** - Teams können parallel arbeiten

---

## 🚀 **NÄCHSTE SCHRITTE**

### **Sofort (diese Woche):**

1. ✅ **Monorepo aufsetzen** (1 Tag)
   - Turborepo installieren
   - Aktuelle App nach `apps/fulfillment-hub/` verschieben
   - `packages/shared/` erstellen

2. ✅ **Foundation-Fixes** (Rest der Woche)
   - Performance (Pagination, Virtualisierung)
   - Security (RLS, CORS, Rate Limiting)

### **Dann schrittweise:**

3. ✅ **Shared Packages** extrahieren (1 Woche)
4. ✅ **Execution Core** entwickeln (Monat 4-6)
5. ✅ **Shopfloor App** entwickeln (Monat 7-9)

---

**Erstellt von:** AI Code Analysis  
**Datum:** 2025-01-27  
**Version:** 1.0


