export interface IAiParser {
  parse(systemPrompt: string, userMessage: string): Promise<string | null>;
}
