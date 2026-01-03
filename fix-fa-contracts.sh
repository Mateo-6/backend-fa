#!/bin/bash

echo "🔧 Compilando paquete fa-contracts..."

cd node_modules/fa-contracts

# Verificar si existe src/
if [ ! -d "src" ]; then
    echo "❌ Error: No se encontró la carpeta src/"
    echo "El paquete puede estar incompleto o necesitar ser reinstalado desde el repositorio"
    exit 1
fi

# Verificar si existe tsconfig.json
if [ ! -f "tsconfig.json" ]; then
    echo "❌ Error: No se encontró tsconfig.json"
    echo "El paquete puede estar incompleto"
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del paquete..."
    npm install
fi

# Compilar el paquete
echo "🔨 Compilando TypeScript..."
npm run build

# Verificar que se creó dist/
if [ -d "dist" ]; then
    echo "✅ Compilación exitosa!"
    echo ""
    echo "Estructura creada:"
    ls -la dist/ | head -20
    echo ""
    echo "Verificando archivos críticos:"
    test -f "dist/index.d.ts" && echo "✓ dist/index.d.ts existe" || echo "✗ dist/index.d.ts NO existe"
    test -f "dist/index.js" && echo "✓ dist/index.js existe" || echo "✗ dist/index.js NO existe"
else
    echo "❌ Error: La carpeta dist/ no se creó después de compilar"
    echo "Revisa los errores de compilación arriba"
    exit 1
fi

cd ../..
echo ""
echo "✅ Proceso completado. Ahora puedes intentar compilar tu proyecto con: npm run build"
