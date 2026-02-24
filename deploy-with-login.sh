#!/bin/bash
# Deploy universal-import Edge Function with automatic login

set -e

PROJECT_REF="szruenulmfdxzhvupprf"
FUNCTION_NAME="universal-import"

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

# Try to login (this will open a browser)
echo "🔐 Versuche Login bei Supabase..."
echo "   (Ein Browser-Fenster sollte sich öffnen)"
echo ""

# Check if we have an access token
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "⚠️  Kein Access Token gefunden. Versuche interaktiven Login..."
    echo ""
    echo "Bitte führe manuell aus:"
    echo "  1. supabase login"
    echo "  2. supabase functions deploy universal-import --project-ref szruenulmfdxzhvupprf"
    echo ""
    echo "Oder setze einen Access Token:"
    echo "  export SUPABASE_ACCESS_TOKEN='dein-token'"
    echo "  ./deploy-universal-import.sh"
    echo ""
    exit 1
else
    echo "✅ Access Token gefunden"
    echo ""
    
    # Deploy with token
    echo "📦 Deploye Funktion mit Access Token..."
    echo ""
    
    if SUPABASE_ACCESS_TOKEN="$SUPABASE_ACCESS_TOKEN" supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_REF"; then
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
        exit 1
    fi
fi

