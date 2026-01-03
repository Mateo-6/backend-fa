# Solución de Problemas de Build

## Problema: No puedo hacer build de la aplicación

Si estás teniendo problemas al compilar después de migrar a `fa-contracts`, sigue estos pasos:

## 1. Verificar que el paquete esté instalado

```bash
npm install
```

## 2. Verificar que el paquete existe en node_modules

```bash
ls -la node_modules/fa-contracts
```

Si el paquete no existe, reinstálalo:
```bash
npm uninstall fa-contracts
npm install fa-contracts
```

## 3. Verificar la estructura del paquete

El paquete `fa-contracts` debe tener:
- `package.json` con el campo `"main"` y `"types"` configurados
- Archivos compilados en `dist/` (si el paquete necesita compilación)
- O archivos fuente TypeScript en `src/` si se importa directamente

## 4. Problema común: El paquete no está compilado

Si el paquete `fa-contracts` no está compilado, necesitas compilarlo primero:

```bash
cd node_modules/fa-contracts
npm install
npm run build
cd ../..
```

## 5. Verificar errores de TypeScript

Ejecuta TypeScript directamente para ver los errores específicos:

```bash
npx tsc --noEmit
```

## 6. Solución temporal: Usar tipos inline

Si el paquete no funciona, puedes temporalmente revertir a tipos inline mientras se soluciona el problema del paquete. Sin embargo, esto NO es recomendado a largo plazo.

## 7. Verificar el package.json del paquete fa-contracts

El `package.json` del paquete debe tener:

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts"
}
```

O si usa src directamente:

```json
{
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

## 8. Si el paquete está en GitHub

Si instalaste desde GitHub y hay problemas, verifica:

1. Que el repositorio sea accesible
2. Que la rama/commit exista
3. Que el repositorio tenga los archivos necesarios

Puedes reinstalar con:
```bash
npm uninstall fa-contracts
npm install github:Mateo-6/fa-contracts#main
```

## 9. Error específico: "Cannot find module 'fa-contracts'"

Si ves este error:

1. Verifica que esté en `package.json`:
```json
"dependencies": {
  "fa-contracts": "github:Mateo-6/fa-contracts#main"
}
```

2. Reinstala:
```bash
rm -rf node_modules package-lock.json
npm install
```

## 10. Verificar tsconfig.json

Asegúrate de que tu `tsconfig.json` tenga:

```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

## Pasos para diagnóstico completo

1. Limpiar e instalar:
```bash
rm -rf node_modules package-lock.json dist
npm install
```

2. Intentar compilar:
```bash
npm run build
```

3. Si falla, ver errores específicos:
```bash
npx tsc --noEmit 2>&1 | tee build-errors.log
```

4. Revisar el archivo `build-errors.log` para ver los errores específicos

