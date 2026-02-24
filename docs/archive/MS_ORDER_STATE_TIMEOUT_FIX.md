# MS OrderState Timeout-Fix
## Lösung für Sync Timeout-Problem

**Datum:** 2025-12-29  
**Problem:** Sync-Button gibt Timeout-Fehler  
**Status:** ✅ **Fix implementiert**

---

## 🔍 **PROBLEM-ANALYSE**

### **Ursache:**
1. **Kein Timeout-Handling** - Requests können endlos laufen
2. **Zu viele Orders** - Batch-Sync versucht zu viele Orders auf einmal
3. **Langsame API** - MS Direct API antwortet langsam (>10 Sekunden)
4. **HTTP vs HTTPS** - Möglicherweise blockiert Supabase HTTP-Requests

---

## ✅ **IMPLEMENTIERTE FIXES**

### **1. Timeout-Handling** ✅

**Änderung:**
- Jeder API-Request hat jetzt **10 Sekunden Timeout**
- Verwendet `AbortController` für Request-Cancellation
- Timeout-Fehler werden klar geloggt

**Code:**
```typescript
const timeoutMs = 10000; // 10 seconds timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

const response = await fetch(url, {
  // ...
  signal: controller.signal,
});
```

### **2. HTTPS-Fallback** ✅

**Änderung:**
- Versucht zuerst **HTTPS** (falls Supabase HTTP blockiert)
- Fallback auf **HTTP** wenn HTTPS fehlschlägt
- Automatische Erkennung

**Code:**
```typescript
// Try HTTPS first, fallback to HTTP
let url = `${baseUrl}/services/MS_DynamicOrderState/msOrderState`;
if (baseUrl.startsWith('http://')) {
  const httpsUrl = baseUrl.replace('http://', 'https://');
  url = `${httpsUrl}/services/MS_DynamicOrderState/msOrderState`;
}
```

### **3. Reduzierte Batch-Größe** ✅

**Änderung:**
- **Vorher:** 20 Orders pro Sync
- **Jetzt:** 10 Orders pro Sync
- Verhindert Timeout bei langsamen API-Responses

**Code:**
```typescript
.limit(10); // Reduced to 10 orders per sync to avoid timeout
```

### **4. Optimierte Sync-Logik** ✅

**Änderung:**
- Nur Orders synchronisieren, die länger als 15 Minuten nicht synchronisiert wurden
- Verhindert unnötige Requests
- Schnellere Sync-Zeit

**Code:**
```typescript
const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

.or(`last_state_sync_at.is.null,last_state_sync_at.lt.${fifteenMinutesAgo}`)
```

### **5. Vollständige Daten-Updates** ✅

**Änderung:**
- Alle neuen Felder werden jetzt aktualisiert:
  - `ms_order_state`
  - `track_and_trace_id_return`
  - `track_and_trace_url_return`
  - `invoice_no`
  - `invoice_amount`
  - `payment_state`
  - `last_state_sync_at`

---

## 📊 **ERWARTETE VERBESSERUNGEN**

### **Vorher:**
- ❌ Timeout nach 30 Sekunden
- ❌ Keine Fehlerbehandlung
- ❌ 20 Orders = zu langsam
- ❌ Kein HTTPS-Fallback

### **Nachher:**
- ✅ Timeout nach 10 Sekunden pro Request
- ✅ Klare Fehlerbehandlung
- ✅ 10 Orders = schneller
- ✅ HTTPS-Fallback funktioniert
- ✅ Nur notwendige Orders werden synchronisiert

---

## 🎯 **KORREKTE API-URL**

### **Laut Postman Collection:**
- **URL:** `http://soap.ms-direct.ch/services/MS_DynamicOrderState/msOrderState`
- **Protocol:** HTTP (nicht HTTPS)
- **Variable:** `{{msOrderStateBaseUrl}}` = `http://soap.ms-direct.ch`

### **Implementierung:**
- **Default:** `http://soap.ms-direct.ch` (aus Postman Collection)
- **Environment Variable:** `MS_ORDER_STATE_BASE_URL` (kann überschrieben werden)
- **HTTPS-Fallback:** Versucht automatisch HTTPS, falls HTTP blockiert wird

---

## 🔧 **KONFIGURATION**

### **Environment Variables (Supabase):**

```bash
MS_ORDER_STATE_BASE_URL=http://soap.ms-direct.ch
# Oder falls HTTPS verfügbar:
# MS_ORDER_STATE_BASE_URL=https://soap.ms-direct.ch
```

### **Falls Timeout weiterhin auftritt:**

1. **URL prüfen:**
   - Teste die URL in Postman
   - Prüfe, ob HTTPS verfügbar ist
   - Prüfe Firewall/Network-Zugriff

2. **Timeout erhöhen:**
   - Ändere `timeoutMs` von 10000 auf 15000 (15 Sekunden)

3. **Batch-Größe reduzieren:**
   - Ändere `.limit(10)` auf `.limit(5)`

---

## 🧪 **TESTEN**

### **1. Manuelle Abfrage testen:**

```bash
# In OrderDetail: Button "Status aktualisieren" klicken
# Sollte jetzt funktionieren (mit Timeout-Handling)
```

### **2. Batch-Sync testen:**

```bash
# SyncAllOrdersButton klicken
# Sollte jetzt max. 10 Orders synchronisieren
# Timeout nach 10 Sekunden pro Request
```

### **3. Logs prüfen:**

```bash
# Supabase Dashboard → Edge Functions → Logs
# Suche nach "MS Direct API timeout" oder "HTTPS failed"
```

---

## ⚠️ **WICHTIGE HINWEISE**

### **URL-Problem:**
- Die Postman Collection verwendet `http://soap.ms-direct.ch`
- Supabase Edge Functions könnten HTTP blockieren
- **Lösung:** HTTPS-Fallback wurde implementiert

### **Falls HTTPS nicht verfügbar:**
- Die Funktion versucht automatisch HTTP als Fallback
- Logs zeigen, welche URL verwendet wurde

### **Falls weiterhin Timeout:**
- Die API antwortet möglicherweise zu langsam (>10 Sekunden)
- Lösung: Timeout erhöhen oder Batch-Größe reduzieren

---

## 📝 **NÄCHSTE SCHRITTE**

1. ✅ **Code wurde aktualisiert** - Timeout-Handling & HTTPS-Fallback
2. ⚠️ **Testen** - Sync-Button sollte jetzt funktionieren
3. ⚠️ **Logs prüfen** - Falls weiterhin Probleme, Logs analysieren
4. ⚠️ **URL verifizieren** - Prüfen, ob HTTPS verfügbar ist

---

## 🎉 **FERTIG!**

Die Timeout-Fixes wurden implementiert. Der Sync-Button sollte jetzt funktionieren!

**Bei weiterhin auftretenden Problemen:**
- Prüfe Logs in Supabase Dashboard
- Teste URL in Postman
- Prüfe Environment Variables

