#!/usr/bin/env bash
set -e

echo "1. Instalando dependencias de Node..."
npm install

echo "2. Instalando Chrome para Puppeteer..."
npx puppeteer browsers install chrome

echo "3. Configurando fuentes de Emojis en la ruta moderna..."
# Usamos la ruta estándar actual de Linux para fuentes de usuario
mkdir -p ~/.local/share/fonts

# Descargamos la fuente
curl -L -o ~/.local/share/fonts/NotoColorEmoji.ttf https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf

# Actualizamos la caché
fc-cache -f -v

echo "¡Construcción finalizada con éxito!"
