import { DiceRollerService, DiceRollToolDefinition } from './diceRoller.js';
import { CharacterSheetService } from './characterSheet.js';
import { NotesManagerService } from './notesManager.js';
import { AdvancedDiceService } from './advancedDice.js';
import { RulesReferenceService } from './rulesReference.js';
import { InitiativeTrackerService } from './initiativeTracker.js';
import { ToolDefinition } from './BaseTool.js';

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
  private characterSheet: CharacterSheetService;
  private notesManager: NotesManagerService;
  private advancedDice: AdvancedDiceService;
  private rulesReference: RulesReferenceService;
  private initiativeTracker: InitiativeTrackerService;

  constructor() {
    this.diceRoller = new DiceRollerService();
    this.characterSheet = new CharacterSheetService();
    this.notesManager = new NotesManagerService();
    this.advancedDice = new AdvancedDiceService();
    this.rulesReference = new RulesReferenceService();
    this.initiativeTracker = new InitiativeTrackerService();
  }

  /**
   * Возвращает все доступные инструменты для Anthropic Claude API
   */
  getAllTools(): ToolDefinition[] {
    return [
      this.diceRoller.getToolDefinition(),
      this.characterSheet.getToolDefinition(),
      this.notesManager.getToolDefinition(),
      this.advancedDice.getToolDefinition(),
      this.rulesReference.getToolDefinition(),
      this.initiativeTracker.getToolDefinition()
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
          
        case 'character_sheet':
          content = this.characterSheet.handleToolCall(toolCall.arguments);
          break;
          
        case 'notes_manager':
          content = this.notesManager.handleToolCall(toolCall.arguments);
          break;
          
        case 'advanced_dice':
          content = this.advancedDice.handleToolCall(toolCall.arguments);
          break;
          
        case 'rules_reference':
          content = this.rulesReference.handleToolCall(toolCall.arguments);
          break;
          
        case 'initiative_tracker':
          content = this.initiativeTracker.handleToolCall(toolCall.arguments);
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
    const supportedTools = [
      'roll_dice',
      'character_sheet',
      'notes_manager',
      'advanced_dice',
      'rules_reference',
      'initiative_tracker'
    ];
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
      },
      character_sheet: {
        name: 'character_sheet',
        description: 'Создание и управление персонажами D&D 5e',
        examples: [
          'Создать персонажа',
          'Получить информацию о персонаже',
          'Список всех персонажей в комнате'
        ]
      },
      notes_manager: {
        name: 'notes_manager',
        description: 'Сохранение и поиск игровых заметок',
        examples: [
          'Сохранить заметку о важном NPC',
          'Найти заметки по ключевому слову',
          'Получить все заметки по категории'
        ]
      },
      advanced_dice: {
        name: 'advanced_dice',
        description: 'Продвинутые броски кубиков',
        examples: [
          'Бросок с преимуществом',
          'Бросок с недостатком',
          'Взрывающиеся кубики',
          'Множественные броски'
        ]
      },
      rules_reference: {
        name: 'rules_reference',
        description: 'Справочная информация по правилам D&D 5e',
        examples: [
          'Информация о заклинании',
          'Описание состояния',
          'Поиск правил'
        ]
      },
      initiative_tracker: {
        name: 'initiative_tracker',
        description: 'Трекер инициативы для боевых сцен',
        examples: [
          'Начать бой',
          'Добавить участника',
          'Следующий ход',
          'Статус боя'
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
      { name: 'advanced_dice', arguments: { type: 'advantage', dice: '1d20+3', description: 'Атака с преимуществом' } },
      { name: 'character_sheet', arguments: { action: 'list', room_id: 'test_room' } },
      { name: 'notes_manager', arguments: { action: 'get_categories', room_id: 'test_room' } },
      { name: 'rules_reference', arguments: { type: 'spell', name: 'fireball' } },
      { name: 'initiative_tracker', arguments: { action: 'get_status', room_id: 'test_room' } },
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
