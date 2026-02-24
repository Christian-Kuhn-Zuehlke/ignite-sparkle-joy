# Benachrichtigungen-Analyse
## Aktueller Stand: Was funktioniert, was fehlt?

**Datum:** 2025-12-27  
**Status:** ⚠️ **UI vorhanden, aber Backend-Logik fehlt**

---

## 🔍 **AKTUELLER STAND**

### ✅ **Was implementiert ist:**

#### **1. Frontend UI** ⭐⭐⭐⭐⭐
- ✅ **NotificationSettings Component** - Vollständige UI für Benachrichtigungseinstellungen
- ✅ **6 Benachrichtigungstypen** konfigurierbar:
  - Neue Bestellungen (`notify_order_created`)
  - Versand (`notify_order_shipped`)
  - Zustellung (`notify_order_delivered`)
  - Niedriger Lagerbestand (`notify_low_stock`)
  - SLA-Warnungen (`notify_sla_warning`)
  - Retouren (`notify_returns`)
- ✅ **Push-Berechtigung** - Browser-Berechtigung kann angefordert werden
- ✅ **Toggle Switches** - Für jeden Benachrichtigungstyp
- ✅ **Test-Button** - Test-Benachrichtigung senden

#### **2. Push Notification Infrastructure** ⭐⭐⭐⭐
- ✅ **Service Worker** (`public/sw.js`) - Empfängt Push-Events
- ✅ **VAPID Key** - Vorhanden (aber hardcoded)
- ✅ **usePushNotifications Hook** - Vollständige Logik für:
  - Permission Request
  - Subscription Management
  - Settings Management
- ✅ **Database Table** - `notification_settings` mit:
  - `push_enabled` (boolean)
  - `push_subscription` (JSONB)
  - Alle 6 Benachrichtigungstypen (boolean)

#### **3. Subscription Management** ⭐⭐⭐⭐
- ✅ **Subscribe** - Erstellt Push-Subscription und speichert in DB
- ✅ **Unsubscribe** - Entfernt Subscription
- ✅ **Settings Update** - Speichert Präferenzen in DB
- ✅ **Per-Company Settings** - Jeder User hat Settings pro Company

---

### ❌ **Was fehlt (KRITISCH):**

#### **1. Backend-Logik zum Senden von Push Notifications** 🔴 **KRITISCH**

**Problem:**
- ❌ **Keine Edge Function** zum Senden von Push Notifications
- ❌ **Keine Database Trigger** die Benachrichtigungen auslöst
- ❌ **Keine Integration** mit `web-push` Library
- ❌ **Subscription wird gespeichert, aber nie verwendet**

**Was passieren sollte:**
1. Order wird erstellt → Push Notification an alle User mit `notify_order_created = true`
2. Order Status ändert sich zu "shipped" → Push Notification an alle User mit `notify_order_shipped = true`
3. Order Status ändert sich zu "delivered" → Push Notification an alle User mit `notify_order_delivered = true`
4. Low Stock erkannt → Push Notification an alle User mit `notify_low_stock = true`
5. SLA-Verletzung → Push Notification an alle User mit `notify_sla_warning = true`
6. Return erstellt → Push Notification an alle User mit `notify_returns = true`

**Aktuell:** ❌ **Nichts davon passiert!**

---

#### **2. Email-Benachrichtigungen** ❌ **FEHLT**

**Was vorhanden ist:**
- ✅ **Email für Registrierungen** - `notify-registration` Edge Function
- ✅ **Resend Integration** - Email-Service ist konfiguriert

**Was fehlt:**
- ❌ **Email-Benachrichtigungen für Orders** - Keine Edge Function
- ❌ **Email-Benachrichtigungen für SLA-Warnungen** - Keine Edge Function
- ❌ **Email-Benachrichtigungen für Low Stock** - Keine Edge Function
- ❌ **Email-Templates** - Nur für Registrierungen vorhanden
- ❌ **Email-Settings in UI** - Keine Optionen für Email-Benachrichtigungen

---

#### **3. SMS-Benachrichtigungen** ❌ **FEHLT KOMPLETT**

- ❌ **Keine SMS-Integration** - Kein Service (Twilio, etc.)
- ❌ **Keine SMS-Settings** - Keine UI-Optionen
- ❌ **Keine SMS-Logik** - Keine Edge Functions

---

#### **4. WhatsApp-Benachrichtigungen** ❌ **FEHLT KOMPLETT**

- ❌ **Keine WhatsApp-Integration** - Kein Service (Twilio WhatsApp API, etc.)
- ❌ **Keine WhatsApp-Settings** - Keine UI-Optionen
- ❌ **Keine WhatsApp-Logik** - Keine Edge Functions

---

## 📊 **DETAILANALYSE**

### **Push Notifications - Was funktioniert:**

```typescript
// ✅ Frontend kann:
1. Browser-Berechtigung anfordern
2. Push-Subscription erstellen
3. Subscription in DB speichern
4. Settings speichern (welche Benachrichtigungen gewünscht)
5. Test-Benachrichtigung senden (lokal)

// ❌ Backend kann NICHT:
1. Push Notifications senden (keine Edge Function)
2. Auf Order-Events reagieren (keine Trigger)
3. Subscription aus DB lesen und verwenden
4. web-push Library nutzen
```

### **Email Notifications - Was funktioniert:**

```typescript
// ✅ Vorhanden:
1. Resend API Key konfiguriert
2. Email für Registrierungen funktioniert
3. Email-Templates für Registrierungen

// ❌ Fehlt:
1. Email für Order-Events
2. Email für SLA-Warnungen
3. Email für Low Stock
4. Email-Settings in UI
```

### **SMS & WhatsApp - Status:**

```typescript
// ❌ Komplett fehlt:
1. Keine Integration
2. Keine Settings
3. Keine Logik
```

---

## 🎯 **WAS PASSIERT AKTUELL?**

### **Wenn User Benachrichtigungen aktiviert:**

1. ✅ **Browser-Berechtigung** wird angefordert
2. ✅ **Push-Subscription** wird erstellt
3. ✅ **Subscription wird in DB gespeichert** (`notification_settings.push_subscription`)
4. ✅ **Settings werden gespeichert** (welche Benachrichtigungen gewünscht)
5. ❌ **ABER: Keine Benachrichtigungen werden gesendet!**

**Warum?**
- Es gibt keine Backend-Logik, die:
  - Auf Order-Events reagiert
  - Subscriptions aus der DB liest
  - Push Notifications sendet

---

## 🔧 **WAS MUSS IMPLEMENTIERT WERDEN?**

### **Phase 1: Push Notifications Backend** 🔴 **KRITISCH** (2-3 Tage)

#### **1.1 Edge Function: `send-push-notification`**

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as webpush from 'https://deno.land/x/webpush@0.0.0/mod.ts';

serve(async (req) => {
  const { companyId, notificationType, title, body, data } = await req.json();
  
  // 1. Hole alle User mit push_enabled = true und entsprechender Einstellung
  const { data: settings } = await supabase
    .from('notification_settings')
    .select('push_subscription, user_id')
    .eq('company_id', companyId)
    .eq('push_enabled', true)
    .eq(notificationType, true); // z.B. notify_order_created
  
  // 2. Sende Push Notification an alle Subscriptions
  for (const setting of settings) {
    await webpush.sendNotification(
      setting.push_subscription,
      JSON.stringify({ title, body, data })
    );
  }
});
```

#### **1.2 Database Trigger: Order Events → Push Notifications**

```sql
-- Trigger Function, die Push Notifications auslöst
CREATE OR REPLACE FUNCTION public.send_order_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Wenn Order erstellt wurde
  IF TG_OP = 'INSERT' THEN
    -- Rufe Edge Function auf
    PERFORM net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/send-push-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body := jsonb_build_object(
        'companyId', NEW.company_id,
        'notificationType', 'notify_order_created',
        'title', 'Neue Bestellung',
        'body', 'Bestellung ' || NEW.source_no || ' wurde erstellt'
      )
    );
  END IF;
  
  -- Wenn Status geändert wurde
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    IF NEW.status = 'shipped' THEN
      -- Versand-Benachrichtigung
      PERFORM net.http_post(...);
    ELSIF NEW.status = 'delivered' THEN
      -- Zustellungs-Benachrichtigung
      PERFORM net.http_post(...);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger auf orders Tabelle
CREATE TRIGGER order_notification_trigger
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.send_order_notification();
```

#### **1.3 VAPID Keys in Environment Variables**

```typescript
// Aktuell: Hardcoded in usePushNotifications.ts
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

// Sollte sein: Aus Environment Variable
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
```

---

### **Phase 2: Email-Benachrichtigungen** 🟠 **HOCH** (2-3 Tage)

#### **2.1 Edge Function: `send-email-notification`**

```typescript
// supabase/functions/send-email-notification/index.ts
import { Resend } from "https://esm.sh/resend@2.0.0";

serve(async (req) => {
  const { companyId, notificationType, userEmails, title, body, html } = await req.json();
  
  // Hole alle User mit email_notifications_enabled = true
  const { data: users } = await supabase
    .from('notification_settings')
    .select('user_id, email_notifications_enabled')
    .eq('company_id', companyId)
    .eq('email_notifications_enabled', true)
    .eq(notificationType, true);
  
  // Sende Email an alle User
  for (const user of users) {
    await resend.emails.send({
      from: "MSD Fulfillment <notifications@ms-direct.ch>",
      to: user.email,
      subject: title,
      html: html,
    });
  }
});
```

#### **2.2 Email-Settings in UI**

```typescript
// NotificationSettings.tsx erweitern:
- Email-Benachrichtigungen Toggle
- Email-Adresse anzeigen/ändern
- Email-Benachrichtigungstypen (gleiche wie Push)
```

---

### **Phase 3: SMS-Benachrichtigungen** 🟡 **MITTEL** (1-2 Tage)

#### **3.1 Twilio Integration**

```typescript
// supabase/functions/send-sms-notification/index.ts
import { Twilio } from "https://deno.land/x/twilio@0.1.0/mod.ts";

serve(async (req) => {
  const { companyId, notificationType, message } = await req.json();
  
  // Hole alle User mit sms_enabled = true
  const { data: users } = await supabase
    .from('notification_settings')
    .select('user_id, phone_number, sms_enabled')
    .eq('company_id', companyId)
    .eq('sms_enabled', true)
    .eq(notificationType, true);
  
  // Sende SMS
  for (const user of users) {
    await twilio.messages.create({
      to: user.phone_number,
      from: '+1234567890', // Twilio Number
      body: message,
    });
  }
});
```

#### **3.2 SMS-Settings in UI**

```typescript
// NotificationSettings.tsx erweitern:
- SMS-Benachrichtigungen Toggle
- Telefonnummer eingeben/ändern
- SMS-Benachrichtigungstypen
```

---

### **Phase 4: WhatsApp-Benachrichtigungen** 🟡 **MITTEL** (1-2 Tage)

#### **4.1 Twilio WhatsApp API Integration**

```typescript
// Ähnlich wie SMS, aber mit Twilio WhatsApp API
// WhatsApp-Nummern müssen verifiziert werden
```

---

## 📋 **IMPLEMENTIERUNGS-PLAN**

### **Sofort (diese Woche):**

1. ✅ **Push Notifications Backend** (2-3 Tage)
   - Edge Function `send-push-notification`
   - Database Trigger für Order-Events
   - VAPID Keys in Environment Variables

### **Kurzfristig (2 Wochen):**

2. ✅ **Email-Benachrichtigungen** (2-3 Tage)
   - Edge Function `send-email-notification`
   - Email-Settings in UI
   - Email-Templates

3. ✅ **SMS-Benachrichtigungen** (1-2 Tage)
   - Twilio Integration
   - SMS-Settings in UI

### **Mittelfristig (1 Monat):**

4. ✅ **WhatsApp-Benachrichtigungen** (1-2 Tage)
   - Twilio WhatsApp API
   - WhatsApp-Settings in UI

---

## 🎯 **FAZIT**

### **Aktueller Stand:**

| Feature | Frontend | Backend | Status |
|---------|----------|---------|--------|
| **Push Notifications** | ✅ Vollständig | ❌ Fehlt | 🔴 **Nicht funktionsfähig** |
| **Email Notifications** | ❌ Fehlt | ⚠️ Teilweise (nur Registrierungen) | 🟠 **Unvollständig** |
| **SMS Notifications** | ❌ Fehlt | ❌ Fehlt | ❌ **Nicht vorhanden** |
| **WhatsApp Notifications** | ❌ Fehlt | ❌ Fehlt | ❌ **Nicht vorhanden** |

### **Problem:**

**Die UI ist vollständig implementiert, aber es passiert nichts, weil:**
1. ❌ Keine Backend-Logik zum Senden von Push Notifications
2. ❌ Keine Trigger, die auf Order-Events reagieren
3. ❌ Keine Integration mit web-push Library

### **Empfehlung:**

**Sofort implementieren:**
1. 🔴 Push Notifications Backend (kritisch - UI ist fertig)
2. 🟠 Email-Benachrichtigungen (hoch - Resend ist schon da)

**Später:**
3. 🟡 SMS & WhatsApp (nice-to-have)

---

**Status:** ⚠️ **UI vorhanden, aber nicht funktionsfähig ohne Backend**

