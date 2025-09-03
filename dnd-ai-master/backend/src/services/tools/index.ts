import { DiceRollerService, DiceRollToolDefinition } from './diceRoller.js';

export interface ToolResult {
  content: string;
  success: boolean;
  timestamp: string;
}

export interface ToolCallRequest {
  name: string;
  arguments: any;
}

export class ToolsService {
  private diceRoller: DiceRollerService;

  constructor() {
    this.diceRoller = new DiceRollerService();
  }

  /**
   * Возвращает все доступные инструменты для OpenRouter/OpenAI
   */
  getAllTools(): DiceRollToolDefinition[] {
    return [
      this.diceRoller.getToolDefinition()
    ];
  }

  /**
   * Выполняет вызов инструмента
   * @param toolCall Запрос на вызов инструмента
   * @returns Результат выполнения
   */
  executeToolCall(toolCall: ToolCallRequest): ToolResult {
    const timestamp = new Date().toISOString();

    try {
      let content: string;

      switch (toolCall.name) {
        case 'roll_dice':
          content = this.diceRoller.handleToolCall(toolCall.arguments);
          break;
          
        default:
          throw new Error(`Неизвестный инструмент: ${toolCall.name}`);
      }

      return {
        content,
        success: true,
        timestamp
      };
    } catch (error) {
      console.error(`Ошибка при выполнении инструмента ${toolCall.name}:`, error);
      return {
        content: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        success: false,
        timestamp
      };
    }
  }

  /**
   * Проверяет, поддерживается ли инструмент
   */
  isToolSupported(toolName: string): boolean {
    const supportedTools = ['roll_dice'];
    return supportedTools.includes(toolName);
  }

  /**
   * Возвращает информацию о всех доступных инструментах
   */
  getToolsInfo(): Record<string, any> {
    return {
      roll_dice: {
        name: 'roll_dice',
        description: 'Бросает кубики для D&D',
        examples: [
          '1d20 - обычный бросок d20',
          '1d20+5 - бросок d20 с модификатором +5',
          '3d6 - бросок трех шестигранных кубиков',
          '2d8-1 - бросок двух восьмигранных кубиков с модификатором -1'
        ]
      }
    };
  }

  /**
   * Тестирует все инструменты
   */
  testAllTools(): void {
    console.log('🔧 Тестирование всех инструментов...\n');
    
    // Тестируем DiceRoller
    this.diceRoller.test();
    
    // Тестируем вызовы через ToolsService
    console.log('\n🔧 Тестирование через ToolsService...');
    const testCalls = [
      { name: 'roll_dice', arguments: { dice: '1d20+5', description: 'Атака мечом', player_name: 'Алиса' } },
      { name: 'roll_dice', arguments: { dice: '3d6' } },
      { name: 'invalid_tool', arguments: {} }
    ];

    testCalls.forEach((call, index) => {
      const result = this.executeToolCall(call);
      console.log(`Test ${index + 1}: ${result.success ? '✅' : '❌'} ${result.content}`);
    });
  }
}

// Экспортируем сервис для использования
export const toolsService = new ToolsService();

// Экспортируем типы и классы
export { DiceRollerService } from './diceRoller.js';
export type { DiceRollRequest, DiceRollResult, DiceRollToolDefinition } from './diceRoller.js';
