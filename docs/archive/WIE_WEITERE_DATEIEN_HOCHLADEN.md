# 📤 Weitere Dateien hochladen

## ✅ **Ja, du kannst jederzeit weitere Dateien hochladen!**

---

## 🎯 **Option 1: Dateien ins Verzeichnis legen**

### **Schritt 1: Dateien kopieren**
Kopiere deine neuen OrderState-Dateien in:
```
/Users/milostoessel/Downloads/Test_Files/
```

### **Schritt 2: Neuen Import starten**
```bash
cd /Users/milostoessel/clarity-flow-79/clarity-flow-79-1927e3ec
node import-new-orderstate-files.js
```

**Dieser Script:**
- ✅ Findet **ALLE** Dateien im Verzeichnis (auch neue)
- ✅ Importiert sie alle
- ✅ Unterstützt Streaming für große Dateien
- ✅ Zeigt Fortschritt an

---

## 🎯 **Option 2: Einzelne Datei importieren**

Falls du nur eine einzelne Datei importieren möchtest:

```bash
cd /Users/milostoessel/clarity-flow-79/clarity-flow-79-1927e3ec
node import-av-orderstate-direct.js
```

**Dann den Dateinamen eingeben** (oder im Script anpassen).

---

## 📋 **Unterstützte Dateiformate**

✅ **OrderState-Dateien:**
- `AV_OrderState_*.xml` (Aviano)
- `GT_OrderState_*.xml` (GetSA)
- `NK_OrderState_*.xml` (Namuk)

✅ **Auch ohne `.xml` Endung:**
- Der Import erkennt XML-Inhalt automatisch
- Dateien wie `AV_OrderState_ 2025-09-02..2025-12-30` funktionieren

---

## ⚠️ **Wichtig**

### **Während ein Import läuft:**
- ✅ Du kannst neue Dateien ins Verzeichnis legen
- ⚠️ Der laufende Import erkennt sie **nicht automatisch**
- ✅ Starte danach einen **neuen Import** mit `import-new-orderstate-files.js`

### **Duplikate:**
- ✅ Der Import prüft automatisch auf Duplikate
- ✅ Bestehende Orders werden **aktualisiert** (nicht doppelt importiert)
- ✅ Neue Orders werden **hinzugefügt**

---

## 🚀 **Schnellstart**

```bash
# 1. Neue Dateien ins Verzeichnis kopieren
# 2. Import starten:
cd /Users/milostoessel/clarity-flow-79/clarity-flow-79-1927e3ec
node import-new-orderstate-files.js
```

---

## 📊 **Status prüfen**

**Log-Datei:**
```bash
tail -f import-new-log.txt
```

**In der App:**
- Gehe zu `/orders`
- Filtere nach deinem Kunden (AV, GT, NK)
- Prüfe ob neue Orders sichtbar sind

---

## 💡 **Tipp**

Wenn du viele neue Dateien hast:
1. Kopiere alle neuen Dateien ins `Test_Files` Verzeichnis
2. Starte `import-new-orderstate-files.js`
3. Der Script importiert **alle** Dateien (auch die, die schon importiert wurden - werden dann aktualisiert)

