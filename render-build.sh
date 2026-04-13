#!/usr/bin/env bash
# Salir inmediatamente si algún comando falla
set -e

echo "1. Instalando dependencias de Node..."
npm install

echo "2. Instalando Chrome para Puppeteer..."
npx puppeteer browsers install chrome

echo "3. Configurando fuentes de Emojis para el sistema operativo..."
# Creamos la carpeta de fuentes local del usuario en Linux
mkdir -p ~/.fonts

# Descargamos la fuente Noto Color Emoji directamente desde el repositorio oficial
curl -L -o ~/.fonts/NotoColorEmoji.ttf https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf

# Actualizamos la caché de fuentes de Linux para que Chrome la detecte
fc-cache -f -v

echo "¡Construcción finalizada con éxito!"
