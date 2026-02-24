#!/bin/bash
# Deploy universal-import Edge Function to Supabase

set -e

PROJECT_REF="szruenulmfdxzhvupprf"
FUNCTION_NAME="universal-import"
FUNCTION_DIR="supabase/functions/universal-import"

echo "🚀 Deploye Edge Function: $FUNCTION_NAME"
echo "=========================================="
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI nicht gefunden!"
    echo "Bitte installiere es mit: brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI gefunden: $(supabase --version)"
echo ""

# Check if function directory exists
if [ ! -d "$FUNCTION_DIR" ]; then
    echo "❌ Funktion-Verzeichnis nicht gefunden: $FUNCTION_DIR"
    exit 1
fi

echo "✅ Funktion-Verzeichnis gefunden: $FUNCTION_DIR"
echo ""

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Nicht bei Supabase eingeloggt"
    echo ""
    echo "Bitte führe zuerst aus:"
    echo "  supabase login"
    echo ""
    echo "Oder setze einen Access Token:"
    echo "  export SUPABASE_ACCESS_TOKEN='dein-token'"
    echo ""
    exit 1
fi

echo "✅ Bei Supabase eingeloggt"
echo ""

# Deploy the function
echo "📦 Deploye Funktion..."
echo ""

if supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_REF"; then
    echo ""
    echo "✅ ✅ ✅ DEPLOYMENT ERFOLGREICH! ✅ ✅ ✅"
    echo ""
    echo "Die Edge Function wurde erfolgreich deployed."
    echo "Du kannst sie jetzt testen mit:"
    echo "  node test-returns-import.js"
    echo ""
else
    echo ""
    echo "❌ Deployment fehlgeschlagen"
    echo ""
    echo "Bitte prüfe:"
    echo "  1. Bist du bei Supabase eingeloggt? (supabase login)"
    echo "  2. Hast du die richtigen Berechtigungen?"
    echo "  3. Ist die Projekt-ID korrekt? ($PROJECT_REF)"
    echo ""
    exit 1
fi

