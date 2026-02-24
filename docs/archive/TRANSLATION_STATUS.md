# Übersetzungs-Status - Detaillierte Analyse
## Welche Komponenten müssen noch übersetzt werden?

**Datum:** 2025-12-27  
**Nach dem neuesten GitHub Pull**

---

## 📊 **ÜBERSICHT**

### **Aktueller Stand:**
- ✅ **24 Komponenten** nutzen bereits `useLanguage`
- ✅ **9 Pages** nutzen bereits `useLanguage`
- ⚠️ **~16 Settings-Komponenten** haben noch hardcodierte deutsche Texte
- ⚠️ **7 Onboarding-Komponenten** haben noch hardcodierte deutsche Texte
- ⚠️ **Viele weitere Komponenten** müssen noch übersetzt werden

---

## ✅ **BEREITS ÜBERSETZT (useLanguage vorhanden)**

### **Settings-Komponenten (4/20):**
1. ✅ `NotificationSettings.tsx` - **FERTIG** (nutzt `t()`)
2. ✅ `SystemTab.tsx` - **FERTIG** (nutzt `t()`)
3. ✅ `SettingsOverviewTab.tsx` - **FERTIG** (nutzt `t()`)
4. ✅ `PendingRegistrations.tsx` - **FERTIG** (nutzt `t()`)

### **Pages (9/9):**
1. ✅ `Dashboard.tsx` - **FERTIG**
2. ✅ `Orders.tsx` - **FERTIG**
3. ✅ `OrderDetail.tsx` - **FERTIG**
4. ✅ `Inventory.tsx` - **FERTIG**
5. ✅ `Returns.tsx` - **FERTIG**
6. ✅ `Kpis.tsx` - **FERTIG**
7. ✅ `AIHub.tsx` - **FERTIG**
8. ✅ `Settings.tsx` - **FERTIG**
9. ✅ `NotFound.tsx` - **FERTIG**

### **Dashboard-Widgets (10/10):**
1. ✅ `PersonalizedGreeting.tsx` - **FERTIG**
2. ✅ `OrderPipeline.tsx` - **FERTIG**
3. ✅ `LiveActivityFeed.tsx` - **FERTIG**
4. ✅ `AIForecastWidget.tsx` - **FERTIG**
5. ✅ `AIAlertsWidget.tsx` - **FERTIG**
6. ✅ `RecentOrders.tsx` - **FERTIG**
7. ✅ `KpiWidget.tsx` - **FERTIG**
8. ✅ `SLAComplianceWidget.tsx` - **FERTIG**
9. ✅ `CustomerActivityWidget.tsx` - **FERTIG**
10. ✅ `AlertsWidget.tsx` - **FERTIG**

### **Layout & Navigation (8/8):**
1. ✅ `Sidebar.tsx` - **FERTIG**
2. ✅ `MobileSidebar.tsx` - **FERTIG**
3. ✅ `Header.tsx` - **FERTIG**
4. ✅ `CompanySwitcher.tsx` - **FERTIG**
5. ✅ `LanguageSelector.tsx` - **FERTIG**
6. ✅ `ThemeToggle.tsx` - **FERTIG**
7. ✅ `OrdersTable.tsx` - **FERTIG**
8. ✅ `OrdersPagination.tsx` - **FERTIG**

### **AI & Other:**
1. ✅ `FulfillmentChatbot.tsx` - **FERTIG**

---

## ❌ **NOCH ZU ÜBERSETZEN**

### **🔴 Settings-Komponenten (16 Dateien) - PRIORITÄT HOCH**

#### **1. UsersTab.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Benutzer suchen nach Name, E-Mail oder Unternehmen..."
- "Alle Benutzer" / "Team-Benutzer"
- "Name", "E-Mail", "Unternehmen", "Rolle"
- "Zuletzt eingeloggt"
- "Details"
- "Keine Benutzer gefunden"
- Rollen-Labels: "Kunde – Viewer", "Kunde – Admin", etc.

**Benötigte Keys:**
```typescript
'settings.users.title': 'Benutzer',
'settings.users.search': 'Benutzer suchen nach Name, E-Mail oder Unternehmen...',
'settings.users.allUsers': 'Alle Benutzer',
'settings.users.teamUsers': 'Team-Benutzer',
'settings.users.lastLogin': 'Zuletzt eingeloggt',
'settings.users.never': 'Nie',
'settings.users.details': 'Details',
'settings.users.noUsersFound': 'Keine Benutzer gefunden',
'settings.users.columns.name': 'Name',
'settings.users.columns.email': 'E-Mail',
'settings.users.columns.company': 'Unternehmen',
'settings.users.columns.role': 'Rolle',
```

#### **2. UserDetailDialog.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Benutzer bearbeiten"
- "Rolle", "E-Mail", "Vollständiger Name"
- "Mitgliedschaften", "Primäre Mitgliedschaft"
- "Rolle ändern", "Speichern", "Abbrechen"
- Rollen-Labels

**Benötigte Keys:**
```typescript
'settings.userDetail.title': 'Benutzer bearbeiten',
'settings.userDetail.role': 'Rolle',
'settings.userDetail.email': 'E-Mail',
'settings.userDetail.fullName': 'Vollständiger Name',
'settings.userDetail.memberships': 'Mitgliedschaften',
'settings.userDetail.primaryMembership': 'Primäre Mitgliedschaft',
'settings.userDetail.changeRole': 'Rolle ändern',
'settings.userDetail.save': 'Speichern',
'settings.userDetail.cancel': 'Abbrechen',
```

#### **3. ApiKeyManagement.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "API-Schlüssel verwalten"
- "Neuer API-Schlüssel", "Schlüssel erstellen"
- "Schlüssel löschen", "Kopieren"
- Viele weitere Texte

#### **4. AuditLogViewer.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Audit Log"
- "Aktion", "Benutzer", "Ressource", "Zeitstempel"
- Filter-Optionen

#### **5. BrandColorSettings.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Markenfarben"
- "Primärfarbe", "Akzentfarbe"
- "Von Website extrahieren"

#### **6. DeleteAccountSection.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Konto löschen"
- "Konto wirklich löschen?"
- "Ihr Konto wird deaktiviert..."
- "Grund für die Löschung"
- "LÖSCHEN" Bestätigung

#### **7. DeletedUsersManagement.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Gelöschte Benutzer"
- "Wiederherstellen", "Endgültig löschen"
- Viele weitere Texte

#### **8. FeatureToggles.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Feature-Toggles"
- Feature-Namen und Beschreibungen

#### **9. IntegrationConfig.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Integrationen konfigurieren"
- "Microsoft Business Central", "WooCommerce", etc.
- Konfigurationsfelder

#### **10. InventoryImport.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Lagerbestand importieren"
- "Datei hochladen", "Import starten"
- Status-Meldungen

#### **11. KpiManagement.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "KPI-Verwaltung"
- "Neuer KPI", "Ziel", "Aktuell"
- Viele weitere Texte

#### **12. MembershipsManagement.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Mitgliedschaften verwalten"
- "Benutzer hinzufügen", "Rolle zuweisen"
- Viele weitere Texte

#### **13. SLAManagement.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "SLA-Verwaltung"
- "SLA-Regel erstellen", "Zielzeit", "Warnung"
- Viele weitere Texte

#### **14. WebhookConfig.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Webhook-Konfiguration"
- "Webhook-URL", "Geheimnis"
- Viele weitere Texte

#### **15. XmlImport.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "XML-Import"
- "Datei auswählen", "Import starten"
- Status-Meldungen

#### **16. ConfigurationTab.tsx** 🔴
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- Verschiedene Konfigurationstexte

---

### **🟠 Onboarding-Komponenten (7 Dateien) - PRIORITÄT HOCH**

#### **1. OnboardingWizard.tsx** 🟠
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Willkommen", "Schritt X von Y"
- "Weiter", "Zurück", "Fertigstellen"
- Schritt-Titel

#### **2. StepCompanyDetails.tsx** 🟠
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Firmenname", "Website / Domain"
- "Branche", "Firmen-ID"
- Placeholder-Texte

#### **3. StepBranding.tsx** 🟠
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Firmenlogo", "Markenfarben"
- "Von Website extrahieren"
- "Primär", "Akzent"

#### **4. StepSLA.tsx** 🟠
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "SLA-Konfiguration"
- SLA-spezifische Texte

#### **5. StepIntegrations.tsx** 🟠
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Integrationen einrichten"
- Integration-Namen und Beschreibungen

#### **6. StepUsers.tsx** 🟠
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Benutzer hinzufügen"
- Benutzer-Verwaltungstexte

#### **7. StepGoLive.tsx** 🟠
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Bereit zum Go-Live"
- Go-Live-spezifische Texte

---

### **🟡 Weitere Komponenten**

#### **1. WelcomeOverlay.tsx** 🟡
**Status:** ⚠️ Teilweise übersetzt
**Hardcodierte Texte:**
- "Guten Morgen", "Guten Tag", "Guten Abend"
- "Offene Bestellungen", "Versandbereit", etc.
- KPI-Labels

#### **2. BulkActionsBar.tsx** 🟡
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "X Bestellungen ausgewählt"
- "Aktionen", "Status ändern"

#### **3. OrderNotes.tsx** 🟡
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Notizen", "Neue Notiz hinzufügen"
- Notiz-Verwaltungstexte

#### **4. OrderTimeline.tsx** 🟡
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- Timeline-Events und Labels

#### **5. SLABadge.tsx** 🟡
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- SLA-Status-Labels

#### **6. ErrorBoundary.tsx** 🟡
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- Fehlermeldungen

#### **7. ResetPassword.tsx** 🟡
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- "Passwort zurücksetzen"
- Formular-Texte

#### **8. CompanyAutocomplete.tsx** 🟡
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- Autocomplete-Labels

#### **9. ProtectedRoute.tsx** 🟡
**Status:** ❌ Kein `useLanguage`
**Hardcodierte Texte:**
- Zugriffs-Fehlermeldungen

---

## 📋 **PRIORITÄTEN**

### **Phase 1: Settings-Komponenten (16 Dateien)** 🔴 **KRITISCH**
1. `UsersTab.tsx` - Wird häufig verwendet
2. `UserDetailDialog.tsx` - Wird häufig verwendet
3. `ApiKeyManagement.tsx`
4. `AuditLogViewer.tsx`
5. `BrandColorSettings.tsx`
6. `DeleteAccountSection.tsx`
7. `DeletedUsersManagement.tsx`
8. `FeatureToggles.tsx`
9. `IntegrationConfig.tsx`
10. `InventoryImport.tsx`
11. `KpiManagement.tsx`
12. `MembershipsManagement.tsx`
13. `SLAManagement.tsx`
14. `WebhookConfig.tsx`
15. `XmlImport.tsx`
16. `ConfigurationTab.tsx`

### **Phase 2: Onboarding-Komponenten (7 Dateien)** 🟠 **HOCH**
1. `OnboardingWizard.tsx`
2. `StepCompanyDetails.tsx`
3. `StepBranding.tsx`
4. `StepSLA.tsx`
5. `StepIntegrations.tsx`
6. `StepUsers.tsx`
7. `StepGoLive.tsx`

### **Phase 3: Weitere Komponenten (9 Dateien)** 🟡 **MITTEL**
1. `WelcomeOverlay.tsx`
2. `BulkActionsBar.tsx`
3. `OrderNotes.tsx`
4. `OrderTimeline.tsx`
5. `SLABadge.tsx`
6. `ErrorBoundary.tsx`
7. `ResetPassword.tsx`
8. `CompanyAutocomplete.tsx`
9. `ProtectedRoute.tsx`

---

## 📊 **STATISTIK**

| Kategorie | Gesamt | Übersetzt | Zu übersetzen | % Fertig |
|-----------|--------|-----------|---------------|----------|
| **Settings** | 20 | 4 | 16 | 20% |
| **Onboarding** | 7 | 0 | 7 | 0% |
| **Pages** | 9 | 9 | 0 | 100% ✅ |
| **Dashboard** | 10 | 10 | 0 | 100% ✅ |
| **Layout** | 8 | 8 | 0 | 100% ✅ |
| **Weitere** | 9 | 0 | 9 | 0% |
| **Gesamt** | **63** | **31** | **32** | **49%** |

---

## ✅ **NÄCHSTE SCHRITTE**

1. **Settings-Komponenten übersetzen** (16 Dateien)
   - Keys in `LanguageContext.tsx` hinzufügen
   - Komponenten parallel aktualisieren

2. **Onboarding-Komponenten übersetzen** (7 Dateien)
   - Keys in `LanguageContext.tsx` hinzufügen
   - Komponenten parallel aktualisieren

3. **Weitere Komponenten übersetzen** (9 Dateien)
   - Keys in `LanguageContext.tsx` hinzufügen
   - Komponenten parallel aktualisieren

---

**Status:** ⚠️ **49% fertig - 32 Komponenten müssen noch übersetzt werden**


