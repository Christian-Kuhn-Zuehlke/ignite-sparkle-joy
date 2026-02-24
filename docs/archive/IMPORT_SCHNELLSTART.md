# 🚀 SCHNELLSTART: Alle Daten importieren

## ⚡ Schnellste Methode (3 Schritte)

### Schritt 1: Company "NAM" erstellen

**In Lovable SQL ausführen:**
```sql
INSERT INTO public.companies (id, name, status)
VALUES ('NAM', 'Namuk', 'live')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    status = EXCLUDED.status;
```

### Schritt 2: Edge Function deployen

**Siehe:** `LOVABLE_DEPLOY_STATUS_MAPPING.md`

Oder:
```bash
supabase login
supabase link --project-ref szruenulmfdxzhvupprf
supabase functions deploy universal-import
```

### Schritt 3: Alle Daten importieren

```bash
# 1. Inventory importieren
node import-all-productstock-via-edge-function.js

# 2. Alle Orders importieren (inkl. Returns)
node import-all-orders-complete.js
```

**Das war's!** 🎉

---

## 📊 Was wird importiert?

- ✅ **94,185 Orders** (alle OrderState-Dateien)
- ✅ **17,114 Inventory Items** (alle ProductStock-Dateien)
- ✅ **39,997 Returns** (automatisch aus OrderState-Dateien)

---

## ⏱️ Geschätzte Dauer

- Inventory: ~5-10 Minuten
- Orders: ~30-60 Minuten (je nach Dateigröße)

---

## 🔍 Verifikation

Nach dem Import:
```bash
node compare-files-with-database-simple.js
```

Oder in der UI:
- Öffne die App
- Prüfe Orders, Inventory, Returns
- Filtere nach Kunden

---

## ⚠️ WICHTIG

1. **Company "NAM"** muss zuerst erstellt werden!
2. **Edge Function** muss deployed sein!
3. **RLS-Policies** sollten korrekt sein (falls Probleme auftreten)

---

## 🆘 Bei Problemen

1. **Fehler: "Company not found"**
   → Schritt 1 ausführen (Company erstellen)

2. **Fehler: "Function not found"**
   → Schritt 2 ausführen (Edge Function deployen)

3. **Fehler: "RLS policy violation"**
   → Siehe `LOVABLE_SQL_FIX_RLS_FINAL.md`

4. **Timeout bei großen Dateien**
   → Normal, Script verarbeitet automatisch in Chunks

