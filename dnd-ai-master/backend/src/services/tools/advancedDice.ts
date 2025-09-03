import { BaseTool, ToolDefinition } from './BaseTool.js';
import { DiceRollerService } from './diceRoller.js';

/**
 * Результат продвинутого броска кубика
 */
export interface AdvancedDiceResult {
  type: 'advantage' | 'disadvantage' | 'multiple' | 'exploding';
  dice: string;
  rolls: number[][];
  finalResult: number[];
  total: number;
  modifier: number;
  description?: string;
  playerName?: string;
  timestamp: string;
  breakdown: string;
  criticalType?: 'natural_20' | 'natural_1' | 'max_roll' | 'min_roll';
}

/**
 * Сервис для продвинутых бросков кубиков
 * Поддерживает преимущество, недостаток, взрывающиеся кубики и другие специальные броски
 */
export class AdvancedDiceService implements BaseTool {
  private diceRoller: DiceRollerService;

  constructor() {
    this.diceRoller = new DiceRollerService();
  }
  
  getName(): string {
    return 'advanced_dice';
  }

  getDescription(): string {
    return 'Продвинутые броски кубиков с преимуществом/недостатком';
  }

  /**
   * Парсит строку броска кубиков (используется тот же парсер что и в DiceRoller)
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
   */
  private rollSingleDie(sides: number): number {
    return Math.floor(Math.random() * sides) + 1;
  }

  /**
   * Бросок с преимуществом (бросает два раза, берет лучший)
   */
  rollWithAdvantage(data: {
    dice: string;
    description?: string;
    playerName?: string;
  }): AdvancedDiceResult {
    const { count, sides, modifier } = this.parseDiceString(data.dice);
    
    // Делаем два броска
    const firstRolls: number[] = [];
    const secondRolls: number[] = [];
    
    for (let i = 0; i < count; i++) {
      firstRolls.push(this.rollSingleDie(sides));
      secondRolls.push(this.rollSingleDie(sides));
    }
    
    const firstSum = firstRolls.reduce((sum, roll) => sum + roll, 0);
    const secondSum = secondRolls.reduce((sum, roll) => sum + roll, 0);
    
    // Выбираем лучший результат
    const betterRolls = firstSum >= secondSum ? firstRolls : secondRolls;
    const total = Math.max(firstSum, secondSum) + modifier;
    
    // Проверяем на критические результаты
    let criticalType: AdvancedDiceResult['criticalType'];
    if (sides === 20 && count === 1) {
      if (Math.max(...betterRolls) === 20) criticalType = 'natural_20';
      else if (Math.min(...betterRolls) === 1) criticalType = 'natural_1';
    }
    
    let breakdown = `Преимущество: ${count}d${sides}`;
    breakdown += ` [${firstRolls.join(', ')}] vs [${secondRolls.join(', ')}]`;
    breakdown += ` → лучший [${betterRolls.join(', ')}] = ${Math.max(firstSum, secondSum)}`;
    
    if (modifier !== 0) {
      breakdown += ` ${modifier >= 0 ? '+' : ''}${modifier} = ${total}`;
    }

    return {
      type: 'advantage',
      dice: data.dice,
      rolls: [firstRolls, secondRolls],
      finalResult: betterRolls,
      total,
      modifier,
      description: data.description,
      playerName: data.playerName,
      timestamp: new Date().toISOString(),
      breakdown,
      criticalType
    };
  }

  /**
   * Бросок с недостатком (бросает два раза, берет худший)
   */
  rollWithDisadvantage(data: {
    dice: string;
    description?: string;
    playerName?: string;
  }): AdvancedDiceResult {
    const { count, sides, modifier } = this.parseDiceString(data.dice);
    
    // Делаем два броска
    const firstRolls: number[] = [];
    const secondRolls: number[] = [];
    
    for (let i = 0; i < count; i++) {
      firstRolls.push(this.rollSingleDie(sides));
      secondRolls.push(this.rollSingleDie(sides));
    }
    
    const firstSum = firstRolls.reduce((sum, roll) => sum + roll, 0);
    const secondSum = secondRolls.reduce((sum, roll) => sum + roll, 0);
    
    // Выбираем худший результат
    const worseRolls = firstSum <= secondSum ? firstRolls : secondRolls;
    const total = Math.min(firstSum, secondSum) + modifier;
    
    // Проверяем на критические результаты
    let criticalType: AdvancedDiceResult['criticalType'];
    if (sides === 20 && count === 1) {
      if (Math.max(...worseRolls) === 20) criticalType = 'natural_20';
      else if (Math.min(...worseRolls) === 1) criticalType = 'natural_1';
    }
    
    let breakdown = `Недостаток: ${count}d${sides}`;
    breakdown += ` [${firstRolls.join(', ')}] vs [${secondRolls.join(', ')}]`;
    breakdown += ` → худший [${worseRolls.join(', ')}] = ${Math.min(firstSum, secondSum)}`;
    
    if (modifier !== 0) {
      breakdown += ` ${modifier >= 0 ? '+' : ''}${modifier} = ${total}`;
    }

    return {
      type: 'disadvantage',
      dice: data.dice,
      rolls: [firstRolls, secondRolls],
      finalResult: worseRolls,
      total,
      modifier,
      description: data.description,
      playerName: data.playerName,
      timestamp: new Date().toISOString(),
      breakdown,
      criticalType
    };
  }

  /**
   * Множественные броски
   */
  rollMultiple(data: {
    dice: string;
    count: number;
    description?: string;
    playerName?: string;
  }): AdvancedDiceResult {
    const { count: diceCount, sides, modifier } = this.parseDiceString(data.dice);
    const rollCount = Math.min(data.count, 20); // Ограничиваем до 20 бросков
    
    const allRolls: number[][] = [];
    const allTotals: number[] = [];
    
    for (let i = 0; i < rollCount; i++) {
      const rolls: number[] = [];
      for (let j = 0; j < diceCount; j++) {
        rolls.push(this.rollSingleDie(sides));
      }
      const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
      allRolls.push(rolls);
      allTotals.push(rollSum + modifier);
    }
    
    const grandTotal = allTotals.reduce((sum, total) => sum + total, 0);
    
    let breakdown = `${rollCount} бросков ${data.dice}:\n`;
    allRolls.forEach((rolls, index) => {
      const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
      breakdown += `  ${index + 1}. [${rolls.join(', ')}] = ${rollSum}`;
      if (modifier !== 0) {
        breakdown += ` ${modifier >= 0 ? '+' : ''}${modifier} = ${allTotals[index]}`;
      }
      breakdown += '\n';
    });
    breakdown += `Общий итог: ${grandTotal}`;

    return {
      type: 'multiple',
      dice: data.dice,
      rolls: allRolls,
      finalResult: allTotals,
      total: grandTotal,
      modifier,
      description: data.description,
      playerName: data.playerName,
      timestamp: new Date().toISOString(),
      breakdown
    };
  }

  /**
   * Взрывающиеся кубики (при максимальном значении бросается еще раз)
   */
  rollExploding(data: {
    dice: string;
    description?: string;
    playerName?: string;
  }): AdvancedDiceResult {
    const { count, sides, modifier } = this.parseDiceString(data.dice);
    
    const allRolls: number[][] = [];
    let total = 0;
    
    for (let dieIndex = 0; dieIndex < count; dieIndex++) {
      const dieRolls: number[] = [];
      let currentRoll = this.rollSingleDie(sides);
      dieRolls.push(currentRoll);
      total += currentRoll;
      
      // Взрываем кубик если выпало максимальное значение
      while (currentRoll === sides && dieRolls.length < 10) { // Ограничиваем до 10 взрывов
        currentRoll = this.rollSingleDie(sides);
        dieRolls.push(currentRoll);
        total += currentRoll;
      }
      
      allRolls.push(dieRolls);
    }
    
    total += modifier;
    
    let breakdown = `Взрывающиеся ${count}d${sides}: `;
    allRolls.forEach((dieRolls, index) => {
      if (index > 0) breakdown += ' + ';
      breakdown += `[${dieRolls.join('!')}]`;
    });
    breakdown += ` = ${total - modifier}`;
    
    if (modifier !== 0) {
      breakdown += ` ${modifier >= 0 ? '+' : ''}${modifier} = ${total}`;
    }

    return {
      type: 'exploding',
      dice: data.dice,
      rolls: allRolls,
      finalResult: allRolls.map(rolls => rolls.reduce((sum, roll) => sum + roll, 0)),
      total,
      modifier,
      description: data.description,
      playerName: data.playerName,
      timestamp: new Date().toISOString(),
      breakdown
    };
  }

  validateArgs(args: any): boolean {
    if (!args.type || !args.dice) return false;
    
    if (args.type === 'multiple') {
      return !!(args.count && args.count > 0 && args.count <= 20);
    }
    
    return ['advantage', 'disadvantage', 'exploding'].includes(args.type);
  }

  getToolDefinition(): ToolDefinition {
    return {
      type: "function",
      function: {
        name: "advanced_dice",
        description: "Продвинутые броски кубиков с преимуществом, недостатком, взрывающимися кубиками и множественными бросками",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["advantage", "disadvantage", "multiple", "exploding"],
              description: "Тип броска: advantage - с преимуществом, disadvantage - с недостатком, multiple - множественные броски, exploding - взрывающиеся кубики"
            },
            dice: {
              type: "string",
              description: "Формула броска кубиков в формате XdY+Z",
              pattern: "^\\d+d\\d+(\\+\\d+|\\-\\d+)?$"
            },
            count: {
              type: "number",
              minimum: 1,
              maximum: 20,
              description: "Количество бросков (только для type=multiple)"
            },
            description: {
              type: "string",
              description: "Описание броска"
            },
            player_name: {
              type: "string",
              description: "Имя игрока"
            }
          },
          required: ["type", "dice"]
        }
      }
    };
  }

  handleToolCall(args: any): string {
    try {
      let result: AdvancedDiceResult;
      
      switch (args.type) {
        case 'advantage':
          result = this.rollWithAdvantage({
            dice: args.dice,
            description: args.description,
            playerName: args.player_name
          });
          break;
          
        case 'disadvantage':
          result = this.rollWithDisadvantage({
            dice: args.dice,
            description: args.description,
            playerName: args.player_name
          });
          break;
          
        case 'multiple':
          result = this.rollMultiple({
            dice: args.dice,
            count: args.count,
            description: args.description,
            playerName: args.player_name
          });
          break;
          
        case 'exploding':
          result = this.rollExploding({
            dice: args.dice,
            description: args.description,
            playerName: args.player_name
          });
          break;
          
        default:
          return `❌ Неизвестный тип броска: ${args.type}`;
      }
      
      // Форматируем ответ
      let response = '';
      
      if (result.playerName) {
        response += `${result.playerName} - `;
      }
      
      if (result.description) {
        response += `🎲 **${result.description}**: `;
      } else {
        response += `🎲 `;
      }
      
      // Добавляем эмодзи для критических результатов
      if (result.criticalType) {
        if (result.criticalType === 'natural_20') {
          response += `🎉 **КРИТИЧЕСКИЙ УСПЕХ!** `;
        } else if (result.criticalType === 'natural_1') {
          response += `💥 **Критический провал!** `;
        }
      }
      
      // Добавляем специальные эмодзи для типов бросков
      if (result.type === 'advantage') response += `⬆️ `;
      else if (result.type === 'disadvantage') response += `⬇️ `;
      else if (result.type === 'exploding') response += `💥 `;
      else if (result.type === 'multiple') response += `🎯 `;
      
      response += `**${result.breakdown}**`;
      
      return response;
      
    } catch (error) {
      return `❌ Ошибка при продвинутом броске кубиков: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }
}
