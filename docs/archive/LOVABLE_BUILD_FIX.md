# Lovable Build/Preview Update Problem

## Problem
Lovable sieht die Commits von GitHub, aber die Preview/UI wird nicht aktualisiert.

## Lösung: Build in Lovable triggern

### Option 1: Hard Refresh
- **Mac:** `Cmd + Shift + R`
- **Windows:** `Ctrl + Shift + F5`
- Oder: Entwicklertools (F12) → Rechtsklick auf Reload → "Empty Cache and Hard Reload"

### Option 2: Lovable Build neu triggern
1. In Lovable eine minimale Änderung machen (z.B. Leerzeichen in einer Datei)
2. Speichern → Das triggert einen neuen Build
3. Preview sollte sich aktualisieren

### Option 3: Deploy/Preview neu starten
- In Lovable: "Share" → "Preview" → "Refresh"
- Oder: "Deploy" Button erneut klicken

### Option 4: Browser-Cache komplett leeren
- Safari: Entwicklertools → Caches leeren
- Oder: Privates Fenster öffnen und Lovable dort testen

## Verifikation
Nach dem Fix solltest du sehen:
- Rotes Herz (48x48px) mit Glow-Effekt
- In der Sidebar rechts neben "MS Direct" / "System Admin"
- Pulsierende Animation

