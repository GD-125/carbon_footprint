#!/usr/bin/env bash
# scripts/start_dev.sh
# Start the CarbonWise AI backend in development mode

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

echo "🌿 CarbonWise AI — Backend Development Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for .env file
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "⚠️  No .env file found. Copying .env.example..."
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "📝 Please edit $BACKEND_DIR/.env and add your GEMINI_API_KEY"
  echo ""
fi

# Check for virtual environment
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  echo "🐍 Creating virtual environment..."
  python3 -m venv "$BACKEND_DIR/.venv"
fi

# Activate virtual environment
source "$BACKEND_DIR/.venv/bin/activate"

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r "$BACKEND_DIR/requirements.txt" --quiet

# Check for Gemini API key
if grep -q "your_gemini_api_key_here" "$BACKEND_DIR/.env" 2>/dev/null; then
  echo "⚠️  WARNING: GEMINI_API_KEY not set in .env — AI features will not work"
  echo "   Get your key from: https://aistudio.google.com/app/apikey"
  echo ""
fi

echo "🚀 Starting CarbonWise API..."
echo "   API:  http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo "   Health: http://localhost:8000/health"
echo ""

cd "$BACKEND_DIR"
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --reload \
  --log-config /dev/null
