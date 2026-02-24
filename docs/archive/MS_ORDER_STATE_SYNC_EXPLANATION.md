# MS OrderState Sync - Logik & Erklärung
## Wie funktioniert die automatische Synchronisation?

**Datum:** 2025-12-29

---

## ⚠️ **WICHTIG: Zwei verschiedene Dinge!**

### **1. Neue Bestellungen importieren** ❌ **NICHT Teil dieser Integration**

Die MS OrderState Integration holt **KEINE neuen Bestellungen**. Neue Orders kommen über andere Wege:

- ✅ **Business Central (BC)** → `bc-order-import` Edge Function (Push via XML/SOAP)
- ✅ **Shopify/WooCommerce** → `ecommerce-order-import` Edge Function (Webhooks)
- ✅ **Manueller Import** → XML-Import über UI

### **2. Order-Status aktualisieren** ✅ **Das macht die MS OrderState Integration**

Die MS OrderState Integration synchronisiert nur den **Status von bestehenden Orders**:
- Tracking-IDs
- Invoice-Informationen
- Payment-State
- MS Order State (numerischer Status)

---

## 🔄 **Aktuelle Logik der MS OrderState Sync**

### **Was wird synchronisiert?**

Die Edge Function `ms-order-state-sync` synchronisiert:

1. **Alle aktiven Orders** (Status ≠ `delivered`)
2. **Nur Orders, die länger als 15 Minuten nicht synchronisiert wurden**
3. **Limit: 100 Orders pro Durchlauf** (verhindert Timeout)

### **Code-Logik:**

```typescript
// Zeile 284-295 in ms-order-state-sync/index.ts
const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

const { data: orders } = await supabase
  .from('orders')
  .select('id, source_no, company_id, last_state_sync_at')
  .in('company_id', companyIds)
  .neq('status', 'delivered')  // Nur aktive Orders
  .or(`last_state_sync_at.is.null,last_state_sync_at.lt.${fifteenMinutesAgo}`)  // Nie synchronisiert ODER >15 Min alt
  .order('created_at', { ascending: false })
  .limit(100);  // Max 100 Orders pro Sync
```

---

## ⚠️ **WICHTIG: Automatische Sync ist NOCH NICHT eingerichtet!**

Die Edge Function existiert, aber es gibt **noch keinen Cron Job**, der sie automatisch aufruft.

### **Aktueller Status:**

- ✅ Edge Function `ms-order-state-sync` existiert
- ✅ Logik ist implementiert (alle 15 Minuten prüfen)
- ❌ **KEIN Cron Job eingerichtet** → Sync läuft NICHT automatisch!

---

## 🚀 **Wie richtet man die automatische Sync ein?**

### **Option 1: Supabase Cron Job (empfohlen)**

In **Supabase Dashboard → Database → SQL Editor**:

```sql
-- Prüfe ob pg_cron Extension aktiviert ist
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Falls nicht aktiviert:
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Cron Job einrichten (alle 15 Minuten)
SELECT cron.schedule(
  'ms-order-state-sync',  -- Job-Name
  '*/15 * * * *',        -- Cron-Expression: alle 15 Minuten
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/ms-order-state-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    )
  ) AS request_id;
  $$
);
```

**⚠️ Problem:** Supabase hat `net.http_post` nicht standardmäßig. Alternative:

```sql
-- Alternative: Verwende pg_net Extension
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'ms-order-state-sync',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/ms-order-state-sync',
    headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  ) AS request_id;
  $$
);
```

### **Option 2: Externer Scheduler (z.B. GitHub Actions)**

```yaml
# .github/workflows/ms-order-state-sync.yml
name: MS OrderState Sync
on:
  schedule:
    - cron: '*/15 * * * *'  # Alle 15 Minuten
  workflow_dispatch:  # Manuell auslösbar

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Sync
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            https://YOUR_PROJECT_ID.supabase.co/functions/v1/ms-order-state-sync
```

### **Option 3: Externer Cron (z.B. auf Server)**

```bash
# Crontab auf Server
*/15 * * * * curl -X POST -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" https://YOUR_PROJECT_ID.supabase.co/functions/v1/ms-order-state-sync
```

---

## 📊 **Zusammenfassung**

### **Was die MS OrderState Integration macht:**

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| **Status-Updates** | ✅ Implementiert | Synchronisiert Tracking, Invoice, Payment-State |
| **Automatische Sync** | ❌ **Nicht eingerichtet** | Cron Job muss noch konfiguriert werden |
| **Manuelle Abfrage** | ✅ Funktioniert | Button in OrderDetail funktioniert |
| **Neue Orders holen** | ❌ **Nicht Teil dieser Integration** | Kommt über BC/Shopify/WooCommerce |

### **Aktuelle Situation:**

- ✅ **Manuell:** Button "Status aktualisieren" funktioniert
- ❌ **Automatisch:** Läuft noch NICHT (Cron Job fehlt)
- ✅ **Logik:** Bereit für automatische Sync (alle 15 Minuten)

---

## 🎯 **Nächste Schritte**

1. **Cron Job einrichten** (siehe oben)
2. **Testen:** Manuell Sync triggern und prüfen
3. **Monitoring:** Logs in Supabase Dashboard prüfen

---

## ❓ **FAQ**

**Q: Holt die App automatisch neue Bestellungen?**  
A: **Nein.** Die MS OrderState Integration aktualisiert nur den Status bestehender Orders. Neue Orders kommen über BC/Shopify/WooCommerce.

**Q: Läuft die Sync automatisch alle 15 Minuten?**  
A: **Noch nicht.** Die Logik ist implementiert, aber der Cron Job muss noch eingerichtet werden.

**Q: Wie kann ich die Sync manuell triggern?**  
A: Button "Status aktualisieren" in OrderDetail, oder Edge Function direkt aufrufen.

**Q: Was passiert, wenn ich den Cron Job einrichte?**  
A: Alle 15 Minuten werden bis zu 100 aktive Orders synchronisiert (Tracking, Invoice, Payment-State).

