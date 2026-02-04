import { CategoryType } from '../../domain/category/types/category.types';

/**
 * Shape of a default category entry (no userId; assigned when creating for a user).
 */
export interface DefaultCategoryEntry {
  name: string;
  description: string;
  type: CategoryType;
}

/**
 * Default categories created for every new user.
 * Names and descriptions are in Spanish.
 *
 * @type {DefaultCategoryEntry[]}
 */
export const DEFAULT_CATEGORIES: DefaultCategoryEntry[] = [
  // Income
  {
    name: 'Salario',
    description: 'Ingresos por trabajo en relación de dependencia',
    type: CategoryType.INCOME,
  },
  {
    name: 'Freelance',
    description: 'Ingresos por trabajos independientes o proyectos',
    type: CategoryType.INCOME,
  },
  {
    name: 'Inversiones',
    description: 'Dividendos, intereses y ganancias de capital',
    type: CategoryType.INCOME,
  },
  {
    name: 'Otros ingresos',
    description: 'Regalos, reembolsos y otros ingresos varios',
    type: CategoryType.INCOME,
  },
  // Expenses
  {
    name: 'Alimentación',
    description: 'Supermercado, restaurantes y delivery',
    type: CategoryType.EXPENSE,
  },
  {
    name: 'Transporte',
    description: 'Combustible, transporte público, estacionamiento y mantenimiento del auto',
    type: CategoryType.EXPENSE,
  },
  {
    name: 'Vivienda',
    description: 'Alquiler, hipoteca e impuestos inmobiliarios',
    type: CategoryType.EXPENSE,
  },
  {
    name: 'Servicios',
    description: 'Luz, agua, gas, internet y teléfono',
    type: CategoryType.EXPENSE,
  },
  {
    name: 'Entretenimiento',
    description: 'Streaming, cine, hobbies y salidas',
    type: CategoryType.EXPENSE,
  },
  {
    name: 'Salud',
    description: 'Farmacia, consultas médicas y seguros',
    type: CategoryType.EXPENSE,
  },
  {
    name: 'Compras',
    description: 'Ropa, electrónica y artículos personales',
    type: CategoryType.EXPENSE,
  },
  {
    name: 'Suscripciones',
    description: 'Servicios y suscripciones mensuales',
    type: CategoryType.EXPENSE,
  },
  {
    name: 'Educación',
    description: 'Cursos, libros y certificaciones',
    type: CategoryType.EXPENSE,
  },
  {
    name: 'Ahorro',
    description: 'Dinero destinado al ahorro o inversión',
    type: CategoryType.EXPENSE,
  },
];
