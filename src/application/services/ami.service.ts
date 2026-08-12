import crypto from "crypto";
import { IAiParser } from "../../domain/ai/services/ai-parser.interface";
import { ICache } from "../../domain/cache/cache.interface";
import { cacheKeys } from "../constants/cache-keys";
import { CategoryService } from "./category.service";
import { PaymentMethodService } from "./payment-method.service";
import { Category } from "../../domain/category/types/category.types";
import { PaymentMethod } from "../../domain/payment-method/types/payment-method.types";
import {
  AmiDetectedField,
  ParseIntentResponse,
} from "../dto/finance/parse-intent.dto";
import { AmiParseLogModel } from "../../infra/database/models/ami-parse-log.model";

const SYSTEM_PROMPT = `Eres AMI, un asistente de finanzas personales. El mensaje del usuario contiene las listas de categorías y métodos de pago disponibles, seguidas de la transacción a analizar. Extrae los campos indicados.
- amount: monto numérico (convierte "85k" → 85000, "50 mil" → 50000, "$1.200.000" → 1200000)
- description: texto corto y descriptivo. Para gastos: "Pago [comercio]" (ej. "Pago Éxito", "Pago Netflix"). Para ingresos: "Ingreso [fuente]" (ej. "Ingreso salario"). Para transferencias: "Transferencia [origen] → [destino]".
- dateExpression: expresión de fecha cruda tal como la dijo el usuario ("ayer", "hoy", "el viernes pasado")
- transactionType: "EXPENSE" si es un gasto o pago, "INCOME" si es un ingreso o cobro, "TRANSFER" si es una transferencia entre cuentas propias
- categoryId: elige el id exacto de la categoría más apropiada del listado provisto, deduciéndola del comercio o concepto aunque el usuario no la mencione explícitamente. Guía de inferencia (contexto colombiano): "mercado/supermercado/Éxito/Jumbo/D1/Ara/Carulla" → alimentación/comida; "Netflix/Spotify/Disney/streaming/cine/juegos" → entretenimiento/suscripciones; "gasolina/Uber/taxi/bus/peaje" → transporte; "restaurante/almuerzo/comida/domicilio" → alimentación/comida; "gym/médico/farmacia/droguería" → salud; "arriendo/administración/servicios públicos/luz/agua/gas" → vivienda/servicios; "colegio/universidad/curso" → educación. Prioriza siempre la categoría cuyo nombre refleje el gasto real. Retorna null solo si ninguna categoría encaja.
- paymentMethodId: elige el id exacto del método de pago del listado provisto que mejor coincida con lo mencionado. Retorna null si no se menciona o no hay coincidencia.
- isRecurring: true si menciona recurrencia ("cada mes", "mensual", "todos los meses", "es fijo")
- recurringFrequency: "WEEKLY", "MONTHLY", o "YEARLY"
- recurringPayDay: día del mes (1-31) si se menciona
- applyToBudget: true si menciona presupuesto
- budgetAmountInput: monto específico del presupuesto si se menciona aparte del monto principal
- transferSourceId: id del método de pago de origen en una transferencia
- transferDestinationId: id del método de pago de destino en una transferencia
Usa ÚNICAMENTE ids del listado provisto. Retorna null para campos imposibles de inferir.`;

/** CategoryType values as used in fa-contracts (lowercase) */
const TRANSACTION_TYPE_TO_CATEGORY_TYPE: Record<string, string> = {
  EXPENSE: "expense",
  INCOME: "income",
  TRANSFER: "transfer",
};

/** TTL for user entity caches: 30 minutes */
const CACHE_TTL_SECONDS = 1800;

/** Circuit breaker: open after this many consecutive failures */
const CIRCUIT_FAILURE_LIMIT = 5;

/** Circuit breaker: cooldown period in ms after opening */
const CIRCUIT_OPEN_DURATION_MS = 60_000;

// ---------------------------------------------------------------------------

interface RawAmiResponse {
  amount: number | null;
  description: string | null;
  dateExpression: string | null;
  transactionType: "EXPENSE" | "INCOME" | "TRANSFER" | null;
  categoryId: string | null;
  paymentMethodId: string | null;
  isRecurring: boolean | null;
  recurringFrequency: "WEEKLY" | "MONTHLY" | "YEARLY" | null;
  recurringPayDay: number | null;
  applyToBudget: boolean | null;
  budgetAmountInput: number | null;
  transferSourceId: string | null;
  transferDestinationId: string | null;
}

/**
 * Service for AMI (AI-powered transaction parsing).
 * Converts natural language Spanish text into structured transaction field hints
 * using an IAiParser, with Redis caching and an in-process circuit breaker.
 */
export class AmiService {
  // Circuit breaker state (in-process, resets on Lambda cold start)
  private failureCount = 0;
  private circuitOpenUntil: number | null = null;

  constructor(
    private readonly aiParser: IAiParser,
    private readonly categoryService: CategoryService,
    private readonly paymentMethodService: PaymentMethodService,
    private readonly cache: ICache,
  ) {}

  /**
   * Parses natural language input and returns structured transaction field hints.
   * Loads user entities from cache, calls OpenAI, fuzzy-matches hints, and
   * persists telemetry non-blocking.
   *
   * @param {string} userId Authenticated user's identifier.
   * @param {string} text Natural language input (Spanish).
   * @returns {Promise<ParseIntentResponse>} Structured parse result.
   */
  async parseIntent(
    userId: string,
    text: string,
  ): Promise<ParseIntentResponse> {
    const parseId = crypto.randomUUID();
    const startTime = Date.now();

    if (this.isCircuitOpen()) {
      return this.buildEmptyResponse(parseId);
    }

    // Load user entities concurrently, falling back to DB on cache miss
    const [categories, paymentMethods] = await Promise.all([
      this.getCachedCategories(userId),
      this.getCachedPaymentMethods(userId),
    ]);

    // Build context lists for OpenAI to pick IDs directly
    const categoryList = categories
      .map((c) => `  {"id":"${c.id}","nombre":"${c.name}","tipo":"${c.type}"}`)
      .join("\n");
    const pmList = paymentMethods
      .map((pm) => `  {"id":"${pm.id}","nombre":"${pm.name}"}`)
      .join("\n");
    const userMessage = `Categorías disponibles:\n${categoryList}\n\nMétodos de pago disponibles:\n${pmList}\n\nTransacción: ${text}`;

    // Valid payment method ID set for hallucination guard
    const validPmIds = new Set(paymentMethods.map((pm) => pm.id!));

    let rawResponse: RawAmiResponse | null = null;

    try {
      const content = await this.aiParser.parse(SYSTEM_PROMPT, userMessage);
      if (!content) {
        this.recordFailure();
        return this.buildEmptyResponse(parseId);
      }

      rawResponse = JSON.parse(content) as RawAmiResponse;
      this.recordSuccess();
    } catch {
      this.recordFailure();
      return this.buildEmptyResponse(parseId);
    }

    // Resolve date expression to ISO date string
    const resolvedDate = this.resolveDateExpression(rawResponse.dateExpression);

    // Build a map for fast category lookup (id → category object)
    const categoryById = new Map(categories.map((c) => [c.id!, c]));

    // Hallucination guard + type validation:
    // discard if ID doesn't exist OR if the category type doesn't match the transaction type
    const expectedCategoryType =
      TRANSACTION_TYPE_TO_CATEGORY_TYPE[
        rawResponse.transactionType ?? "EXPENSE"
      ];
    const candidateCategory = rawResponse.categoryId
      ? categoryById.get(rawResponse.categoryId)
      : undefined;
    const rawCategoryId =
      candidateCategory && candidateCategory.type === expectedCategoryType
        ? rawResponse.categoryId!
        : null;
    const rawPmId =
      rawResponse.paymentMethodId && validPmIds.has(rawResponse.paymentMethodId)
        ? rawResponse.paymentMethodId
        : null;
    const rawTransferSourceId =
      rawResponse.transferSourceId &&
      validPmIds.has(rawResponse.transferSourceId)
        ? rawResponse.transferSourceId
        : null;
    const rawTransferDestId =
      rawResponse.transferDestinationId &&
      validPmIds.has(rawResponse.transferDestinationId)
        ? rawResponse.transferDestinationId
        : null;

    // Build detected fields
    const isTransfer = rawResponse.transactionType === "TRANSFER";

    const categoryId: AmiDetectedField<string> =
      rawCategoryId && !isTransfer
        ? { value: rawCategoryId, confidence: "high", detected: true }
        : { value: null, confidence: null, detected: false };

    const paymentMethodId: AmiDetectedField<string> =
      rawPmId && !isTransfer
        ? { value: rawPmId, confidence: "high", detected: true }
        : { value: null, confidence: null, detected: false };

    const transferSourceId: AmiDetectedField<string> =
      rawTransferSourceId && isTransfer
        ? { value: rawTransferSourceId, confidence: "high", detected: true }
        : { value: null, confidence: null, detected: false };

    const transferDestinationId: AmiDetectedField<string> =
      rawTransferDestId && isTransfer
        ? { value: rawTransferDestId, confidence: "high", detected: true }
        : { value: null, confidence: null, detected: false };

    const result: ParseIntentResponse = {
      parseId,
      detectedFields: {
        amount: this.wrapScalar(rawResponse.amount),
        description: this.wrapScalar(rawResponse.description),
        date:
          resolvedDate !== null
            ? { value: resolvedDate, confidence: "high", detected: true }
            : rawResponse.dateExpression
              ? { value: null, confidence: "low", detected: true }
              : { value: null, confidence: null, detected: false },
        type: rawResponse.transactionType
          ? {
              value: rawResponse.transactionType,
              confidence: "high",
              detected: true,
            }
          : { value: null, confidence: null, detected: false },
        categoryId,
        paymentMethodId,
        isRecurring:
          rawResponse.isRecurring !== null
            ? {
                value: rawResponse.isRecurring,
                confidence: "high",
                detected: true,
              }
            : { value: null, confidence: null, detected: false },
        recurringFrequency: rawResponse.recurringFrequency
          ? {
              value: rawResponse.recurringFrequency,
              confidence: "high",
              detected: true,
            }
          : { value: null, confidence: null, detected: false },
        recurringPayDay:
          rawResponse.recurringPayDay !== null
            ? {
                value: rawResponse.recurringPayDay,
                confidence: "high",
                detected: true,
              }
            : { value: null, confidence: null, detected: false },
        applyToBudget:
          rawResponse.applyToBudget !== null
            ? {
                value: rawResponse.applyToBudget,
                confidence: "high",
                detected: true,
              }
            : { value: null, confidence: null, detected: false },
        budgetAmountInput: this.wrapScalar(rawResponse.budgetAmountInput),
        transferSourceId,
        transferDestinationId,
      },
    };

    // Non-blocking telemetry — never awaited
    AmiParseLogModel.create({
      parseId,
      userId,
      inputText: text,
      rawOpenAiResponse: rawResponse,
      detectedFields: result.detectedFields,
      durationMs: Date.now() - startTime,
      openAiTokensUsed: 0,
    }).catch(() => {});

    return result;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Returns categories from Redis cache. On miss, loads from DB and populates cache.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<Category[]>} User's categories.
   */
  private async getCachedCategories(userId: string): Promise<Category[]> {
    const key = cacheKeys.categories(userId);
    const cached = await this.cache.get<Category[]>(key);
    if (cached) return cached;

    const categories = await this.categoryService.findAll(userId);
    await this.cache.set(key, categories, CACHE_TTL_SECONDS);
    return categories;
  }

  /**
   * Returns payment methods from Redis cache. On miss, loads from DB and populates cache.
   *
   * @param {string} userId Owner identifier.
   * @returns {Promise<PaymentMethod[]>} User's payment methods.
   */
  private async getCachedPaymentMethods(
    userId: string,
  ): Promise<PaymentMethod[]> {
    const key = cacheKeys.paymentMethods(userId);
    const cached = await this.cache.get<PaymentMethod[]>(key);
    if (cached) return cached;

    const paymentMethods =
      await this.paymentMethodService.findAllByUser(userId);
    await this.cache.set(key, paymentMethods, CACHE_TTL_SECONDS);
    return paymentMethods;
  }

  /**
   * Resolves a natural language date expression to an ISO date string (YYYY-MM-DD).
   * Returns null for unrecognised expressions.
   *
   * @param {string | null} expr Raw date expression from OpenAI.
   * @returns {string | null} ISO date string or null.
   */
  private resolveDateExpression(expr: string | null): string | null {
    if (!expr) return null;
    const today = new Date();
    const lower = expr.toLowerCase().trim();

    if (lower === "hoy") return today.toISOString().split("T")[0];

    if (lower === "ayer") {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    }

    if (lower === "anteayer") {
      const d = new Date(today);
      d.setDate(d.getDate() - 2);
      return d.toISOString().split("T")[0];
    }

    const days: Record<string, number> = {
      lunes: 1,
      martes: 2,
      miércoles: 3,
      miercoles: 3,
      jueves: 4,
      viernes: 5,
      sábado: 6,
      sabado: 6,
      domingo: 0,
    };

    for (const [name, dayNum] of Object.entries(days)) {
      if (lower.includes(name)) {
        const d = new Date(today);
        const diff = (d.getDay() - dayNum + 7) % 7 || 7;
        d.setDate(d.getDate() - diff);
        return d.toISOString().split("T")[0];
      }
    }

    return null;
  }

  /**
   * Wraps a scalar value in a detected field envelope.
   *
   * @template T Scalar type.
   * @param {T | null} value Value from OpenAI response.
   * @returns {AmiDetectedField<T>} Detected field.
   */
  private wrapScalar<T>(value: T | null): AmiDetectedField<T> {
    if (value === null || value === undefined) {
      return { value: null, confidence: null, detected: false };
    }
    return { value, confidence: "high", detected: true };
  }

  /**
   * Builds an empty parse response with all fields undetected.
   * Returned when OpenAI is unavailable or the circuit breaker is open.
   *
   * @param {string} parseId Unique parse identifier.
   * @returns {ParseIntentResponse} Empty response.
   */
  private buildEmptyResponse(parseId: string): ParseIntentResponse {
    const empty: AmiDetectedField<never> = {
      value: null,
      confidence: null,
      detected: false,
    };
    return {
      parseId,
      detectedFields: {
        amount: empty,
        description: empty,
        date: empty,
        type: empty,
        categoryId: empty,
        paymentMethodId: empty,
        isRecurring: empty,
        recurringFrequency: empty,
        recurringPayDay: empty,
        applyToBudget: empty,
        budgetAmountInput: empty,
        transferSourceId: empty,
        transferDestinationId: empty,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Circuit breaker
  // ---------------------------------------------------------------------------

  private isCircuitOpen(): boolean {
    if (!this.circuitOpenUntil) return false;
    if (Date.now() > this.circuitOpenUntil) {
      this.circuitOpenUntil = null;
      this.failureCount = 0;
      return false;
    }
    return true;
  }

  private recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= CIRCUIT_FAILURE_LIMIT) {
      this.circuitOpenUntil = Date.now() + CIRCUIT_OPEN_DURATION_MS;
    }
  }

  private recordSuccess(): void {
    this.failureCount = 0;
  }
}
