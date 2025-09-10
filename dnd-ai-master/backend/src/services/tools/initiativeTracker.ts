import { BaseTool, ToolDefinition } from './BaseTool.js';
import { fileStorage } from './utils/FileStorage.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Интерфейс участника боя
 */
export interface Combatant {
  id: string;
  name: string;
  initiative: number;
  hitPoints: {
    current: number;
    maximum: number;
  };
  armorClass: number;
  type: 'player' | 'npc' | 'monster';
  conditions: string[];
  playerName?: string; // Для персонажей игроков
  notes: string;
}

/**
 * Интерфейс боевого раунда
 */
export interface CombatRound {
  number: number;
  currentTurn: number; // Индекс в списке участников
  combatants: Combatant[];
  startTime: string;
  endTime?: string;
}

/**
 * Интерфейс активного боя
 */
export interface Combat {
  id: string;
  roomId: string;
  isActive: boolean;
  currentRound: CombatRound;
  rounds: CombatRound[];
  created: string;
  ended?: string;
}

/**
 * Сервис для управления боевой инициативой
 * Отслеживает очередность ходов, здоровье участников и состояния
 */
export class InitiativeTrackerService implements BaseTool {
  
  getName(): string {
    return 'initiative_tracker';
  }

  getDescription(): string {
    return 'Трекер инициативы для боевых сцен';
  }

  /**
   * Начинает новый бой
   */
  startCombat(roomId: string): Combat {
    // Завершаем предыдущий бой если он активен
    this.endCombat(roomId);
    
    const combatId = uuidv4();
    const firstRound: CombatRound = {
      number: 1,
      currentTurn: 0,
      combatants: [],
      startTime: new Date().toISOString()
    };
    
    const combat: Combat = {
      id: combatId,
      roomId,
      isActive: true,
      currentRound: firstRound,
      rounds: [firstRound],
      created: new Date().toISOString()
    };
    
    fileStorage.save(`combat_${roomId}`, combat);
    return combat;
  }

  /**
   * Получает активный бой в комнате
   */
  getActiveCombat(roomId: string): Combat | null {
    const combat = fileStorage.load<Combat>(`combat_${roomId}`);
    return combat && combat.isActive ? combat : null;
  }

  /**
   * Добавляет участника в бой
   */
  addCombatant(roomId: string, combatant: Omit<Combatant, 'id'>): boolean {
    const combat = this.getActiveCombat(roomId);
    if (!combat) return false;
    
    const newCombatant: Combatant = {
      ...combatant,
      id: uuidv4()
    };
    
    combat.currentRound.combatants.push(newCombatant);
    
    // Сортируем по инициативе (по убыванию)
    combat.currentRound.combatants.sort((a, b) => b.initiative - a.initiative);
    
    fileStorage.save(`combat_${roomId}`, combat);
    return true;
  }

  /**
   * Удаляет участника из боя
   */
  removeCombatant(roomId: string, combatantId: string): boolean {
    const combat = this.getActiveCombat(roomId);
    if (!combat) return false;
    
    const index = combat.currentRound.combatants.findIndex(c => c.id === combatantId);
    if (index === -1) return false;
    
    // Если удаляем участника до текущего хода, сдвигаем указатель
    if (index < combat.currentRound.currentTurn) {
      combat.currentRound.currentTurn--;
    }
    
    combat.currentRound.combatants.splice(index, 1);
    
    // Проверяем, не вышли ли мы за границы массива
    if (combat.currentRound.currentTurn >= combat.currentRound.combatants.length) {
      combat.currentRound.currentTurn = 0;
    }
    
    fileStorage.save(`combat_${roomId}`, combat);
    return true;
  }

  /**
   * Переход к следующему ходу
   */
  nextTurn(roomId: string): { currentCombatant: Combatant | null; newRound: boolean } {
    const combat = this.getActiveCombat(roomId);
    if (!combat || combat.currentRound.combatants.length === 0) {
      return { currentCombatant: null, newRound: false };
    }
    
    combat.currentRound.currentTurn++;
    let newRound = false;
    
    // Если дошли до конца списка, начинаем новый раунд
    if (combat.currentRound.currentTurn >= combat.currentRound.combatants.length) {
      newRound = true;
      combat.currentRound.currentTurn = 0;
      combat.currentRound.endTime = new Date().toISOString();
      
      // Создаем новый раунд
      const nextRound: CombatRound = {
        number: combat.currentRound.number + 1,
        currentTurn: 0,
        combatants: [...combat.currentRound.combatants], // Копируем участников
        startTime: new Date().toISOString()
      };
      
      combat.rounds.push(nextRound);
      combat.currentRound = nextRound;
    }
    
    const currentCombatant = combat.currentRound.combatants[combat.currentRound.currentTurn];
    
    fileStorage.save(`combat_${roomId}`, combat);
    return { currentCombatant, newRound };
  }

  /**
   * Обновляет здоровье участника
   */
  updateCombatantHP(roomId: string, combatantId: string, newHP: number): boolean {
    const combat = this.getActiveCombat(roomId);
    if (!combat) return false;
    
    const combatant = combat.currentRound.combatants.find(c => c.id === combatantId);
    if (!combatant) return false;
    
    combatant.hitPoints.current = Math.max(0, Math.min(newHP, combatant.hitPoints.maximum));
    
    fileStorage.save(`combat_${roomId}`, combat);
    return true;
  }

  /**
   * Добавляет или удаляет состояние участника
   */
  updateCombatantCondition(roomId: string, combatantId: string, condition: string, add: boolean): boolean {
    const combat = this.getActiveCombat(roomId);
    if (!combat) return false;
    
    const combatant = combat.currentRound.combatants.find(c => c.id === combatantId);
    if (!combatant) return false;
    
    if (add) {
      if (!combatant.conditions.includes(condition)) {
        combatant.conditions.push(condition);
      }
    } else {
      const index = combatant.conditions.indexOf(condition);
      if (index > -1) {
        combatant.conditions.splice(index, 1);
      }
    }
    
    fileStorage.save(`combat_${roomId}`, combat);
    return true;
  }

  /**
   * Завершает бой
   */
  endCombat(roomId: string): boolean {
    const combat = this.getActiveCombat(roomId);
    if (!combat) return false;
    
    combat.isActive = false;
    combat.ended = new Date().toISOString();
    combat.currentRound.endTime = new Date().toISOString();
    
    fileStorage.save(`combat_${roomId}`, combat);
    return true;
  }

  /**
   * Получает статус боя
   */
  getCombatStatus(roomId: string): string {
    const combat = this.getActiveCombat(roomId);
    if (!combat) return 'Бой не активен';
    
    if (combat.currentRound.combatants.length === 0) {
      return 'Бой начат, но участники не добавлены';
    }
    
    const currentCombatant = combat.currentRound.combatants[combat.currentRound.currentTurn];
    let status = `⚔️ **Раунд ${combat.currentRound.number}**\n`;
    status += `🎯 **Ход:** ${currentCombatant.name}\n\n`;
    
    status += '👥 **Участники:**\n';
    combat.currentRound.combatants.forEach((combatant, index) => {
      const isCurrent = index === combat.currentRound.currentTurn;
      const marker = isCurrent ? '→ ' : '   ';
      const hp = `${combatant.hitPoints.current}/${combatant.hitPoints.maximum}`;
      const conditions = combatant.conditions.length > 0 ? ` [${combatant.conditions.join(', ')}]` : '';
      
      status += `${marker}**${combatant.name}** (${combatant.initiative}) | ❤️ ${hp} | 🛡️ AC ${combatant.armorClass}${conditions}\n`;
    });
    
    return status;
  }

  validateArgs(args: any): boolean {
    if (!args.action || !args.room_id) return false;
    
    if (args.action === 'add_combatant') {
      return !!(args.name && typeof args.initiative === 'number' && args.hp_max && args.ac);
    }
    if (args.action === 'remove_combatant' || args.action === 'update_hp') {
      return !!args.combatant_id;
    }
    if (args.action === 'update_condition') {
      return !!(args.combatant_id && args.condition && typeof args.add === 'boolean');
    }
    
    return true; // Для действий без дополнительных параметров
  }

  getToolDefinition(): ToolDefinition {
    return {
      name: "initiative_tracker",
      description: "Управление боевой инициативой и участниками боя",
      input_schema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["start_combat", "end_combat", "add_combatant", "remove_combatant", "next_turn", "update_hp", "update_condition", "get_status"],
            description: "Действие с трекером инициативы"
          },
          room_id: {
            type: "string",
            description: "ID комнаты"
          },
          name: {
            type: "string",
            description: "Имя участника боя (для добавления)"
          },
          initiative: {
            type: "number",
            minimum: 1,
            maximum: 30,
            description: "Значение инициативы"
          },
          hp_current: {
            type: "number",
            minimum: 0,
            description: "Текущие хиты"
          },
          hp_max: {
            type: "number",
            minimum: 1,
            description: "Максимальные хиты"
          },
          ac: {
            type: "number",
            minimum: 1,
            maximum: 30,
            description: "Класс брони"
          },
          type: {
            type: "string",
            enum: ["player", "npc", "monster"],
            description: "Тип участника"
          },
          player_name: {
            type: "string",
            description: "Имя игрока (для персонажей игроков)"
          },
          combatant_id: {
            type: "string",
            description: "ID участника боя"
          },
          condition: {
            type: "string",
            description: "Название состояния"
          },
          add: {
            type: "boolean",
            description: "true - добавить состояние, false - убрать"
          },
          notes: {
            type: "string",
            description: "Заметки об участнике"
          }
        },
        required: ["action", "room_id"]
      }
    };
  }

  handleToolCall(args: any): string {
    try {
      switch (args.action) {
        case 'start_combat': {
          const combat = this.startCombat(args.room_id);
          return `⚔️ **Бой начат!**\n` +
                 `🆔 ID боя: ${combat.id}\n` +
                 `Добавьте участников с помощью action "add_combatant"`;
        }
        
        case 'end_combat': {
          const success = this.endCombat(args.room_id);
          if (!success) {
            return `❌ Нет активного боя для завершения`;
          }
          return `✅ **Бой завершен!**`;
        }
        
        case 'add_combatant': {
          const success = this.addCombatant(args.room_id, {
            name: args.name,
            initiative: args.initiative,
            hitPoints: {
              current: args.hp_current || args.hp_max,
              maximum: args.hp_max
            },
            armorClass: args.ac,
            type: args.type || 'npc',
            conditions: [],
            playerName: args.player_name,
            notes: args.notes || ''
          });
          
          if (!success) {
            return `❌ Не удалось добавить участника. Возможно, бой не активен.`;
          }
          
          return `✅ **${args.name}** добавлен в бой с инициативой ${args.initiative}`;
        }
        
        case 'remove_combatant': {
          const success = this.removeCombatant(args.room_id, args.combatant_id);
          if (!success) {
            return `❌ Не удалось удалить участника с ID ${args.combatant_id}`;
          }
          return `✅ Участник удален из боя`;
        }
        
        case 'next_turn': {
          const result = this.nextTurn(args.room_id);
          if (!result.currentCombatant) {
            return `❌ Нет активного боя или участников`;
          }
          
          let response = '';
          if (result.newRound) {
            response += `🔄 **Новый раунд!**\n`;
          }
          response += `🎯 **Ход:** ${result.currentCombatant.name}`;
          
          if (result.currentCombatant.conditions.length > 0) {
            response += ` [${result.currentCombatant.conditions.join(', ')}]`;
          }
          
          return response;
        }
        
        case 'update_hp': {
          const success = this.updateCombatantHP(args.room_id, args.combatant_id, args.hp_current);
          if (!success) {
            return `❌ Не удалось обновить здоровье участника`;
          }
          return `✅ Здоровье обновлено: ${args.hp_current} HP`;
        }
        
        case 'update_condition': {
          const success = this.updateCombatantCondition(args.room_id, args.combatant_id, args.condition, args.add);
          if (!success) {
            return `❌ Не удалось обновить состояние участника`;
          }
          
          const action = args.add ? 'добавлено' : 'убрано';
          return `✅ Состояние "${args.condition}" ${action}`;
        }
        
        case 'get_status': {
          return this.getCombatStatus(args.room_id);
        }
        
        default:
          return `❌ Неизвестное действие: ${args.action}`;
      }
    } catch (error) {
      return `❌ Ошибка трекера инициативы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }
}
