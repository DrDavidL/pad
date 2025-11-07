#!/bin/bash

# Script to remove sensitive API keys and passwords from documentation
# Run this before committing to git

echo "Sanitizing documentation files..."

# Define patterns to replace
OPENAI_KEY_PATTERN="sk-proj-[A-Za-z0-9_-]+"
ELEVENLABS_KEY_PATTERN="sk_[a-f0-9]{40,}"
GROQ_KEY_PATTERN="gsk_[A-Za-z0-9]+"
DB_PASSWORD_PATTERN="YOUR_DB_PASSWORD"
SECRET_KEY_PATTERN="OOt9myCbtGdxRI7XKbSLe\^eDqUy4nrQ\^"
ADMIN_PASSWORD_PATTERN="Wqy6kHWy\\\$Lon9S6"

# Files to sanitize
FILES=(
    "README_AUDIO_FIX.md"
    "QUICK_START.md"
    "DEPLOYMENT_SETUP.md"
    "howto.md"
    "todo.md"
    "plan.md"
    "DEPLOYMENT_GUIDE.md"
    "vera-api/RAILWAY_SETUP.md"
    "VERA_FRONTEND_COMPLETE.md"
    "vera-api/QUICKSTART.md"
    "vera-api/IMPLEMENTATION_SUMMARY.md"
    "scripts/check_env_vars.sh"
)

# Backup directory
BACKUP_DIR="/Users/david/GitHub/pad/.docs_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

for file in "${FILES[@]}"; do
    FULL_PATH="/Users/david/GitHub/pad/$file"

    if [ -f "$FULL_PATH" ]; then
        echo "Sanitizing: $file"

        # Backup original
        cp "$FULL_PATH" "$BACKUP_DIR/$(basename $file)"

        # Replace sensitive data with placeholders
        sed -i '' \
            -e "s/$OPENAI_KEY_PATTERN/sk-proj-YOUR_OPENAI_KEY_HERE/g" \
            -e "s/$ELEVENLABS_KEY_PATTERN/sk_YOUR_ELEVENLABS_KEY_HERE/g" \
            -e "s/$GROQ_KEY_PATTERN/gsk_YOUR_GROQ_KEY_HERE/g" \
            -e "s/$DB_PASSWORD_PATTERN/YOUR_DB_PASSWORD_HERE/g" \
            -e "s/$SECRET_KEY_PATTERN/YOUR_SECRET_KEY_MIN_32_CHARS_HERE/g" \
            -e "s/$ADMIN_PASSWORD_PATTERN/YOUR_ADMIN_PASSWORD_HERE/g" \
            "$FULL_PATH"
    else
        echo "File not found: $file"
    fi
done

echo ""
echo "Sanitization complete!"
echo "Backups saved to: $BACKUP_DIR"
echo ""
echo "Please verify the changes before committing:"
echo "git diff"
