#!/bin/bash

echo "=== Verificando instalación de fa-contracts ==="
echo ""

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules no existe. Ejecuta: npm install"
    exit 1
fi

# Verificar si fa-contracts está instalado
if [ ! -d "node_modules/fa-contracts" ]; then
    echo "❌ fa-contracts no está instalado en node_modules"
    echo "Ejecuta: npm install"
    exit 1
fi

echo "✓ fa-contracts está instalado"

# Verificar package.json del paquete
if [ -f "node_modules/fa-contracts/package.json" ]; then
    echo "✓ package.json encontrado"
    echo ""
    echo "Contenido del package.json:"
    cat node_modules/fa-contracts/package.json | grep -A 5 '"main"\|"types"'
    echo ""
else
    echo "❌ package.json no encontrado en fa-contracts"
    exit 1
fi

# Verificar estructura de archivos
echo "=== Estructura del paquete ==="
if [ -d "node_modules/fa-contracts/dist" ]; then
    echo "✓ Directorio dist/ existe"
    if [ -f "node_modules/fa-contracts/dist/index.d.ts" ]; then
        echo "✓ dist/index.d.ts existe"
    else
        echo "⚠️  dist/index.d.ts NO existe - el paquete puede no estar compilado"
    fi
elif [ -f "node_modules/fa-contracts/src/index.ts" ]; then
    echo "✓ src/index.ts existe (paquete usa fuente TypeScript)"
else
    echo "⚠️  No se encontró ni dist/ ni src/index.ts"
fi

echo ""
echo "=== Intentando compilar TypeScript ==="
npx tsc --noEmit 2>&1 | head -30

