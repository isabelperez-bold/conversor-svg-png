#!/usr/bin/env bash
set -e

echo "1. Instalando dependencias de Node..."
npm install

echo "2. Instalando Chrome para Puppeteer..."
npx puppeteer browsers install chrome

echo "3. Configurando fuentes (Emojis y Montserrat)..."
mkdir -p ~/.local/share/fonts

# Descargamos Noto Emoji
curl -L -o ~/.local/share/fonts/NotoColorEmoji.ttf https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf

# Descargamos Montserrat (Versión Variable) directamente al servidor
curl -L -o ~/.local/share/fonts/Montserrat-VariableFont_wght.ttf https://github.com/JulietaUla/Montserrat/raw/master/fonts/variable/Montserrat-Italic-VariableFont_wght.ttf
curl -L -o ~/.local/share/fonts/Montserrat-Regular.ttf https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Regular.ttf
curl -L -o ~/.local/share/fonts/Montserrat-Bold.ttf https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Bold.ttf

# Actualizamos la caché de fuentes del sistema Linux
fc-cache -f -v

echo "¡Construcción finalizada con éxito!"
