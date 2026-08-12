import OpenAI from 'openai';
import { IAiParser } from '../../domain/ai/services/ai-parser.interface';

const AMI_JSON_SCHEMA = {
  type: 'object',
  properties: {
    amount: { type: ['number', 'null'] },
    description: { type: ['string', 'null'] },
    dateExpression: { type: ['string', 'null'] },
    transactionType: {
      type: ['string', 'null'],
      enum: ['EXPENSE', 'INCOME', 'TRANSFER', null],
    },
    categoryId: { type: ['string', 'null'] },
    paymentMethodId: { type: ['string', 'null'] },
    isRecurring: { type: ['boolean', 'null'] },
    recurringFrequency: {
      type: ['string', 'null'],
      enum: ['WEEKLY', 'MONTHLY', 'YEARLY', null],
    },
    recurringPayDay: { type: ['integer', 'null'], minimum: 1, maximum: 31 },
    applyToBudget: { type: ['boolean', 'null'] },
    budgetAmountInput: { type: ['number', 'null'] },
    transferSourceId: { type: ['string', 'null'] },
    transferDestinationId: { type: ['string', 'null'] },
  },
  required: [
    'amount',
    'description',
    'dateExpression',
    'transactionType',
    'categoryId',
    'paymentMethodId',
    'isRecurring',
    'recurringFrequency',
    'recurringPayDay',
    'applyToBudget',
    'budgetAmountInput',
    'transferSourceId',
    'transferDestinationId',
  ],
  additionalProperties: false,
} as const;

export class OpenAiParserService implements IAiParser {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async parse(systemPrompt: string, userMessage: string): Promise<string | null> {
    const completion = await this.openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        max_tokens: 400,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'transaction_intent',
            strict: true,
            schema: AMI_JSON_SCHEMA,
          },
        },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      },
      { signal: AbortSignal.timeout(5000) },
    );

    return completion.choices[0]?.message?.content ?? null;
  }
}
