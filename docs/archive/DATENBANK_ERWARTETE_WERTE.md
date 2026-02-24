# Erwartete Werte in der Datenbank (HUB)

Basierend auf der Analyse aller Dateien im `Test_Files` Ordner.

## 📊 GESAMT-ÜBERSICHT

| Kategorie | Dateien | Sollte in DB sein |
|-----------|---------|------------------|
| **Orders** | 94,185 | 94,185 |
| **Inventory** | 17,114 | 17,114 |
| **Returns** | 39,997 | 39,997 |

---

## 🏢 NACH KUNDE

### Aviano (AVI)

| Kategorie | Dateien | Sollte in DB sein |
|-----------|---------|------------------|
| **Orders (Total)** | 62,969 | 62,969 |
| **Orders 2025** | 2,969 | 2,969 |
| **Orders ab 22.12.2024** | 2,972 | 2,972 |
| **Inventory** | 10,283 | 10,283 |
| **Returns** | 27,111 | 27,111 |

**Dateien:**
- 9 OrderState-Dateien (62,969 Orders)
- 1 ProductStock-Datei (10,283 Items)

**Datum-Bereich:** 2023-02-10 bis 2025-09-06

---

### GetSA (GT)

| Kategorie | Dateien | Sollte in DB sein |
|-----------|---------|------------------|
| **Orders (Total)** | 30,520 | 30,520 |
| **Orders 2025** | 1,873 | 1,873 |
| **Orders ab 22.12.2024** | 1,873 | 1,873 |
| **Inventory** | 2,471 | 2,471 |
| **Returns** | 12,788 | 12,788 |

**Dateien:**
- 5 OrderState-Dateien (30,520 Orders)
- 1 ProductStock-Datei (2,471 Items)

**Datum-Bereich:** 2021-10-27 bis 2025-10-01

---

### Namuk (NAM)

| Kategorie | Dateien | Sollte in DB sein |
|-----------|---------|------------------|
| **Orders (Total)** | 482 | 482 |
| **Orders 2025** | 240 | 240 |
| **Orders ab 22.12.2024** | 244 | 244 |
| **Inventory** | 4,278 | 4,278 |
| **Returns** | 95 | 95 |

**Dateien:**
- 1 OrderState-Datei (482 Orders)
- 1 ProductStock-Datei (4,278 Items)

**Datum-Bereich:** 2023-12-21 bis 2025-12-28

**⚠️ WICHTIG:** Company "NAM" muss zuerst erstellt werden!

---

### Golfyr (GF)

| Kategorie | Dateien | Sollte in DB sein |
|-----------|---------|------------------|
| **Orders (Total)** | 214 | 214 |
| **Orders 2025** | 45 | 45 |
| **Orders ab 22.12.2024** | 45 | 45 |
| **Inventory** | 82 | 82 |
| **Returns** | 3 | 3 |

**Dateien:**
- 1 OrderState-Datei (214 Orders)
- 1 ProductStock-Datei (82 Items)

**Datum-Bereich:** 2023-06-22 bis 2025-12-20

---

## 📋 DETAILLIERTE DATEI-AUFLISTUNG

### Aviano (AVI) - OrderState Dateien

1. `AV_OrderState_ 2024-12-02..2025-03-01` → 9,300 Orders
2. `AV_OrderState_ 2025-03-02..2025-06-01` → 7,280 Orders (979 aus 2025)
3. `AV_OrderState_ 2025-06-02..2025-09-01` → 7,607 Orders (994 aus 2025)
4. `AV_OrderState_ 2025-09-02..2025-12-30` → 12,051 Orders (996 aus 2025)
5. `AV_OrderState_2023-12-01_2024-03-01` → 7,458 Orders
6. `AV_OrderState_2024-03-02..2024-06-01` → 5,810 Orders
7. `AV_OrderState_2024-06-02..2024-09-01` → 6,691 Orders
8. `AV_OrderState_2024-09-02..2024-12-01` → 6,772 Orders
9. `AV_productStock` → 10,283 Inventory Items

**Total Aviano:** 62,969 Orders, 10,283 Inventory, 27,111 Returns

---

### GetSA (GT) - OrderState Dateien

1. `GT_OrderState_2024-01-01..2024-05-31` → 5,363 Orders
2. `GT_OrderState_2024-06-01..2024-11-30` → 5,957 Orders
3. `GT_OrderState_2024-12-01..2025-06-01` → 9,165 Orders
4. `GT_OrderState_2025-06-02..2025-09-01` → 873 Orders (873 aus 2025)
5. `GT_OrderState_2025-09-02..2025-12-30` → 9,162 Orders (1,000 aus 2025)
6. `GT_productStock` → 2,471 Inventory Items

**Total GetSA:** 30,520 Orders, 2,471 Inventory, 12,788 Returns

---

### Namuk (NAM) - OrderState Dateien

1. `NK_OrderState` → 482 Orders (240 aus 2025, 244 ab 22.12.2024)
2. `NK_productStock` → 4,278 Inventory Items

**Total Namuk:** 482 Orders, 4,278 Inventory, 95 Returns

---

### Golfyr (GF) - OrderState Dateien

1. `13__OrderState` → 214 Orders (45 aus 2025, 45 ab 22.12.2024)
2. `13_productStock` → 82 Inventory Items

**Total Golfyr:** 214 Orders, 82 Inventory, 3 Returns

---

## 🔍 VERIFIKATION IN DER DATENBANK

### SQL-Abfragen zum Prüfen:

```sql
-- Aviano (AVI)
SELECT COUNT(*) FROM orders WHERE company_id = 'AVI';
SELECT COUNT(*) FROM orders WHERE company_id = 'AVI' AND order_date >= '2025-01-01';
SELECT COUNT(*) FROM inventory WHERE company_id = 'AVI';
SELECT COUNT(*) FROM returns WHERE company_id = 'AVI';

-- GetSA (GT)
SELECT COUNT(*) FROM orders WHERE company_id = 'GT';
SELECT COUNT(*) FROM orders WHERE company_id = 'GT' AND order_date >= '2025-01-01';
SELECT COUNT(*) FROM inventory WHERE company_id = 'GT';
SELECT COUNT(*) FROM returns WHERE company_id = 'GT';

-- Namuk (NAM)
SELECT COUNT(*) FROM orders WHERE company_id = 'NAM';
SELECT COUNT(*) FROM orders WHERE company_id = 'NAM' AND order_date >= '2025-01-01';
SELECT COUNT(*) FROM inventory WHERE company_id = 'NAM';
SELECT COUNT(*) FROM returns WHERE company_id = 'NAM';

-- Golfyr (GF)
SELECT COUNT(*) FROM orders WHERE company_id = 'GF';
SELECT COUNT(*) FROM orders WHERE company_id = 'GF' AND order_date >= '2025-01-01';
SELECT COUNT(*) FROM inventory WHERE company_id = 'GF';
SELECT COUNT(*) FROM returns WHERE company_id = 'GF';

-- Gesamt
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM inventory;
SELECT COUNT(*) FROM returns;
```

---

## ⚠️ WICHTIGE HINWEISE

1. **Namuk (NAM):** Company muss zuerst erstellt werden!
   ```sql
   INSERT INTO public.companies (id, name, status)
   VALUES ('NAM', 'Namuk', 'live')
   ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;
   ```

2. **Returns:** Nur Orders mit tatsächlichen Return-Daten werden gezählt:
   - ReturnOrder_Date (nicht 0001-01-01)
   - Return_Status (nicht _blank_)
   - QTY_Returned > 0
   - **NICHT** nur Return_Tracking_Code (der ist bei fast allen Orders vorhanden)

3. **Orders 2025:** Nur Orders mit order_date zwischen 2025-01-01 und 2025-12-31

4. **Orders ab 22.12.2024:** Nur Orders mit order_date >= 2024-12-22

---

## 📊 ZUSAMMENFASSUNG

Die Datenbank sollte **genau diese Zahlen** enthalten:

- ✅ **94,185 Orders** total
- ✅ **17,114 Inventory Items** total
- ✅ **39,997 Returns** total

Nach Kunde:
- ✅ Aviano: 62,969 Orders, 10,283 Inventory, 27,111 Returns
- ✅ GetSA: 30,520 Orders, 2,471 Inventory, 12,788 Returns
- ✅ Namuk: 482 Orders, 4,278 Inventory, 95 Returns
- ✅ Golfyr: 214 Orders, 82 Inventory, 3 Returns

