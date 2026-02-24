# 📦 Inventory (Bestände) Import - Anleitung

## ⚠️ **PROBLEM**

Die `productStock` Dateien können nicht importiert werden, weil:
1. Die Companies (`AVI`, `GT`, `NAM`, `GF`) möglicherweise nicht in der Datenbank existieren
2. RLS (Row Level Security) verhindert das Erstellen von Companies mit dem anon key

## ✅ **LÖSUNG**

### **Schritt 1: Companies erstellen**

Führe dieses SQL in Supabase SQL Editor aus:

```sql
-- Create missing companies for productStock import
INSERT INTO public.companies (id, name, status)
VALUES
  ('AVI', 'Aviano', 'live'),
  ('GT', 'GetSA', 'live'),
  ('NAM', 'Namuk', 'live'),
  ('GF', 'Golfyr', 'live')
ON CONFLICT (id) DO NOTHING;
```

**Oder:** Öffne `create-missing-companies.sql` und führe es aus.

**Hinweis:** Golfyr wird in den Dateien als `30` oder `E1` bezeichnet, wird aber in der DB als `GF` gespeichert.

### **Schritt 2: ProductStock importieren**

Nachdem die Companies existieren, führe aus:

```bash
cd /Users/milostoessel/clarity-flow-79/clarity-flow-79-1927e3ec
node import-productstock-direct.js
```

## 📊 **ERWARTETE ERGEBNISSE**

Nach dem Import sollten folgende Bestände in der Datenbank sein:

- **Aviano (AVI):** ~10.283 Items
- **GetSA (GT):** ~2.471 Items
- **Namuk (NAM):** ~4.278 Items
- **Golfyr (GF):** ~82 Items (aus `13_productStock`, clientId: E1/30)
- **Gesamt:** ~17.114 Inventory Items

## 🔍 **PRÜFEN**

Nach dem Import kannst du in der App prüfen:
1. Gehe zu `/inventory`
2. Filtere nach Kunde (AVI, GT, NAM, GF)
3. Prüfe ob die Bestände sichtbar sind

## 📋 **COMPANY MAPPING**

| Datei clientId | DB Company ID | Name |
|----------------|---------------|------|
| AV | AVI | Aviano |
| GT | GT | GetSA |
| NK | NAM | Namuk |
| 30 / E1 | GF | Golfyr |
