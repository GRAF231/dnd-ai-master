/**
 * Базовый интерфейс для всех инструментов D&D системы
 * Обеспечивает единый стандарт для создания и управления инструментами
 */
export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface BaseTool {
  /**
   * Возвращает определение инструмента для OpenRouter/OpenAI
   */
  getToolDefinition(): ToolDefinition;

  /**
   * Обрабатывает вызов инструмента от LLM
   * @param args Аргументы от LLM
   * @returns Результат выполнения в виде строки для LLM
   */
  handleToolCall(args: any): string;

  /**
   * Валидирует аргументы инструмента
   * @param args Аргументы для проверки
   * @returns true если аргументы корректны
   */
  validateArgs(args: any): boolean;

  /**
   * Возвращает имя инструмента
   */
  getName(): string;

  /**
   * Возвращает описание инструмента
   */
  getDescription(): string;
}

/**
 * Результат выполнения инструмента
 */
export interface ToolExecutionResult {
  success: boolean;
  content: string;
  data?: any; // Дополнительные данные для сохранения
  timestamp: string;
}
