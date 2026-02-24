# 🤖 Automatischer täglicher Daten-Sync - Plan

**Ziel:** Jeden Tag automatisch Orders und Inventory von Microsoft BC importieren  
**Ohne:** Manuellen menschlichen Aufwand  
**Für:** SLK (Stadtlandkind), NAM (Namuk), GF (Golfyr), GT (GetSA)

---

## 🎯 LÖSUNG: Supabase Cron Jobs + MS Direct API

### **Wie es funktioniert:**

```
┌─────────────────┐
│  Supabase Cron  │  Läuft täglich um 3:00 Uhr
│   (Scheduler)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Sync Function  │  Für jede Company:
│                 │  1. Ruft MS Direct API auf
└────────┬────────┘  2. Holt neue Orders
         │           3. Holt Inventory Updates
         ▼
┌─────────────────┐
│  MS Direct API  │  Business Central SOAP API
│  (ms-direct.ch) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ universal-import│  Importiert Daten in DB
│  Edge Function  │
└─────────────────┘
```

---

## 📋 IMPLEMENTIERUNGSPLAN

### Phase 1: Scheduled Sync Function erstellen

**Neue Edge Function:** `daily-data-sync`

**Was sie macht:**
1. Läuft automatisch jeden Tag um 03:00 Uhr
2. Für jede Company (SLK, NAM, GF, GT):
   - Holt neue Orders seit gestern
   - Holt aktuellen Inventory-Stand
3. Importiert automatisch via `universal-import`
4. Sendet Report per Email bei Fehlern

**Vorteile:**
- ✅ 100% automatisch
- ✅ Nutzt existierende MS Direct API
- ✅ Keine zusätzliche Infrastruktur
- ✅ Fehler-Monitoring eingebaut

---

### Phase 2: Fallback-Lösung (File Watcher)

**Falls MS Direct API nicht für alle Companies verfügbar:**

```
┌─────────────────┐
│  BC Export Job  │  BC exportiert täglich XML
│   (BC Intern)   │  nach SFTP/S3/Folder
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ File Watcher    │  Überwacht Ordner
│  Edge Function  │  (jede 5 Min)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ universal-import│  Importiert neue Dateien
└─────────────────┘
```

---

## 🚀 IMPLEMENTIERUNG

### Option 1: MS Direct API Sync (EMPFOHLEN)

**Datei:** `supabase/functions/daily-data-sync/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const COMPANIES = [
  { id: 'SLK', bcId: 'SK', name: 'Stadtlandkind', token: 'TOKEN_SLK' },
  { id: 'NAM', bcId: 'NK', name: 'Namuk', token: 'TOKEN_NAM' },
  { id: 'GF', bcId: 'E1', name: 'Golfyr', token: 'TOKEN_GF' },
  { id: 'GT', bcId: 'GT', name: 'GetSA', token: 'TOKEN_GT' },
];

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results = [];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Sync jede Company
    for (const company of COMPANIES) {
      console.log(`🔄 Syncing ${company.name}...`);
      
      // 1. Orders synchronisieren
      const orderResult = await syncOrders(company, yesterday);
      
      // 2. Inventory synchronisieren
      const inventoryResult = await syncInventory(company);
      
      results.push({
        company: company.name,
        orders: orderResult,
        inventory: inventoryResult,
      });
    }

    // Email Report senden
    await sendSyncReport(results);

    return new Response(JSON.stringify({ 
      success: true, 
      results 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Sync failed:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

async function syncOrders(company, fromDate) {
  // Nutzt ms-order-state-query API
  // Holt Orders seit gestern
  // Importiert via universal-import
  return { imported: 0, updated: 0, errors: 0 };
}

async function syncInventory(company) {
  // Nutzt ms-product-stock API
  // Holt aktuellen Stock
  // Importiert via universal-import
  return { imported: 0, updated: 0, errors: 0 };
}

async function sendSyncReport(results) {
  // Sendet Email mit Sync-Ergebnissen
  // Nutzt send-email-notification
}
```

**Cron Configuration:**

```toml
# supabase/functions/daily-data-sync/cron.toml
[cron]
schedule = "0 3 * * *"  # Jeden Tag um 03:00 Uhr
```

---

### Option 2: File Watcher (FALLBACK)

**Wenn BC automatisch XML-Dateien exportiert:**

**Setup:**
1. BC exportiert täglich XML nach SFTP/S3
2. File Watcher Edge Function läuft alle 5 Minuten
3. Importiert neue Dateien automatisch

**Datei:** `supabase/functions/file-watcher-sync/index.ts`

```typescript
serve(async (req) => {
  // 1. Liste Dateien in SFTP/S3
  // 2. Prüfe welche seit letztem Sync neu sind
  // 3. Download & Import via universal-import
  // 4. Markiere als verarbeitet
});
```

---

## 🔑 REQUIREMENTS

### Was du brauchst:

#### Option 1 (MS Direct API):
1. ✅ **MS Direct API Credentials** - Hast du bereits!
2. ✅ **Token pro Company** - Musst du von MS Direct bekommen
3. ⚠️ **API Limits prüfen** - Wie viele Requests pro Tag erlaubt?

#### Option 2 (File Export):
1. **BC Export Job** - In BC konfigurieren
2. **SFTP/S3 Bucket** - Wo BC die Dateien hinlegt
3. **Credentials** - Für SFTP/S3 Zugriff

---

## ⚙️ KONFIGURATION

### Schritt 1: Environment Variables setzen

```bash
# In Supabase Dashboard → Settings → Edge Functions → Secrets
MSDIRECT_TOKEN_SLK=xxx
MSDIRECT_TOKEN_NAM=xxx
MSDIRECT_TOKEN_GF=xxx
MSDIRECT_TOKEN_GT=xxx

# Optional für Email Reports
ADMIN_EMAIL=milo.stoessel@ms-direct.ch
```

### Schritt 2: Edge Function deployen

```bash
supabase functions deploy daily-data-sync
```

### Schritt 3: Cron Job aktivieren

```bash
# In supabase/config.toml
[functions.daily-data-sync]
verify_jwt = false  # Kein JWT nötig für Cron
```

---

## 📊 MONITORING

### Dashboard erstellen

**Neue Page:** `/sync-status`

**Zeigt:**
- Letzter Sync: Datum/Uhrzeit
- Status pro Company: ✅ Success / ❌ Failed
- Importierte Orders (heute)
- Aktualisierte Inventory Items
- Fehler-Log

**Implementierung:**

```typescript
// src/pages/SyncStatus.tsx
export default function SyncStatus() {
  const { data: syncLogs } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      return data;
    }
  });

  return (
    <MainLayout title="Sync Status">
      {/* Timeline der letzten Syncs */}
      {/* Status Cards pro Company */}
      {/* Fehler-Log */}
    </MainLayout>
  );
}
```

---

## 🛡️ FEHLERBEHANDLUNG

### Was passiert bei Fehlern?

1. **API Timeout:** Retry nach 5 Min
2. **Authentication Error:** Email an Admin
3. **Parsing Error:** Log in DB, weiter mit nächster Company
4. **Import Error:** Retry 3x, dann Email

### Email-Alerts

```typescript
// Bei Fehler
await supabase.functions.invoke('send-email-notification', {
  body: {
    to: 'milo.stoessel@ms-direct.ch',
    subject: '⚠️ Daily Sync Failed: Stadtlandkind',
    body: `Fehler beim täglichen Daten-Sync:\n${error.message}`
  }
});
```

---

## 🎯 ZEITPLAN

### Empfohlener Sync-Zeitplan:

| Uhrzeit | Aktion | Dauer | Warum |
|---------|--------|-------|-------|
| **03:00** | Orders Sync | ~2-5 Min | Nacht, wenig Traffic |
| **03:10** | Inventory Sync | ~3-8 Min | Nach Orders |
| **03:20** | Report Email | ~1 Min | Zusammenfassung |
| **Gesamt** | | ~6-14 Min | Pro Nacht |

**Warum 03:00 Uhr?**
- ✅ Wenig Last auf BC
- ✅ Daten von Vortag sind vollständig
- ✅ Morgens sind neue Daten verfügbar

---

## 💰 KOSTEN

### Supabase Edge Functions:

- **Invocations:** 1x täglich × 4 Companies = 4 API Calls
- **Kosten:** ~$0.02/Tag = ~$0.60/Monat
- **MS Direct API:** Prüfen ob Kosten pro Request

**Fazit:** Sehr günstig, quasi kostenlos

---

## 🚀 NÄCHSTE SCHRITTE

### Sofort machbar (1-2h Implementierung):

1. **Edge Function `daily-data-sync` erstellen**
2. **MS Direct Tokens für alle 4 Companies beschaffen**
3. **Cron Job konfigurieren**
4. **Testen** (manuell triggern)
5. **Monitoring** (sync_logs Tabelle)

### Nice-to-Have (später):

1. **Dashboard** für Sync-Status
2. **Slack/Teams** Notifications
3. **Retry-Logik** verfeinern
4. **Real-time Sync** (stündlich statt täglich)

---

## ❓ OFFENE FRAGEN

1. **Hast du MS Direct API Tokens für alle 4 Companies?**
   - Falls nein: Wie bekommst du sie?

2. **Gibt es API Limits bei MS Direct?**
   - Wie viele Requests pro Tag erlaubt?

3. **Bevorzugst du:**
   - Option 1: MS Direct API (automatisch, elegant)
   - Option 2: File Export von BC (weniger elegant, aber funktioniert immer)

4. **Soll ich die Edge Function jetzt implementieren?**

---

## 📝 FAZIT

**Empfehlung:** Option 1 (MS Direct API + Cron)

**Vorteile:**
- ✅ 100% automatisch
- ✅ Nutzt existierende Integration
- ✅ Keine Infrastruktur nötig
- ✅ Günstig (~$0.60/Monat)
- ✅ In 1-2h implementierbar

**Sag mir Bescheid und ich implementiere es!** 🚀
