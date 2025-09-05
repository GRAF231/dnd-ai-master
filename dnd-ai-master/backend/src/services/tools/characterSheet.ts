import { BaseTool, ToolDefinition } from './BaseTool.js';
import { fileStorage } from './utils/FileStorage.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Интерфейс персонажа D&D 5e
 */
export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  
  // Характеристики
  abilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  
  // Вычисляемые характеристики
  hitPoints: {
    current: number;
    maximum: number;
    temporary: number;
  };
  
  armorClass: number;
  speed: number;
  proficiencyBonus: number;
  
  // Навыки и сохранения
  skills: Record<string, number>;
  savingThrows: Record<string, number>;
  
  // Игровая информация
  roomId: string;
  playerName: string;
  created: string;
  lastUpdated: string;
}

/**
 * Сервис для создания и управления персонажами D&D 5e
 */
export class CharacterSheetService implements BaseTool {
  
  getName(): string {
    return 'character_sheet';
  }

  getDescription(): string {
    return 'Создание и управление персонажами D&D 5e';
  }

  /**
   * Создает нового персонажа
   */
  createCharacter(data: {
    name: string;
    race: string;
    class: string;
    abilities: Character['abilities'];
    roomId: string;
    playerName: string;
    level?: number;
    background?: string;
  }): Character {
    const id = uuidv4();
    const level = data.level || 1;
    
    // Вычисляем модификаторы способностей
    const getModifier = (score: number) => Math.floor((score - 10) / 2);
    
    // Базовые характеристики для класса
    const classData = this.getClassData(data.class, level);
    const raceData = this.getRaceData(data.race);
    
    const character: Character = {
      id,
      name: data.name,
      race: data.race,
      class: data.class,
      level,
      background: data.background || 'Folk Hero',
      
      abilities: {
        strength: data.abilities.strength + (raceData.abilityBonus.strength || 0),
        dexterity: data.abilities.dexterity + (raceData.abilityBonus.dexterity || 0),
        constitution: data.abilities.constitution + (raceData.abilityBonus.constitution || 0),
        intelligence: data.abilities.intelligence + (raceData.abilityBonus.intelligence || 0),
        wisdom: data.abilities.wisdom + (raceData.abilityBonus.wisdom || 0),
        charisma: data.abilities.charisma + (raceData.abilityBonus.charisma || 0),
      },
      
      hitPoints: {
        current: classData.hitDie + getModifier(data.abilities.constitution + (raceData.abilityBonus.constitution || 0)),
        maximum: classData.hitDie + getModifier(data.abilities.constitution + (raceData.abilityBonus.constitution || 0)),
        temporary: 0
      },
      
      armorClass: 10 + getModifier(data.abilities.dexterity + (raceData.abilityBonus.dexterity || 0)),
      speed: raceData.speed,
      proficiencyBonus: Math.ceil(level / 4) + 1,
      
      skills: this.calculateSkills(data.abilities, classData.skillProficiencies),
      savingThrows: this.calculateSavingThrows(data.abilities, classData.savingThrowProficiencies),
      
      roomId: data.roomId,
      playerName: data.playerName,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    // Сохраняем персонажа
    fileStorage.appendToArray(`characters_${data.roomId}`, character);
    
    return character;
  }

  /**
   * Получает персонажа по ID
   */
  getCharacter(characterId: string, roomId: string): Character | null {
    const characters = fileStorage.load<Character[]>(`characters_${roomId}`) || [];
    return characters.find(char => char.id === characterId) || null;
  }

  /**
   * Получает всех персонажей в комнате
   */
  getCharactersInRoom(roomId: string): Character[] {
    return fileStorage.load<Character[]>(`characters_${roomId}`) || [];
  }

  /**
   * Находит персонажа по имени в комнате
   */
  findCharacterByName(name: string, roomId: string): Character | null {
    const characters = this.getCharactersInRoom(roomId);
    return characters.find(char => 
      char.name.toLowerCase() === name.toLowerCase()
    ) || null;
  }

  /**
   * Обновляет персонажа
   */
  updateCharacter(characterId: string, roomId: string, updates: Partial<Character>): boolean {
    const success = fileStorage.updateInArray<Character>(
      `characters_${roomId}`,
      char => char.id === characterId,
      { ...updates, lastUpdated: new Date().toISOString() }
    );
    return success;
  }

  /**
   * Получает данные класса
   */
  private getClassData(className: string, level: number) {
    const classes: Record<string, any> = {
      'fighter': {
        hitDie: 10,
        skillProficiencies: ['athletics', 'intimidation'],
        savingThrowProficiencies: ['strength', 'constitution']
      },
      'wizard': {
        hitDie: 6,
        skillProficiencies: ['arcana', 'investigation'],
        savingThrowProficiencies: ['intelligence', 'wisdom']
      },
      'rogue': {
        hitDie: 8,
        skillProficiencies: ['stealth', 'sleight_of_hand', 'perception', 'deception'],
        savingThrowProficiencies: ['dexterity', 'intelligence']
      },
      'cleric': {
        hitDie: 8,
        skillProficiencies: ['insight', 'religion'],
        savingThrowProficiencies: ['wisdom', 'charisma']
      }
    };
    
    return classes[className.toLowerCase()] || classes['fighter'];
  }

  /**
   * Получает данные расы
   */
  private getRaceData(raceName: string) {
    const races: Record<string, any> = {
      'human': {
        abilityBonus: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
        speed: 30
      },
      'elf': {
        abilityBonus: { dexterity: 2 },
        speed: 30
      },
      'dwarf': {
        abilityBonus: { constitution: 2 },
        speed: 25
      },
      'halfling': {
        abilityBonus: { dexterity: 2 },
        speed: 25
      }
    };
    
    return races[raceName.toLowerCase()] || races['human'];
  }

  /**
   * Вычисляет модификаторы навыков
   */
  private calculateSkills(abilities: Character['abilities'], proficiencies: string[]): Record<string, number> {
    const getModifier = (score: number) => Math.floor((score - 10) / 2);
    const proficiencyBonus = 2; // Для 1-го уровня
    
    const skillToAbility: Record<string, keyof Character['abilities']> = {
      'athletics': 'strength',
      'acrobatics': 'dexterity',
      'sleight_of_hand': 'dexterity',
      'stealth': 'dexterity',
      'arcana': 'intelligence',
      'history': 'intelligence',
      'investigation': 'intelligence',
      'nature': 'intelligence',
      'religion': 'intelligence',
      'animal_handling': 'wisdom',
      'insight': 'wisdom',
      'medicine': 'wisdom',
      'perception': 'wisdom',
      'survival': 'wisdom',
      'deception': 'charisma',
      'intimidation': 'charisma',
      'performance': 'charisma',
      'persuasion': 'charisma'
    };

    const skills: Record<string, number> = {};
    
    for (const [skill, ability] of Object.entries(skillToAbility)) {
      const baseModifier = getModifier(abilities[ability]);
      const isProficient = proficiencies.includes(skill);
      skills[skill] = baseModifier + (isProficient ? proficiencyBonus : 0);
    }
    
    return skills;
  }

  /**
   * Вычисляет модификаторы спасбросков
   */
  private calculateSavingThrows(abilities: Character['abilities'], proficiencies: string[]): Record<string, number> {
    const getModifier = (score: number) => Math.floor((score - 10) / 2);
    const proficiencyBonus = 2;
    
    const savingThrows: Record<string, number> = {};
    
    for (const [ability, score] of Object.entries(abilities)) {
      const baseModifier = getModifier(score);
      const isProficient = proficiencies.includes(ability);
      savingThrows[ability] = baseModifier + (isProficient ? proficiencyBonus : 0);
    }
    
    return savingThrows;
  }

  validateArgs(args: any): boolean {
    if (args.action === 'create') {
      return !!(args.name && args.race && args.class && args.abilities && args.room_id && args.player_name);
    }
    if (args.action === 'get') {
      return !!(args.character_id && args.room_id);
    }
    if (args.action === 'find') {
      return !!(args.name && args.room_id);
    }
    if (args.action === 'list') {
      return !!args.room_id;
    }
    if (args.action === 'update') {
      return !!(args.character_id && args.room_id && args.updates);
    }
    return false;
  }

  getToolDefinition(): ToolDefinition {
    return {
      name: "character_sheet",
      description: "Создание и управление персонажами D&D 5e. Поддерживает создание, получение и обновление персонажей. Используй 'find' для поиска персонажа по имени, затем 'get' с полученным ID для детальной информации.",
      input_schema: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["create", "get", "find", "list", "update"],
            description: "Действие: create - создать персонажа, get - получить персонажа по ID, find - найти персонажа по имени, list - список персонажей, update - обновить персонажа"
          },
          name: {
            type: "string",
            description: "Имя персонажа (для создания)"
          },
          race: {
            type: "string",
            enum: ["human", "elf", "dwarf", "halfling"],
            description: "Раса персонажа"
          },
          class: {
            type: "string", 
            enum: ["fighter", "wizard", "rogue", "cleric"],
            description: "Класс персонажа"
          },
          abilities: {
            type: "object",
            properties: {
              strength: { type: "number", minimum: 3, maximum: 18 },
              dexterity: { type: "number", minimum: 3, maximum: 18 },
              constitution: { type: "number", minimum: 3, maximum: 18 },
              intelligence: { type: "number", minimum: 3, maximum: 18 },
              wisdom: { type: "number", minimum: 3, maximum: 18 },
              charisma: { type: "number", minimum: 3, maximum: 18 }
            },
            description: "Характеристики персонажа (от 3 до 18)"
          },
          character_id: {
            type: "string",
            description: "ID персонажа (для получения или обновления)"
          },
          room_id: {
            type: "string",
            description: "ID комнаты"
          },
          player_name: {
            type: "string",
            description: "Имя игрока"
          },
          updates: {
            type: "object",
            description: "Объект с обновлениями персонажа"
          }
        },
        required: ["action", "room_id"]
      }
    };
  }

  handleToolCall(args: any): string {
    try {
      switch (args.action) {
        case 'create': {
          const character = this.createCharacter({
            name: args.name,
            race: args.race,
            class: args.class,
            abilities: args.abilities,
            roomId: args.room_id,
            playerName: args.player_name,
            level: args.level,
            background: args.background
          });
          
          return `✨ **Персонаж создан!**\n` +
                 `👤 **${character.name}** (${character.race} ${character.class})\n` +
                 `❤️ HP: ${character.hitPoints.maximum} | 🛡️ AC: ${character.armorClass} | 🏃 Speed: ${character.speed}\n` +
                 `💪 STR: ${character.abilities.strength} | 🤸 DEX: ${character.abilities.dexterity} | 🛡️ CON: ${character.abilities.constitution}\n` +
                 `🧠 INT: ${character.abilities.intelligence} | 🦉 WIS: ${character.abilities.wisdom} | ✨ CHA: ${character.abilities.charisma}\n` +
                 `🆔 ID: ${character.id}`;
        }
        
        case 'get': {
          const character = this.getCharacter(args.character_id, args.room_id);
          if (!character) {
            return `❌ Персонаж с ID ${args.character_id} не найден`;
          }
          
          return `👤 **${character.name}** (${character.race} ${character.class}, уровень ${character.level})\n` +
                 `❤️ HP: ${character.hitPoints.current}/${character.hitPoints.maximum} | 🛡️ AC: ${character.armorClass}\n` +
                 `💪 STR: ${character.abilities.strength} | 🤸 DEX: ${character.abilities.dexterity} | 🛡️ CON: ${character.abilities.constitution}\n` +
                 `🧠 INT: ${character.abilities.intelligence} | 🦉 WIS: ${character.abilities.wisdom} | ✨ CHA: ${character.abilities.charisma}\n` +
                 `👨‍💼 Игрок: ${character.playerName}`;
        }

        case 'find': {
          const character = this.findCharacterByName(args.name, args.room_id);
          if (!character) {
            return `❌ Персонаж с именем "${args.name}" не найден в комнате`;
          }
          
          return `✅ **Найден персонаж:** ${character.name}\n` +
                 `🆔 ID: ${character.id}\n` +
                 `👤 ${character.race} ${character.class} ${character.level} уровень\n` +
                 `👨‍💼 Игрок: ${character.playerName}\n` +
                 `💡 Для детальной информации используй: get с character_id "${character.id}"`;
        }
        
        case 'list': {
          const characters = this.getCharactersInRoom(args.room_id);
          if (characters.length === 0) {
            return `📋 В комнате пока нет созданных персонажей`;
          }
          
          let result = `📋 **Персонажи в комнате:**\n`;
          characters.forEach(char => {
            result += `👤 **${char.name}** (${char.race} ${char.class}) - ${char.playerName}\n`;
          });
          return result;
        }
        
        case 'update': {
          const success = this.updateCharacter(args.character_id, args.room_id, args.updates);
          if (!success) {
            return `❌ Не удалось обновить персонажа с ID ${args.character_id}`;
          }
          return `✅ Персонаж успешно обновлен`;
        }
        
        default:
          return `❌ Неизвестное действие: ${args.action}`;
      }
    } catch (error) {
      return `❌ Ошибка работы с персонажем: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }
}
