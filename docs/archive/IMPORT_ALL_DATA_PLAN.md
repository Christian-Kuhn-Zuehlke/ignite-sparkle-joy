# Import-Plan: Alle Daten in die Datenbank (HUB)

## 🎯 Ziel

Alle 94,185 Orders, 17,114 Inventory Items und 39,997 Returns aus den Dateien in die Datenbank importieren.

---

## 📋 VORAUSSETZUNGEN

### 1. Edge Function deployen ✅

Die `universal-import` Edge Function muss mit der neuen Status-Zuordnungslogik deployed sein.

**Siehe:** `LOVABLE_DEPLOY_STATUS_MAPPING.md`

### 2. Company "NAM" erstellen ⚠️

**WICHTIG:** Company "NAM" (Namuk) muss zuerst erstellt werden!

**SQL in Lovable ausführen:**
```sql
INSERT INTO public.companies (id, name, status)
VALUES ('NAM', 'Namuk', 'live')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status;
```

**Siehe:** `LOVABLE_CREATE_NAMUK_COMPANY_FINAL.md`

### 3. RLS-Policies prüfen

Stelle sicher, dass die RLS-Policies für `orders`, `inventory` und `returns` korrekt sind.

---

## 🚀 IMPORT-STRATEGIE

### Phase 1: Inventory (kleinste Datenmenge, schnell)

**GetSA (GT):**
```bash
node import-all-productstock-via-edge-function.js
```
Oder manuell: `GT_productStock` über UI importieren

**Namuk (NAM):**
```bash
node import-all-productstock-via-edge-function.js
```
Oder manuell: `NK_productStock` über UI importieren

**Golfyr (GF):**
```bash
node import-all-productstock-via-edge-function.js
```
Oder manuell: `13_productStock` über UI importieren

**Aviano (AVI):**
```bash
node import-all-productstock-via-edge-function.js
```
Oder manuell: `AV_productStock` über UI importieren

**Erwartet:** 17,114 Inventory Items

---

### Phase 2: Orders (nach Kunde, chronologisch)

#### 2.1 GetSA (GT) - 30,520 Orders

**Dateien (chronologisch):**
1. `GT_OrderState_2024-01-01..2024-05-31` → 5,363 Orders
2. `GT_OrderState_2024-06-01..2024-11-30` → 5,957 Orders
3. `GT_OrderState_2024-12-01..2025-06-01` → 9,165 Orders
4. `GT_OrderState_2025-06-02..2025-09-01` → 873 Orders
5. `GT_OrderState_2025-09-02..2025-12-30` → 9,162 Orders

**Import:**
```bash
# Alle GT Orders ab 22.12.2024 (bereits importiert)
# node import-gt-nam-gf-only.js

# Oder alle GT Orders (inkl. ältere)
# Manuell über UI: Jede Datei einzeln importieren
```

**Status:** ✅ Bereits importiert (15,185 Orders ab 22.12.2024)
**Fehlen:** ~15,335 Orders (ältere, vor 22.12.2024)

---

#### 2.2 Namuk (NAM) - 482 Orders

**Dateien:**
1. `NK_OrderState` → 482 Orders (240 aus 2025, 244 ab 22.12.2024)

**Import:**
```bash
# Nachdem Company "NAM" erstellt wurde:
node import-namuk-orders.js
```

**Status:** ⚠️ Wartet auf Company-Erstellung
**Fehlen:** 482 Orders (100%)

---

#### 2.3 Golfyr (GF) - 214 Orders

**Dateien:**
1. `13__OrderState` → 214 Orders (45 aus 2025, 45 ab 22.12.2024)

**Import:**
```bash
# Bereits importiert (45 Orders ab 22.12.2024)
# node import-gt-nam-gf-only.js

# Für alle Orders:
# Manuell über UI: 13__OrderState importieren
```

**Status:** ✅ Teilweise importiert (45 Orders ab 22.12.2024)
**Fehlen:** 169 Orders (ältere)

---

#### 2.4 Aviano (AVI) - 62,969 Orders

**Dateien (chronologisch):**
1. `AV_OrderState_2023-12-01_2024-03-01` → 7,458 Orders
2. `AV_OrderState_2024-03-02..2024-06-01` → 5,810 Orders
3. `AV_OrderState_2024-06-02..2024-09-01` → 6,691 Orders
4. `AV_OrderState_2024-09-02..2024-12-01` → 6,772 Orders
5. `AV_OrderState_ 2024-12-02..2025-03-01` → 9,300 Orders
6. `AV_OrderState_ 2025-03-02..2025-06-01` → 7,280 Orders
7. `AV_OrderState_ 2025-06-02..2025-09-01` → 7,607 Orders
8. `AV_OrderState_ 2025-09-02..2025-12-30` → 12,051 Orders

**Import:**
```bash
# Alle Aviano Orders (inkl. ältere)
# Manuell über UI: Jede Datei einzeln importieren
# Oder: Script erstellen für alle AV_OrderState Dateien
```

**Status:** ❌ Nicht importiert
**Fehlen:** 62,969 Orders (100%)

---

### Phase 3: Returns (automatisch mit Orders)

Returns werden automatisch beim Import der OrderState-Dateien erkannt und importiert, wenn:
- ReturnOrder_Date vorhanden (nicht 0001-01-01)
- Return_Status vorhanden (nicht _blank_)
- QTY_Returned > 0 in Lines

**Erwartet:** 39,997 Returns

---

## 📝 DETAILLIERTER IMPORT-PLAN

### Schritt 1: Vorbereitung

1. ✅ Edge Function deployen (`universal-import`)
2. ⚠️ Company "NAM" erstellen (SQL in Lovable)
3. ✅ RLS-Policies prüfen

### Schritt 2: Inventory importieren

**Script:** `import-all-productstock-via-edge-function.js`

**Oder manuell über UI:**
- `AV_productStock`
- `GT_productStock`
- `NK_productStock`
- `13_productStock`

**Erwartet:** 17,114 Items

### Schritt 3: Orders importieren

#### Option A: Automatisch (empfohlen)

**Script erstellen:** `import-all-orders.js`
- Importiert alle OrderState-Dateien
- Chronologisch sortiert
- Zeigt Fortschritt

#### Option B: Manuell über UI

**GetSA (GT):**
- 5 Dateien importieren (chronologisch)

**Namuk (NAM):**
- 1 Datei: `NK_OrderState`

**Golfyr (GF):**
- 1 Datei: `13__OrderState`

**Aviano (AVI):**
- 8 Dateien importieren (chronologisch)

### Schritt 4: Verifikation

**Script:** `compare-files-with-database-simple.js`

**Oder SQL:**
```sql
SELECT company_id, COUNT(*) FROM orders GROUP BY company_id;
SELECT company_id, COUNT(*) FROM inventory GROUP BY company_id;
SELECT company_id, COUNT(*) FROM returns GROUP BY company_id;
```

---

## 🛠️ SCRIPTS ZUM ERSTELLEN

### 1. `import-all-orders.js`

Importiert ALLE OrderState-Dateien chronologisch:
- Sortiert nach Datum
- Importiert jede Datei einzeln
- Zeigt Fortschritt
- Überspringt bereits importierte Orders (optional)

### 2. `import-all-inventory.js`

Importiert ALLE ProductStock-Dateien:
- AV_productStock
- GT_productStock
- NK_productStock
- 13_productStock

### 3. `verify-all-imports.js`

Vergleicht Dateien mit Datenbank:
- Zeigt fehlende Orders
- Zeigt fehlende Inventory
- Zeigt fehlende Returns
- Erstellt Report

---

## ⚡ SCHNELLSTART

### Minimal (nur wichtigste Daten):

1. **Company "NAM" erstellen** (SQL in Lovable)
2. **Inventory importieren:**
   ```bash
   node import-all-productstock-via-edge-function.js
   ```
3. **Orders ab 22.12.2024 importieren:**
   ```bash
   node import-gt-nam-gf-only.js  # GetSA, Namuk, Golfyr
   # Aviano separat: AV_OrderState Dateien über UI
   ```

### Vollständig (alle Daten):

1. **Company "NAM" erstellen**
2. **Inventory importieren**
3. **Alle Orders importieren** (inkl. ältere)
4. **Verifikation**

---

## 📊 ERWARTETE ERGEBNISSE

Nach erfolgreichem Import:

- ✅ **94,185 Orders** in der DB
- ✅ **17,114 Inventory Items** in der DB
- ✅ **39,997 Returns** in der DB

Nach Kunde:
- ✅ Aviano: 62,969 Orders, 10,283 Inventory, 27,111 Returns
- ✅ GetSA: 30,520 Orders, 2,471 Inventory, 12,788 Returns
- ✅ Namuk: 482 Orders, 4,278 Inventory, 95 Returns
- ✅ Golfyr: 214 Orders, 82 Inventory, 3 Returns

---

## 🚨 WICHTIGE HINWEISE

1. **Chronologischer Import:** Ältere Orders zuerst, dann neuere
2. **Duplikate:** Edge Function überspringt bereits vorhandene Orders (basierend auf source_no + company_id)
3. **Returns:** Werden automatisch beim Order-Import erkannt und importiert
4. **Timeouts:** Große Dateien werden in Chunks verarbeitet
5. **Progress:** Scripts zeigen Fortschritt während des Imports

---

## ✅ CHECKLISTE

- [ ] Edge Function `universal-import` deployed
- [ ] Company "NAM" erstellt
- [ ] RLS-Policies geprüft
- [ ] Inventory importiert (17,114 Items)
- [ ] GetSA Orders importiert (30,520 Orders)
- [ ] Namuk Orders importiert (482 Orders)
- [ ] Golfyr Orders importiert (214 Orders)
- [ ] Aviano Orders importiert (62,969 Orders)
- [ ] Returns verifiziert (39,997 Returns)
- [ ] Finale Verifikation durchgeführt

