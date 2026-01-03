# Guía rápida: Usar finanzapp-contracts en tu proyecto

## 1. Instalar el paquete

### Si está en GitHub:
```bash
npm install git+https://github.com/TU-USUARIO/finanzapp-contracts.git
```

### Si está localmente (desarrollo):
```bash
# En el repositorio del paquete
cd ../finanzapp-contracts
npm install
npm run build
npm link

# En tu proyecto actual
cd /Users/kulljam/Documents/Financial-app/api
npm link @tu-usuario/finanzapp-contracts
```

---

## 2. Actualizar tus imports

### Antes:
```typescript
// src/domain/user/types/user.types.ts
export interface User {
  id?: string;
  username: string;
  // ...
}

// src/application/services/user.service.ts
import { User } from '../../domain/user/types/user.types';
```

### Después:
```typescript
// src/domain/user/types/user.types.ts
// Ya no necesitas definir User aquí, solo re-exportarlo si quieres mantener compatibilidad
export type { User } from '@tu-usuario/finanzapp-contracts';

// O mejor, importar directamente donde se necesite
// src/application/services/user.service.ts
import { User } from '@tu-usuario/finanzapp-contracts';
```

---

## 3. Migración paso a paso

### Paso 1: Instalar el paquete
```bash
npm install git+https://github.com/TU-USUARIO/finanzapp-contracts.git
```

### Paso 2: Actualizar imports en los archivos de tipos

**src/domain/user/types/user.types.ts:**
```typescript
// Re-exportar desde el paquete (mantiene compatibilidad con código existente)
export type { User } from '@tu-usuario/finanzapp-contracts';
```

**src/domain/category/types/category.types.ts:**
```typescript
export type { Category, CategoryType } from '@tu-usuario/finanzapp-contracts';
```

**src/domain/payment-method/types/payment-method.types.ts:**
```typescript
export type { 
  PaymentMethod, 
  PaymentMethodType,
  PaymentMethodDetails,
  CreditCardDetails,
  BankAccountDetails,
  CashDetails,
  BankAccountType
} from '@tu-usuario/finanzapp-contracts';
```

**src/domain/finance/types/transaction.types.ts:**
```typescript
export type { 
  Transaction, 
  TransactionType,
  CategorySnapshot 
} from '@tu-usuario/finanzapp-contracts';
```

**src/domain/finance/types/recurring-expense.types.ts:**
```typescript
export type { 
  RecurringExpense,
  RecurringFrequency 
} from '@tu-usuario/finanzapp-contracts';
```

### Paso 3: Eliminar las definiciones duplicadas
Una vez que todos los imports funcionen, puedes eliminar las definiciones locales y mantener solo los re-exports.

---

## 4. Verificar que funciona

```bash
npm run build
```

Si no hay errores de compilación, ¡todo está listo!

---

## 5. Para desarrollo activo (npm link)

Si vas a modificar el paquete frecuentemente:

**Terminal 1 - En el repositorio del paquete:**
```bash
cd ../finanzapp-contracts
npm run build -- --watch
```

**Terminal 2 - En tu proyecto:**
```bash
cd /Users/kulljam/Documents/Financial-app/api
npm run dev
```

Los cambios en el paquete se reflejarán automáticamente.
