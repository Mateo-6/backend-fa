# Estructura Correcta de fa-contracts en node_modules

## ✅ Estructura que DEBERÍA tener

```
node_modules/fa-contracts/
├── package.json          ✅ (ya lo tienes)
├── README.md             ✅ (ya lo tienes)
└── dist/                 ❌ (FALTA - esto es el problema)
    ├── index.js          ❌ (FALTA)
    ├── index.d.ts        ❌ (FALTA)
    ├── enums/
    │   ├── index.js
    │   ├── index.d.ts
    │   ├── payment-method-type.enum.js
    │   ├── payment-method-type.enum.d.ts
    │   └── ... (otros enums)
    ├── interfaces/
    │   ├── index.js
    │   ├── index.d.ts
    │   ├── user.interface.js
    │   ├── user.interface.d.ts
    │   └── ... (otras interfaces)
    └── types/
        ├── index.js
        ├── index.d.ts
        └── ... (otros types)
```

## 📋 Explicación

### package.json
El `package.json` especifica:
```json
{
  "main": "dist/index.js",      // Punto de entrada JavaScript
  "types": "dist/index.d.ts"    // Punto de entrada TypeScript
}
```

Esto significa que cuando importas `fa-contracts`, Node.js busca:
1. `dist/index.js` para el código JavaScript
2. `dist/index.d.ts` para las definiciones de tipos TypeScript

### ¿Por qué falta dist/?

El paquete en GitHub probablemente solo tiene los archivos fuente (`src/`) y no los archivos compilados (`dist/`). Esto es común porque:
- Los archivos compilados normalmente se excluyen del repositorio (están en `.gitignore`)
- Se generan al hacer `npm run build`

## 🔧 Solución

Tienes 3 opciones:

### Opción 1: Compilar el paquete localmente (Recomendado)

```bash
cd node_modules/fa-contracts
npm install
npm run build
cd ../..
```

Esto generará la carpeta `dist/` con todos los archivos necesarios.

### Opción 2: Modificar el package.json del paquete para usar src/

Si el repositorio tiene `src/`, puedes cambiar temporalmente el `package.json`:

```bash
cd node_modules/fa-contracts
```

Edita `package.json` y cambia:
```json
{
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

**Nota:** Esto puede funcionar, pero no es lo ideal porque:
- TypeScript intentará compilar el código fuente del paquete
- Puede causar problemas si hay configuraciones incompatibles

### Opción 3: Hacer fork y compilar antes de subir

En el repositorio `fa-contracts`, asegúrate de:
1. Compilar antes de hacer commit: `npm run build`
2. Incluir `dist/` en el repositorio (no en `.gitignore`)
3. O usar GitHub Actions para compilar automáticamente

## 🔍 Verificación

Después de compilar, verifica:

```bash
ls -la node_modules/fa-contracts/dist/
```

Deberías ver:
- `index.js`
- `index.d.ts`
- Carpetas `enums/`, `interfaces/`, `types/` con sus archivos `.js` y `.d.ts`

## ⚠️ Problema Permanente

Si el repositorio no incluye `dist/`, tendrás que compilar cada vez que hagas `npm install`. 

Para evitar esto, considera:
1. Hacer fork del repositorio
2. Compilar y hacer commit de `dist/`
3. Usar tu fork en lugar del original

O pedir al mantenedor que incluya `dist/` en el repositorio.
