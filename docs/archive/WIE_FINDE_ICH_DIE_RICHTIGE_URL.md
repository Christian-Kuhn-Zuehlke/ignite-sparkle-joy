# Wie finde ich die richtige MS Direct API URL?
## Anleitung zur URL-Konfiguration

**Datum:** 2025-12-29  
**Status:** ✅ **Vollständige Anleitung**

---

## 🎯 **QUICK ANSWER**

Die richtige URL findest du in **3 Quellen**:

1. **Postman Collection** (Hauptquelle) ✅
2. **Supabase Environment Variables** (Konfiguration) ✅
3. **Code-Fallback** (Standard-Wert) ✅

---

## 📍 **1. POSTMAN COLLECTION** (Hauptquelle)

### **Wo findest du die URL?**

**Datei:** `msOrderState.postman_collection.json`

**Position:**
- **Variable:** `msOrderStateBaseUrl`
- **Wert:** `http://soap.ms-direct.ch`
- **Vollständige URL:** `http://soap.ms-direct.ch/services/MS_DynamicOrderState/msOrderState`

**So findest du es:**

1. Öffne die Postman Collection
2. Gehe zu **Variables** (unten in der Collection)
3. Suche nach `msOrderStateBaseUrl`
4. Der Wert ist: `http://soap.ms-direct.ch`

**Oder in den Requests:**
- Jeder Request verwendet: `{{msOrderStateBaseUrl}}/services/MS_DynamicOrderState/msOrderState`
- Ersetze `{{msOrderStateBaseUrl}}` mit `http://soap.ms-direct.ch`

---

## 🔧 **2. SUPABASE ENVIRONMENT VARIABLES** (Konfiguration)

### **Wo konfigurierst du die URL?**

**Supabase Dashboard → Settings → Edge Functions → Secrets**

**Environment Variable:**
```bash
MS_ORDER_STATE_BASE_URL=http://soap.ms-direct.ch
```

**So setzt du es:**

1. Gehe zu **Supabase Dashboard**
2. Klicke auf **Settings** (⚙️)
3. Klicke auf **Edge Functions**
4. Klicke auf **Secrets**
5. Füge hinzu:
   - **Name:** `MS_ORDER_STATE_BASE_URL`
   - **Value:** `http://soap.ms-direct.ch`
6. Klicke auf **Save**

**⚠️ WICHTIG:**
- Diese Variable überschreibt den Standard-Wert im Code
- Falls nicht gesetzt, wird der Fallback aus dem Code verwendet

---

## 💻 **3. CODE-FALLBACK** (Standard-Wert)

### **Wo steht der Standard-Wert im Code?**

**Dateien:**
- `supabase/functions/ms-order-state-sync/index.ts`
- `supabase/functions/ms-order-state-query/index.ts`

**Code:**
```typescript
const msBaseUrl = Deno.env.get('MS_ORDER_STATE_BASE_URL') || 'http://soap.ms-direct.ch';
```

**Bedeutung:**
- Versucht zuerst `MS_ORDER_STATE_BASE_URL` aus Environment Variables
- Falls nicht gesetzt → verwendet `http://soap.ms-direct.ch` als Fallback

---

## 🧪 **4. URL TESTEN** (Verifizierung)

### **Wie testest du, ob die URL funktioniert?**

**Option 1: Postman** ✅ (Empfohlen)

1. Öffne Postman
2. Importiere die Collection `msOrderState.postman_collection.json`
3. Führe einen Request aus (z.B. "orderState Aviano")
4. Prüfe die Response:
   - ✅ **200 OK** → URL funktioniert
   - ❌ **Timeout/Error** → URL falsch oder nicht erreichbar

**Option 2: cURL** ✅

```bash
curl -X POST http://soap.ms-direct.ch/services/MS_DynamicOrderState/msOrderState \
  -H "Content-Type: text/xml; charset=utf-8" \
  -H "SOAPAction: document/http://localhost:6060/:orderState" \
  -H "Authorization: Basic bXBAbXNvUFJEOm93V2VoRWFJbmczYlI0VWpkTVNh" \
  -d '<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <tns:orderState xmlns:tns="http://ms-direct.ch/soap/msSoapDataHandling">
      <tns:orderStateRequest>
        <tns:messageHeader>
          <tns:clientId>AV</tns:clientId>
          <tns:clientName>Aviano</tns:clientName>
          <tns:token>59019d5e-6d38-469a-898c-876e7c71281d</tns:token>
        </tns:messageHeader>
        <tns:request>
          <tns:orderNo>1000014</tns:orderNo>
          <tns:requestDate>2025-12-29</tns:requestDate>
        </tns:request>
      </tns:orderStateRequest>
    </tns:orderState>
  </soap:Body>
</soap:Envelope>'
```

**Option 3: Browser** ⚠️ (Nur für HTTP, nicht für SOAP)

- Öffne: `http://soap.ms-direct.ch`
- Prüfe, ob die Domain erreichbar ist
- ⚠️ **Hinweis:** SOAP-Requests funktionieren nicht im Browser

---

## 🔍 **5. HTTPS vs HTTP** (Wichtig!)

### **Welche URL sollte ich verwenden?**

**Aktuell (laut Postman Collection):**
- ✅ **HTTP:** `http://soap.ms-direct.ch`
- ❓ **HTTPS:** `https://soap.ms-direct.ch` (nicht getestet)

**Code-Verhalten:**
- Versucht automatisch **HTTPS** zuerst (falls HTTP in baseUrl)
- Fallback auf **HTTP** wenn HTTPS fehlschlägt

**So findest du heraus, ob HTTPS funktioniert:**

1. **Teste in Postman:**
   - Ändere Variable `msOrderStateBaseUrl` zu `https://soap.ms-direct.ch`
   - Führe Request aus
   - ✅ **200 OK** → HTTPS funktioniert
   - ❌ **Error** → Nur HTTP verfügbar

2. **Prüfe Logs:**
   - Supabase Dashboard → Edge Functions → Logs
   - Suche nach: `"HTTPS failed, trying HTTP fallback"`
   - Falls vorhanden → HTTPS funktioniert nicht

---

## 📋 **6. CHECKLISTE: URL KONFIGURIEREN**

### **Schritt-für-Schritt:**

- [ ] **1. Postman Collection prüfen**
  - Öffne `msOrderState.postman_collection.json`
  - Finde `msOrderStateBaseUrl` Variable
  - Notiere den Wert: `http://soap.ms-direct.ch`

- [ ] **2. URL in Postman testen**
  - Führe einen Request aus
  - Prüfe, ob Response kommt
  - ✅ Funktioniert → URL ist korrekt

- [ ] **3. HTTPS testen (optional)**
  - Ändere Variable zu `https://soap.ms-direct.ch`
  - Teste erneut
  - ✅ Funktioniert → HTTPS verfügbar
  - ❌ Fehler → Nur HTTP verfügbar

- [ ] **4. Supabase Environment Variable setzen**
  - Gehe zu Supabase Dashboard → Settings → Edge Functions → Secrets
  - Füge hinzu: `MS_ORDER_STATE_BASE_URL=http://soap.ms-direct.ch`
  - (Oder `https://soap.ms-direct.ch` falls HTTPS funktioniert)

- [ ] **5. Edge Function testen**
  - Rufe Edge Function auf
  - Prüfe Logs in Supabase Dashboard
  - ✅ Erfolg → URL korrekt konfiguriert

---

## 🎯 **7. AKTUELLE KONFIGURATION**

### **Was ist aktuell konfiguriert?**

**Postman Collection:**
- ✅ `msOrderStateBaseUrl` = `http://soap.ms-direct.ch`

**Code (Fallback):**
- ✅ `http://soap.ms-direct.ch` (wenn Environment Variable nicht gesetzt)

**Supabase Environment Variable:**
- ⚠️ **Prüfe in Supabase Dashboard**, ob `MS_ORDER_STATE_BASE_URL` gesetzt ist

**Vollständige API-URL:**
- ✅ `http://soap.ms-direct.ch/services/MS_DynamicOrderState/msOrderState`

---

## ⚠️ **8. HÄUFIGE PROBLEME**

### **Problem 1: Timeout**

**Symptom:**
- Request läuft endlos
- Timeout-Fehler nach 30 Sekunden

**Lösung:**
- ✅ Timeout-Handling wurde bereits implementiert (10 Sekunden)
- Prüfe, ob URL erreichbar ist (Postman-Test)
- Prüfe Firewall/Network-Zugriff

---

### **Problem 2: HTTPS vs HTTP**

**Symptom:**
- HTTP funktioniert in Postman
- Edge Function gibt Timeout

**Lösung:**
- Supabase könnte HTTP blockieren
- ✅ Code versucht automatisch HTTPS, dann HTTP
- Prüfe Logs: `"HTTPS failed, trying HTTP fallback"`

---

### **Problem 3: Falsche URL**

**Symptom:**
- 404 Not Found
- Connection Refused

**Lösung:**
- Prüfe Postman Collection (Hauptquelle)
- Prüfe, ob URL in Supabase Environment Variables korrekt ist
- Teste URL in Postman

---

## 📞 **9. WENN DU DIE URL NICHT FINDEST**

### **Frag MS Direct Support:**

1. **Welche URL sollte ich für die OrderState API verwenden?**
   - HTTP: `http://soap.ms-direct.ch/services/MS_DynamicOrderState/msOrderState`?
   - HTTPS: `https://soap.ms-direct.ch/services/MS_DynamicOrderState/msOrderState`?

2. **Ist HTTPS verfügbar?**
   - Falls ja → verwende HTTPS in Environment Variable

3. **Gibt es eine andere URL?**
   - Falls die URL in Postman Collection veraltet ist

---

## ✅ **ZUSAMMENFASSUNG**

**Die richtige URL findest du:**

1. ✅ **Postman Collection** → Variable `msOrderStateBaseUrl` = `http://soap.ms-direct.ch`
2. ✅ **Supabase Dashboard** → Settings → Edge Functions → Secrets → `MS_ORDER_STATE_BASE_URL`
3. ✅ **Code-Fallback** → `http://soap.ms-direct.ch` (wenn Environment Variable nicht gesetzt)

**Vollständige API-URL:**
- `http://soap.ms-direct.ch/services/MS_DynamicOrderState/msOrderState`

**Testen:**
- ✅ Postman (empfohlen)
- ✅ cURL
- ✅ Edge Function Logs

---

## 🎉 **FERTIG!**

Du weißt jetzt, wo du die richtige URL findest! 🚀

