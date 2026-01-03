# Cómo usar @tu-usuario/finanzapp-contracts en tu proyecto

Hay varias formas de usar el paquete de contratos desde tu repositorio. Aquí están las opciones más comunes:

## Opción 1: Instalar desde GitHub (Recomendado para repos privados/públicos)

Si tu paquete está en un repositorio de GitHub:

```bash
npm install git+https://github.com/tu-usuario/finanzapp-contracts.git
# o para una rama específica
npm install git+https://github.com/tu-usuario/finanzapp-contracts.git#main
# o con SSH
npm install git+ssh://git@github.com:tu-usuario/finanzapp-contracts.git
```

Luego, en tu código:

```typescript
import { User, Category, PaymentMethod, Transaction, RecurringExpense } from '@tu-usuario/finanzapp-contracts';
import { PaymentMethodType, CategoryType, TransactionType, RecurringFrequency } from '@tu-usuario/finanzapp-contracts';
```

### Para usar en package.json:

```json
{
  "dependencies": {
    "@tu-usuario/finanzapp-contracts": "git+https://github.com/tu-usuario/finanzapp-contracts.git"
  }
}
```

---

## Opción 2: npm link (Desarrollo local)

Si tienes el repositorio localmente y quieres hacer desarrollo activo:

### En el repositorio del paquete (finanzapp-contracts):
```bash
cd finanzapp-contracts
npm install
npm run build
npm link
```

### En tu proyecto actual (api):
```bash
cd /Users/kulljam/Documents/Financial-app/api
npm link @tu-usuario/finanzapp-contracts
```

**Ventajas:**
- Los cambios en el paquete se reflejan automáticamente
- Ideal para desarrollo activo

**Desventajas:**
- Solo funciona localmente
- Requiere que otros desarrolladores también hagan el link

---

## Opción 3: Instalar desde ruta local

Si el repositorio está en tu sistema de archivos:

```bash
npm install ../ruta/a/finanzapp-contracts
# o con ruta absoluta
npm install /Users/kulljam/Documents/finanzapp-contracts
```

En package.json:
```json
{
  "dependencies": {
    "@tu-usuario/finanzapp-contracts": "file:../finanzapp-contracts"
  }
}
```

**Nota:** Esto copia los archivos, no es un link simbólico.

---

## Opción 4: Publicar en npm (Para producción)

### Si es público:
```bash
cd finanzapp-contracts
npm login
npm publish --access public
```

Luego instalar:
```bash
npm install @tu-usuario/finanzapp-contracts
```

### Si es privado (npm organizaciones):
```bash
cd finanzapp-contracts
npm publish --access restricted
```

Requiere que tengas acceso a la organización npm.

---

## Opción 5: Usar GitHub Packages (Recomendado para privado)

### 1. Configura el package.json del paquete:

```json
{
  "name": "@tu-usuario/finanzapp-contracts",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

### 2. Publica:
```bash
npm publish
```

### 3. Instala en tu proyecto:

Crea o edita `.npmrc` en la raíz de tu proyecto:
```
@tu-usuario:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=TU_TOKEN_DE_GITHUB
```

Luego:
```bash
npm install @tu-usuario/finanzapp-contracts
```

---

## Recomendación para tu caso

Si estás desarrollando activamente y el repositorio está en GitHub, recomiendo:

1. **Para desarrollo:** Usar `npm link` (Opción 2)
2. **Para CI/CD y producción:** Instalar desde GitHub (Opción 1) o publicar en GitHub Packages (Opción 5)

---

## Ejemplo de uso en tu proyecto

Una vez instalado, puedes usarlo así:

```typescript
// src/domain/user/types/user.types.ts
import { User } from '@tu-usuario/finanzapp-contracts';

// Ya no necesitas definir User aquí, solo importarlo
// export type { User } from '@tu-usuario/finanzapp-contracts';

// En tus servicios
import { User, Category, PaymentMethod, Transaction } from '@tu-usuario/finanzapp-contracts';
import { PaymentMethodType, TransactionType } from '@tu-usuario/finanzapp-contracts';

export class UserService {
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    // tu lógica
  }
}
```

---

## Actualizar el paquete

### Con npm link:
Los cambios se reflejan automáticamente después de hacer `npm run build` en el paquete.

### Con instalación desde git:
```bash
npm update @tu-usuario/finanzapp-contracts
# o reinstalar
npm uninstall @tu-usuario/finanzapp-contracts
npm install git+https://github.com/tu-usuario/finanzapp-contracts.git
```

### Con versión local:
```bash
npm update @tu-usuario/finanzapp-contracts
```

---

## Troubleshooting

### Error: "Cannot find module '@tu-usuario/finanzapp-contracts'"
- Asegúrate de haber hecho `npm install`
- Verifica que el nombre del paquete en package.json sea correcto
- Si usas npm link, asegúrate de haber ejecutado `npm link` en ambos lugares

### Error de tipos TypeScript
- Asegúrate de que el paquete tenga `"types": "dist/index.d.ts"` en package.json
- Verifica que el build haya generado los archivos `.d.ts`
- Asegúrate de que `tsconfig.json` tenga `declaration: true`

### Cambios no se reflejan
- Si usas npm link, ejecuta `npm run build` en el paquete
- Si instalaste desde git, reinstala el paquete
- Limpia node_modules y reinstala: `rm -rf node_modules package-lock.json && npm install`
