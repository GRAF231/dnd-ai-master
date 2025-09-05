import { BaseTool, ToolDefinition } from './BaseTool.js';

/**
 * Интерфейс для информации о заклинании
 */
export interface SpellInfo {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  description: string;
  classes: string[];
}

/**
 * Интерфейс для информации о состоянии
 */
export interface ConditionInfo {
  name: string;
  description: string;
  effects: string[];
  exampleSources: string[];
}

/**
 * Интерфейс для информации о действии
 */
export interface ActionInfo {
  name: string;
  type: 'action' | 'bonus_action' | 'reaction' | 'free_action';
  description: string;
  requirements: string[];
  examples: string[];
}

/**
 * Сервис справочной информации по правилам D&D 5e
 * Предоставляет быстрый доступ к заклинаниям, состояниям и действиям
 */
export class RulesReferenceService implements BaseTool {
  
  getName(): string {
    return 'rules_reference';
  }

  getDescription(): string {
    return 'Справочная информация по правилам D&D 5e';
  }

  /**
   * База данных заклинаний (базовые заклинания для примера)
   */
  private spellsDatabase: SpellInfo[] = [
    {
      name: "Magic Missile",
      level: 1,
      school: "Evocation",
      castingTime: "1 action",
      range: "120 feet",
      components: "V, S",
      duration: "Instantaneous",
      description: "Создаете три светящиеся стрелы магической силы. Каждая стрела автоматически попадает в существо по вашему выбору в пределах дистанции и наносит 1d4+1 урон силой.",
      classes: ["Wizard", "Sorcerer"]
    },
    {
      name: "Healing Word",
      level: 1,
      school: "Evocation",
      castingTime: "1 bonus action",
      range: "60 feet",
      components: "V",
      duration: "Instantaneous", 
      description: "Существо по вашему выбору восстанавливает хиты в количестве 1d4 + модификатор заклинательной характеристики.",
      classes: ["Bard", "Cleric", "Druid"]
    },
    {
      name: "Fireball",
      level: 3,
      school: "Evocation",
      castingTime: "1 action",
      range: "150 feet",
      components: "V, S, M",
      duration: "Instantaneous",
      description: "Яркая вспышка огня вырывается из вашего указательного пальца к точке в пределах дистанции и взрывается огненным шаром. Каждое существо в сфере радиусом 20 футов делает спасбросок Ловкости. При провале получает 8d6 урона огнем, при успехе - половину.",
      classes: ["Wizard", "Sorcerer"]
    },
    {
      name: "Cure Wounds",
      level: 1,
      school: "Evocation",
      castingTime: "1 action",
      range: "Touch",
      components: "V, S",
      duration: "Instantaneous",
      description: "Существо, которого вы касаетесь, восстанавливает количество хитов равное 1d8 + модификатор заклинательной характеристики.",
      classes: ["Bard", "Cleric", "Druid", "Paladin", "Ranger"]
    }
  ];

  /**
   * База данных состояний
   */
  private conditionsDatabase: ConditionInfo[] = [
    {
      name: "Blinded",
      description: "Ослепленное существо не может видеть и автоматически проваливает проверки характеристик, требующие зрения.",
      effects: [
        "Броски атаки имеют помеху",
        "Броски атаки против существа имеют преимущество"
      ],
      exampleSources: ["Заклинание Blindness/Deafness", "Мешок с песком в глаза"]
    },
    {
      name: "Charmed",
      description: "Очарованное существо не может атаковать очаровавшего и не может выбирать его целью для вредоносных способностей или магических эффектов.",
      effects: [
        "Очаровавший имеет преимущество на социальные взаимодействия с существом"
      ],
      exampleSources: ["Заклинание Charm Person", "Способности фей и демонов"]
    },
    {
      name: "Frightened",
      description: "Испуганное существо имеет помеху на проверки характеристик и броски атаки, пока источник страха остается в пределах видимости.",
      effects: [
        "Помеха на проверки характеристик и броски атаки",
        "Не может добровольно приблизиться к источнику страха"
      ],
      exampleSources: ["Заклинание Fear", "Способности драконов и нежити"]
    },
    {
      name: "Poisoned",
      description: "Отравленное существо имеет помеху на броски атаки и проверки характеристик.",
      effects: [
        "Помеха на броски атаки",
        "Помеха на проверки характеристик"
      ],
      exampleSources: ["Ядовитые клинки", "Заклинание Poison Spray", "Ядовитые существа"]
    },
    {
      name: "Prone",
      description: "Лежащее существо движется только ползком. Подъем стоит половину скорости.",
      effects: [
        "Помеха на броски атаки",
        "Атаки в ближнем бою против существа имеют преимущество",
        "Атаки дальнего боя против существа имеют помеху"
      ],
      exampleSources: ["Заклинание Sleep", "Толчок щитом", "Подножка"]
    }
  ];

  /**
   * База данных действий в бою
   */
  private actionsDatabase: ActionInfo[] = [
    {
      name: "Attack",
      type: "action",
      description: "Совершить атаку оружием или безоружную атаку",
      requirements: ["Оружие или возможность безоружной атаки"],
      examples: ["Атака мечом", "Выстрел из лука", "Удар кулаком"]
    },
    {
      name: "Cast a Spell",
      type: "action",
      description: "Сотворить заклинание с временем накладывания 1 действие",
      requirements: ["Знание заклинания", "Компоненты заклинания"],
      examples: ["Fireball", "Cure Wounds", "Magic Missile"]
    },
    {
      name: "Dash",
      type: "action", 
      description: "Получить дополнительное движение равное вашей скорости",
      requirements: [],
      examples: ["Убежать от врага", "Быстро добраться до союзника"]
    },
    {
      name: "Dodge",
      type: "action",
      description: "Сосредоточиться на уклонении. Броски атаки против вас имеют помеху до начала вашего следующего хода",
      requirements: [],
      examples: ["Защитная тактика", "Уклонение от множественных атак"]
    },
    {
      name: "Help",
      type: "action",
      description: "Помочь другому существу в задаче или отвлечь врага",
      requirements: ["Находиться в пределах 5 футов от цели"],
      examples: ["Дать преимущество на следующую атаку союзника", "Помочь в проверке характеристики"]
    },
    {
      name: "Hide",
      type: "action",
      description: "Попытаться спрятаться",
      requirements: ["Укрытие или маскировка"],
      examples: ["Спрятаться за колонной", "Слиться с толпой"]
    },
    {
      name: "Ready",
      type: "action",
      description: "Подготовить действие с триггером",
      requirements: ["Четко определенный триггер"],
      examples: ["Атаковать первого врага, который войдет в комнату", "Сотворить заклинание когда союзник отойдет"]
    },
    {
      name: "Search",
      type: "action",
      description: "Искать что-то",
      requirements: [],
      examples: ["Поиск скрытых дверей", "Поиск спрятавшихся врагов"]
    },
    {
      name: "Use an Object",
      type: "action",
      description: "Взаимодействовать с объектом",
      requirements: ["Объект в пределах досягаемости"],
      examples: ["Выпить зелье", "Зажечь факел", "Открыть дверь"]
    },
    {
      name: "Healing Word",
      type: "bonus_action",
      description: "Сотворить заклинание с временем накладывания бонусное действие",
      requirements: ["Знание заклинания бонусного действия"],
      examples: ["Healing Word", "Spiritual Weapon", "Bardic Inspiration"]
    },
    {
      name: "Two-Weapon Fighting",
      type: "bonus_action",
      description: "Атака второй легким оружием",
      requirements: ["Атака легким оружием основным действием", "Легкое оружие во второй руке"],
      examples: ["Атака кинжалом после атаки коротким мечом"]
    },
    {
      name: "Opportunity Attack",
      type: "reaction",
      description: "Атака когда враг покидает вашу досягаемость",
      requirements: ["Враг покинул досягаемость не с помощью Dash"],
      examples: ["Удар по убегающему гоблину"]
    }
  ];

  /**
   * Поиск заклинания по имени
   */
  getSpellInfo(spellName: string): SpellInfo | null {
    const normalizedName = spellName.toLowerCase().trim();
    return this.spellsDatabase.find(spell => 
      spell.name.toLowerCase().includes(normalizedName)
    ) || null;
  }

  /**
   * Поиск состояния по имени
   */
  getConditionInfo(conditionName: string): ConditionInfo | null {
    const normalizedName = conditionName.toLowerCase().trim();
    return this.conditionsDatabase.find(condition =>
      condition.name.toLowerCase().includes(normalizedName)
    ) || null;
  }

  /**
   * Поиск действия по имени
   */
  getActionInfo(actionName: string): ActionInfo | null {
    const normalizedName = actionName.toLowerCase().trim();
    return this.actionsDatabase.find(action =>
      action.name.toLowerCase().includes(normalizedName)
    ) || null;
  }

  /**
   * Общий поиск по правилам
   */
  searchRules(query: string): { spells: SpellInfo[]; conditions: ConditionInfo[]; actions: ActionInfo[]; } {
    const normalizedQuery = query.toLowerCase().trim();
    
    const spells = this.spellsDatabase.filter(spell =>
      spell.name.toLowerCase().includes(normalizedQuery) ||
      spell.description.toLowerCase().includes(normalizedQuery) ||
      spell.school.toLowerCase().includes(normalizedQuery)
    );

    const conditions = this.conditionsDatabase.filter(condition =>
      condition.name.toLowerCase().includes(normalizedQuery) ||
      condition.description.toLowerCase().includes(normalizedQuery) ||
      condition.effects.some(effect => effect.toLowerCase().includes(normalizedQuery))
    );

    const actions = this.actionsDatabase.filter(action =>
      action.name.toLowerCase().includes(normalizedQuery) ||
      action.description.toLowerCase().includes(normalizedQuery) ||
      action.examples.some(example => example.toLowerCase().includes(normalizedQuery))
    );

    return { spells, conditions, actions };
  }

  /**
   * Получить заклинания по уровню
   */
  getSpellsByLevel(level: number): SpellInfo[] {
    return this.spellsDatabase.filter(spell => spell.level === level);
  }

  /**
   * Получить заклинания по классу
   */
  getSpellsByClass(className: string): SpellInfo[] {
    const normalizedClass = className.toLowerCase();
    return this.spellsDatabase.filter(spell =>
      spell.classes.some(cls => cls.toLowerCase().includes(normalizedClass))
    );
  }

  validateArgs(args: any): boolean {
    if (args.type === 'spell') {
      return !!args.name;
    }
    if (args.type === 'condition') {
      return !!args.name;
    }
    if (args.type === 'action') {
      return !!args.name;
    }
    if (args.type === 'search') {
      return !!args.query;
    }
    if (args.type === 'spells_by_level') {
      return typeof args.level === 'number' && args.level >= 0 && args.level <= 9;
    }
    if (args.type === 'spells_by_class') {
      return !!args.class_name;
    }
    return false;
  }

  getToolDefinition(): ToolDefinition {
    return {

        name: "rules_reference",
        description: "Справочная информация по правилам D&D 5e: заклинания, состояния, действия в бою",
        input_schema: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["spell", "condition", "action", "search", "spells_by_level", "spells_by_class"],
              description: "Тип справки: spell - заклинание, condition - состояние, action - действие, search - поиск, spells_by_level - заклинания по уровню, spells_by_class - заклинания по классу"
            },
            name: {
              type: "string",
              description: "Название заклинания, состояния или действия"
            },
            query: {
              type: "string",
              description: "Поисковый запрос"
            },
            level: {
              type: "number",
              minimum: 0,
              maximum: 9,
              description: "Уровень заклинания (0-9)"
            },
            class_name: {
              type: "string",
              description: "Название класса для поиска заклинаний"
            }
          },
          required: ["type"]
        }
      };
  }

  handleToolCall(args: any): string {
    try {
      switch (args.type) {
        case 'spell': {
          const spell = this.getSpellInfo(args.name);
          if (!spell) {
            return `❌ Заклинание "${args.name}" не найдено в базе данных`;
          }
          
          return `📜 **${spell.name}** (${spell.level} уровень, ${spell.school})\n` +
                 `⏱️ **Время накладывания:** ${spell.castingTime}\n` +
                 `📏 **Дистанция:** ${spell.range}\n` +
                 `🔮 **Компоненты:** ${spell.components}\n` +
                 `⏳ **Длительность:** ${spell.duration}\n` +
                 `👥 **Классы:** ${spell.classes.join(', ')}\n\n` +
                 `📖 **Описание:** ${spell.description}`;
        }
        
        case 'condition': {
          const condition = this.getConditionInfo(args.name);
          if (!condition) {
            return `❌ Состояние "${args.name}" не найдено в базе данных`;
          }
          
          let result = `🎭 **${condition.name}**\n\n`;
          result += `📖 **Описание:** ${condition.description}\n\n`;
          result += `⚡ **Эффекты:**\n`;
          condition.effects.forEach(effect => {
            result += `  • ${effect}\n`;
          });
          result += `\n🎯 **Примеры источников:** ${condition.exampleSources.join(', ')}`;
          
          return result;
        }
        
        case 'action': {
          const action = this.getActionInfo(args.name);
          if (!action) {
            return `❌ Действие "${args.name}" не найдено в базе данных`;
          }
          
          const typeEmoji = {
            'action': '🎯',
            'bonus_action': '⚡',
            'reaction': '🔄',
            'free_action': '🆓'
          };
          
          let result = `${typeEmoji[action.type]} **${action.name}** (${action.type.replace('_', ' ')})\n\n`;
          result += `📖 **Описание:** ${action.description}\n\n`;
          
          if (action.requirements.length > 0) {
            result += `📋 **Требования:**\n`;
            action.requirements.forEach(req => {
              result += `  • ${req}\n`;
            });
            result += '\n';
          }
          
          result += `💡 **Примеры:**\n`;
          action.examples.forEach(example => {
            result += `  • ${example}\n`;
          });
          
          return result;
        }
        
        case 'search': {
          const results = this.searchRules(args.query);
          const totalFound = results.spells.length + results.conditions.length + results.actions.length;
          
          if (totalFound === 0) {
            return `🔍 По запросу "${args.query}" ничего не найдено`;
          }
          
          let result = `🔍 **Результаты поиска "${args.query}"** (найдено: ${totalFound})\n\n`;
          
          if (results.spells.length > 0) {
            result += `📜 **Заклинания (${results.spells.length}):**\n`;
            results.spells.slice(0, 5).forEach(spell => {
              result += `  • ${spell.name} (${spell.level} ур.)\n`;
            });
            if (results.spells.length > 5) {
              result += `  ... и еще ${results.spells.length - 5}\n`;
            }
            result += '\n';
          }
          
          if (results.conditions.length > 0) {
            result += `🎭 **Состояния (${results.conditions.length}):**\n`;
            results.conditions.forEach(condition => {
              result += `  • ${condition.name}\n`;
            });
            result += '\n';
          }
          
          if (results.actions.length > 0) {
            result += `⚔️ **Действия (${results.actions.length}):**\n`;
            results.actions.forEach(action => {
              result += `  • ${action.name} (${action.type.replace('_', ' ')})\n`;
            });
          }
          
          return result;
        }
        
        case 'spells_by_level': {
          const spells = this.getSpellsByLevel(args.level);
          if (spells.length === 0) {
            return `📜 Заклинаний ${args.level} уровня не найдено`;
          }
          
          let result = `📜 **Заклинания ${args.level} уровня (${spells.length}):**\n\n`;
          spells.forEach(spell => {
            result += `• **${spell.name}** (${spell.school}) - ${spell.classes.join(', ')}\n`;
            result += `  ${spell.description.substring(0, 100)}${spell.description.length > 100 ? '...' : ''}\n\n`;
          });
          
          return result;
        }
        
        case 'spells_by_class': {
          const spells = this.getSpellsByClass(args.class_name);
          if (spells.length === 0) {
            return `📜 Заклинания для класса "${args.class_name}" не найдены`;
          }
          
          let result = `📜 **Заклинания для ${args.class_name} (${spells.length}):**\n\n`;
          
          // Группируем по уровням
          const spellsByLevel: Record<number, SpellInfo[]> = {};
          spells.forEach(spell => {
            if (!spellsByLevel[spell.level]) {
              spellsByLevel[spell.level] = [];
            }
            spellsByLevel[spell.level].push(spell);
          });
          
          Object.keys(spellsByLevel).sort((a, b) => parseInt(a) - parseInt(b)).forEach(level => {
            result += `**${level} уровень:**\n`;
            spellsByLevel[parseInt(level)].forEach(spell => {
              result += `  • ${spell.name}\n`;
            });
            result += '\n';
          });
          
          return result;
        }
        
        default:
          return `❌ Неизвестный тип запроса: ${args.type}`;
      }
    } catch (error) {
      return `❌ Ошибка поиска в справочнике: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`;
    }
  }
}
