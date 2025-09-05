export interface DiceRollRequest {
  dice: string; // Например: "1d20", "3d6+2", "2d8-1"
  description?: string; // Описание броска
  playerName?: string; // Имя игрока
}

export interface DiceRollResult {
  request: string;
  rolls: number[];
  modifier: number;
  total: number;
  description?: string;
  playerName?: string;
  timestamp: string;
  breakdown: string; // Детальная разбивка броска
}

export interface DiceRollToolDefinition {
  name: "roll_dice";
  description: "Бросает кубики для D&D. Поддерживает стандартную нотацию типа '1d20+5', '3d6-2', '2d8'";
  input_schema: {
    type: "object";
    properties: {
      dice: {
        type: "string";
        description: "Формула броска кубиков в формате XdY+Z, где X - количество кубиков, Y - тип кубика, Z - модификатор";
        pattern: "^\\d+d\\d+(\\+\\d+|\\-\\d+)?$";
      };
      description: {
        type: "string";
        description: "Описание броска (например: 'Атака мечом', 'Проверка Восприятия')";
      };
      player_name: {
        type: "string";
        description: "Имя игрока, совершающего бросок";
      };
    };
    required: ["dice"];
  };
}

export class DiceRollerService {
  /**
   * Парсит строку броска кубиков
   * @param diceString Строка типа "1d20+5"
   * @returns Объект с параметрами броска
   */
  private parseDiceString(diceString: string): { count: number; sides: number; modifier: number } {
    const regex = /^(\d+)d(\d+)([\+\-]\d+)?$/i;
    const match = diceString.match(regex);

    if (!match) {
      throw new Error(`Неверный формат кубиков: ${diceString}. Используйте формат XdY+Z (например: 1d20+5)`);
    }

    const count = parseInt(match[1]);
    const sides = parseInt(match[2]);
    const modifier = match[3] ? parseInt(match[3]) : 0;

    if (count <= 0 || count > 100) {
      throw new Error(`Количество кубиков должно быть от 1 до 100, получено: ${count}`);
    }

    if (sides <= 1 || sides > 1000) {
      throw new Error(`Количество граней должно быть от 2 до 1000, получено: ${sides}`);
    }

    return { count, sides, modifier };
  }

  /**
   * Бросает один кубик
   * @param sides Количество граней кубика
   * @returns Результат броска
   */
  private rollSingleDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  /**
   * Выполняет бросок кубиков
   * @param request Параметры броска
   * @returns Результат броска
   */
  rollDice(request: DiceRollRequest): DiceRollResult {
    try {
      const { count, sides, modifier } = this.parseDiceString(request.dice);

      // Выполняем броски
      const rolls: number[] = [];
      for (let i = 0; i < count; i++) {
        rolls.push(this.rollSingleDie(sides));
      }

      const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
      const total = rollSum + modifier;

      // Создаем детальную разбивку
      let breakdown = `${count}d${sides}`;
      if (rolls.length <= 10) {
        breakdown += ` [${rolls.join(', ')}] = ${rollSum}`;
      } else {
        breakdown += ` (${rollSum})`;
      }
      
      if (modifier !== 0) {
        breakdown += ` ${modifier >= 0 ? '+' : ''}${modifier} = ${total}`;
      } else {
        breakdown += ` (итого: ${total})`;
      }

      return {
        request: request.dice,
        rolls,
        modifier,
        total,
        description: request.description,
        playerName: request.playerName,
        timestamp: new Date().toISOString(),
        breakdown
      };
    } catch (error) {
      throw new Error(`Ошибка при броске кубиков: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }

  /**
   * Возвращает определение инструмента для Anthropic Claude API
   */
  getToolDefinition(): DiceRollToolDefinition {
    return {
      name: "roll_dice",
      description: "Бросает кубики для D&D. Поддерживает стандартную нотацию типа '1d20+5', '3d6-2', '2d8'",
      input_schema: {
        type: "object",
        properties: {
          dice: {
            type: "string",
            description: "Формула броска кубиков в формате XdY+Z, где X - количество кубиков, Y - тип кубика, Z - модификатор",
            pattern: "^\\d+d\\d+(\\+\\d+|\\-\\d+)?$"
          },
          description: {
            type: "string",
            description: "Описание броска (например: 'Атака мечом', 'Проверка Восприятия')"
          },
          player_name: {
            type: "string", 
            description: "Имя игрока, совершающего бросок"
          }
        },
        required: ["dice"]
      }
    };
  }

  /**
   * Обрабатывает вызов инструмента от LLM
   * @param args Аргументы от LLM
   * @returns Результат броска в виде строки для LLM
   */
  handleToolCall(args: any): string {
    try {
      const request: DiceRollRequest = {
        dice: args.dice,
        description: args.description,
        playerName: args.player_name
      };

      const result = this.rollDice(request);
      
      let response = `🎲 **${result.breakdown}**`;
      
      if (result.description) {
        response = `🎲 **${result.description}**: ${result.breakdown}`;
      }
      
      if (result.playerName) {
        response = `${result.playerName} - ` + response;
      }

      return response;
    } catch (error) {
      return `❌ Ошибка при броске кубиков: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }

  /**
   * Тестирует сервис с различными типами бросков
   */
  test(): void {
    console.log('🎲 Тестирование DiceRollerService...');
    
    const testCases = [
      '1d20',
      '1d20+5',
      '3d6',
      '2d8-1',
      '4d6'
    ];

    testCases.forEach(dice => {
      try {
        const result = this.rollDice({ dice, description: `Тест: ${dice}` });
        console.log(`✅ ${dice}: ${result.breakdown}`);
      } catch (error) {
        console.log(`❌ ${dice}: ${error instanceof Error ? error.message : 'Ошибка'}`);
      }
    });
  }
} 
