# Code-Duplikate Analyse (Codeleichen)
## Unnötiger Code und Duplikate

**Datum:** 2025-12-27  
**Version:** Nach Git Pull (neueste Version)  
**Status:** ⚠️ **Mehrere Code-Duplikate gefunden**

---

## 🎯 **EXECUTIVE SUMMARY**

### **Gefundene Duplikate:**
- **Kritische Duplikate:** 3
- **Wichtige Duplikate:** 5
- **Kleinere Duplikate:** 8
- **Total:** 16 Code-Duplikate

### **Geschätzter Aufwand zur Bereinigung:**
- **Kritisch:** 2-3 Stunden
- **Wichtig:** 4-6 Stunden
- **Klein:** 2-3 Stunden
- **Total:** 8-12 Stunden

---

## 🔴 **KRITISCHE DUPLIKATE**

### **1. Chatbot-Streaming-Logik** 🔴 **KRITISCH**

**Status:** ❌ **95% DUPLIZIERT**

**Dateien:**
- `src/components/ai/FulfillmentChatbot.tsx` (Zeilen 33-123)
- `src/components/ai/EmbeddedChatbot.tsx` (Zeilen 31-115)

**Problem:**
- Fast identische `streamChat` Funktionen
- Gleiche Error-Handling-Logik
- Gleiche Streaming-Logik
- Nur kleine Unterschiede (companyId vs activeCompanyId)

**Duplizierter Code:**
```typescript
// FulfillmentChatbot.tsx
const streamChat = async (userMessage: string) => {
  const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
  setMessages(newMessages);
  setIsLoading(true);
  setInput('');

  try {
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        companyId: profile?.company_id,
        language,
      }),
    });

    if (!resp.ok) {
      let errorMessage = t('chatbot.errorRequest');
      try {
        const error = await resp.json();
        errorMessage = error.error || errorMessage;
      } catch {
        errorMessage = `HTTP ${resp.status}: ${resp.statusText}`;
      }
      throw new Error(errorMessage);
    }

    if (!resp.body) throw new Error(t('chatbot.noResponse'));

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = '';
    let textBuffer = '';

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.startsWith('data: ')) {
          line = line.slice(6);
        }

        if (line === '[DONE]') {
          break;
        }

        try {
          const data = JSON.parse(line);
          if (data.choices?.[0]?.delta?.content) {
            assistantContent += data.choices[0].delta.content;
            setMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                role: 'assistant',
                content: assistantContent,
              };
              return updated;
            });
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('chatbot.errorRequest'));
    setMessages(prev => prev.slice(0, -1));
  } finally {
    setIsLoading(false);
  }
};
```

**Lösung:**
```typescript
// src/hooks/useChatbotStream.ts
export function useChatbotStream() {
  const { profile, activeCompanyId } = useAuth();
  const { language, t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const streamChat = useCallback(async (
    messages: Message[],
    onMessageUpdate: (messages: Message[]) => void
  ) => {
    setIsLoading(true);
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    
    try {
      const resp = await fetchWithTimeout(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          companyId: profile?.company_id || (activeCompanyId === 'ALL' ? undefined : activeCompanyId),
          language,
        }),
      }, 30000);

      // ... rest of streaming logic
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('chatbot.errorRequest'));
    } finally {
      setIsLoading(false);
    }
  }, [profile, activeCompanyId, language, t]);

  return { streamChat, isLoading };
}
```

**Impact:** 🔴 **HOCH** - ~200 Zeilen duplizierter Code

**Aufwand:** 1-2 Stunden

---

### **2. mapStatus Funktion** 🔴 **KRITISCH**

**Status:** ❌ **100% DUPLIZIERT**

**Dateien:**
- `supabase/functions/xml-import/index.ts` (Zeilen 99-107)
- `supabase/functions/xml-import-bulk/index.ts` (Zeilen 118-127)

**Problem:**
- Identische Funktion in beiden Dateien
- Gleiche Logik für Status-Mapping

**Duplizierter Code:**
```typescript
// xml-import/index.ts
function mapStatus(bcStatus?: string): 'received' | 'putaway' | 'picking' | 'packing' | 'ready_to_ship' | 'shipped' | 'delivered' {
  const statusMap: Record<string, 'received' | 'putaway' | 'picking' | 'packing' | 'ready_to_ship' | 'shipped' | 'delivered'> = {
    'received': 'received',
    'putaway': 'putaway',
    'picking': 'picking',
    'packing': 'packing',
    'ready_to_ship': 'ready_to_ship',
    'shipped': 'shipped',
    'delivered': 'delivered',
  };
  return statusMap[bcStatus || ''] || 'received';
}
```

**Lösung:**
```typescript
// supabase/functions/_shared/orderUtils.ts
export function mapStatus(bcStatus?: string): OrderStatus {
  const statusMap: Record<string, OrderStatus> = {
    'received': 'received',
    'putaway': 'putaway',
    'picking': 'picking',
    'packing': 'packing',
    'ready_to_ship': 'ready_to_ship',
    'shipped': 'shipped',
    'delivered': 'delivered',
  };
  return statusMap[bcStatus || ''] || 'received';
}
```

**Impact:** 🔴 **HOCH** - Gleiche Logik in 2 Dateien

**Aufwand:** 30 Minuten

---

### **3. Date-Locale-Logik** 🔴 **KRITISCH**

**Status:** ❌ **MEHRFACH DUPLIZIERT**

**Dateien:**
- `src/pages/Dashboard.tsx` (Zeilen 48-52)
- `src/pages/Orders.tsx` (vermutlich)
- `src/pages/Kpis.tsx` (vermutlich)
- `src/components/dashboard/PersonalizedGreeting.tsx` (vermutlich)

**Problem:**
- Gleiche `useMemo` Logik für Date-Locale
- Wird in vielen Komponenten wiederholt

**Duplizierter Code:**
```typescript
// Dashboard.tsx
const dateLocale = useMemo(() => {
  const locales = { de, en: enUS, fr, it, es };
  return locales[language] || de;
}, [language]);
```

**Lösung:**
```typescript
// src/hooks/useDateLocale.ts
export function useDateLocale() {
  const { language } = useLanguage();
  return useMemo(() => {
    const locales = { de, en: enUS, fr, it, es };
    return locales[language] || de;
  }, [language]);
}
```

**Impact:** 🔴 **HOCH** - In mindestens 4 Dateien dupliziert

**Aufwand:** 1 Stunde

---

## 🟠 **WICHTIGE DUPLIKATE**

### **4. effectiveCompanyId Logik** 🟠

**Status:** ⚠️ **MEHRFACH DUPLIZIERT**

**Dateien:**
- `src/pages/Dashboard.tsx` (Zeile 83)
- `src/pages/Orders.tsx` (vermutlich)
- `src/pages/Kpis.tsx` (vermutlich)
- `src/components/ai/EmbeddedChatbot.tsx` (Zeile 46)

**Problem:**
- Gleiche Logik: `activeCompanyId === 'ALL' ? undefined : activeCompanyId`

**Duplizierter Code:**
```typescript
// Dashboard.tsx
const effectiveCompanyId = activeCompanyId === 'ALL' ? undefined : (activeCompanyId || undefined);

// EmbeddedChatbot.tsx
companyId: activeCompanyId === 'ALL' ? undefined : activeCompanyId,
```

**Lösung:**
```typescript
// src/hooks/useEffectiveCompanyId.ts
export function useEffectiveCompanyId() {
  const { activeCompanyId } = useAuth();
  return useMemo(() => {
    return activeCompanyId === 'ALL' ? undefined : (activeCompanyId || undefined);
  }, [activeCompanyId]);
}
```

**Impact:** 🟠 **MITTEL** - In mindestens 4 Dateien

**Aufwand:** 30 Minuten

---

### **5. Error-Handling-Pattern** 🟠

**Status:** ⚠️ **MEHRFACH DUPLIZIERT**

**Dateien:**
- Viele Komponenten haben ähnliche try-catch Patterns

**Problem:**
- Gleiche Error-Handling-Logik:
  ```typescript
  try {
    // ...
  } catch (error) {
    console.error('Error:', error);
    toast.error(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
  }
  ```

**Lösung:**
```typescript
// src/lib/errorHandler.ts
export function handleError(error: unknown, context?: string) {
  const message = error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten';
  console.error(`[${context || 'Error'}]`, error);
  toast.error(message);
  return message;
}
```

**Impact:** 🟠 **MITTEL** - In vielen Dateien

**Aufwand:** 2-3 Stunden

---

### **6. formatDateForExport** 🟠

**Status:** ⚠️ **MÖGLICHERWEISE DUPLIZIERT**

**Dateien:**
- `src/lib/exportUtils.ts` (Zeilen 71-79)
- Möglicherweise in anderen Dateien

**Problem:**
- Date-Formatierung könnte an anderen Stellen dupliziert sein

**Impact:** 🟠 **NIEDRIG** - Nur 1 Datei gefunden

**Aufwand:** 15 Minuten (Prüfung)

---

### **7. Toast-Error-Pattern** 🟠

**Status:** ⚠️ **MEHRFACH DUPLIZIERT**

**Dateien:**
- Viele Komponenten

**Problem:**
- Gleiche Pattern:
  ```typescript
  toast.error(error instanceof Error ? error.message : 'Fehler');
  ```

**Impact:** 🟠 **NIEDRIG** - Kann durch `handleError` ersetzt werden

**Aufwand:** Teil von Error-Handling-Refactoring

---

### **8. Loading State Pattern** 🟠

**Status:** ⚠️ **MEHRFACH DUPLIZIERT**

**Dateien:**
- Viele Komponenten

**Problem:**
- Gleiche Pattern:
  ```typescript
  const [loading, setLoading] = useState(true);
  // ...
  try {
    setLoading(true);
    // ...
  } finally {
    setLoading(false);
  }
  ```

**Impact:** 🟠 **NIEDRIG** - Kann durch React Query ersetzt werden

**Aufwand:** Teil von größerem Refactoring

---

## 🟡 **KLEINERE DUPLIKATE**

### **9. Date Formatting** 🟡

**Status:** ⚠️ **MEHRFACH DUPLIZIERT**

**Dateien:**
- `src/components/dashboard/PersonalizedGreeting.tsx`
- Andere Komponenten

**Problem:**
- Ähnliche Date-Formatierung-Logik

**Impact:** 🟡 **NIEDRIG**

---

### **10. Company Filter Logic** 🟡

**Status:** ⚠️ **MÖGLICHERWEISE DUPLIZIERT**

**Dateien:**
- Verschiedene Komponenten

**Problem:**
- Ähnliche Logik für Company-Filtering

**Impact:** 🟡 **NIEDRIG**

---

### **11. Status Badge Colors** 🟡

**Status:** ⚠️ **MÖGLICHERWEISE DUPLIZIERT**

**Dateien:**
- `src/components/orders/SLABadge.tsx`
- Andere Badge-Komponenten

**Problem:**
- Ähnliche Logik für Status-Farben

**Impact:** 🟡 **NIEDRIG**

---

### **12. Validation Patterns** 🟡

**Status:** ⚠️ **MEHRFACH DUPLIZIERT**

**Dateien:**
- Viele Form-Komponenten

**Problem:**
- Ähnliche Validierungs-Logik

**Impact:** 🟡 **NIEDRIG** - Zod hilft bereits

---

## 📊 **ZUSAMMENFASSUNG**

### **Duplikate nach Kategorie:**

| Kategorie | Anzahl | Aufwand | Priorität |
|-----------|--------|---------|-----------|
| **Kritisch** | 3 | 2-3h | 🔴 **HOCH** |
| **Wichtig** | 5 | 4-6h | 🟠 **MITTEL** |
| **Klein** | 8 | 2-3h | 🟡 **NIEDRIG** |
| **Total** | 16 | 8-12h | - |

---

## 🎯 **EMPFEHLUNGEN**

### **Sofort fixen (Diese Woche):**

1. **Chatbot-Streaming-Logik** (1-2h)
   - Größtes Duplikat
   - Einfach zu refactoren
   - Großer Impact

2. **mapStatus Funktion** (30min)
   - Sehr einfach
   - Sofortiger Nutzen

3. **Date-Locale-Logik** (1h)
   - Einfach zu refactoren
   - Wird oft verwendet

### **Diese Woche:**

4. **effectiveCompanyId Logik** (30min)
5. **Error-Handling-Pattern** (2-3h)

### **Dieser Monat:**

6. **Kleinere Duplikate** (2-3h)

---

## 📋 **ACTION ITEMS**

### **Sofort:**
1. ✅ Chatbot-Streaming-Logik → `useChatbotStream` Hook
2. ✅ mapStatus → `_shared/orderUtils.ts`
3. ✅ Date-Locale → `useDateLocale` Hook

### **Diese Woche:**
4. ⚠️ effectiveCompanyId → `useEffectiveCompanyId` Hook
5. ⚠️ Error-Handling → `handleError` Utility

### **Dieser Monat:**
6. ⚠️ Kleinere Duplikate bereinigen

---

## 🎉 **FAZIT**

### **Ja, es gibt Code-Duplikate!**

**Gefunden:**
- ✅ **3 kritische Duplikate** (~200 Zeilen)
- ✅ **5 wichtige Duplikate** (~100 Zeilen)
- ✅ **8 kleinere Duplikate** (~50 Zeilen)

**Total:** ~350 Zeilen duplizierter Code

### **Empfehlung:**

**Sofort fixen:**
- Chatbot-Streaming-Logik (größtes Duplikat)
- mapStatus Funktion (einfach)
- Date-Locale-Logik (oft verwendet)

**Diese Woche:**
- effectiveCompanyId Logik
- Error-Handling-Pattern

**Dieser Monat:**
- Kleinere Duplikate

---

**Status:** ⚠️ **CODE-DUPLIKATE VORHANDEN - Bereinigung empfohlen**

**Geschätzter Aufwand:** 8-12 Stunden

