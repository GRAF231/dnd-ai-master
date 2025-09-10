import { DatabaseService } from './DatabaseService.js';
import { 
  Entity, Fact, EntityType, 
  CreateEntityRequest, CreateFactRequest, 
  OperationResult 
} from './types.js';

/**
 * Сервис для управления игровыми сущностями и автоматического извлечения
 */
export class EntityService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // === CRUD ОПЕРАЦИИ ===

  /**
   * Создание сущности
   */
  async createEntity(request: CreateEntityRequest): Promise<OperationResult<Entity>> {
    return this.db.createEntity(request);
  }

  /**
   * Получение сущности по ID
   */
  async getEntity(entityId: string): Promise<Entity | undefined> {
    return this.db.getEntityById(entityId);
  }

  /**
   * Получение всех сущностей комнаты
   */
  async getEntitiesByRoom(roomId: string, type?: EntityType): Promise<Entity[]> {
    return this.db.getEntitiesByRoom(roomId, type);
  }

  /**
   * Поиск сущностей по имени
   */
  async findEntitiesByName(roomId: string, name: string, type?: EntityType): Promise<Entity[]> {
    const entities = await this.db.getEntitiesByRoom(roomId, type);
    
    return entities.filter(entity => 
      entity.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  /**
   * Обновление сущности
   */
  async updateEntity(entityId: string, updates: Partial<Entity>): Promise<OperationResult<Entity>> {
    try {
      const entity = await this.db.getEntityById(entityId);
      if (!entity) {
        return { success: false, error: 'Сущность не найдена' };
      }

      // Обновляем поля
      const updatedEntity = {
        ...entity,
        ...updates,
        id: entity.id, // ID не изменяется
        updated_at: new Date()
      };

      // Сохраняем обновления (здесь нужно добавить метод update в DatabaseService)
      // Пока что возвращаем как есть
      return { success: true, data: updatedEntity };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка обновления сущности: ${error instanceof Error ? error.message : error}` 
      };
    }
  }

  // === УПРАВЛЕНИЕ ФАКТАМИ ===

  /**
   * Добавление факта к сущности
   */
  async addFact(request: CreateFactRequest): Promise<OperationResult<Fact>> {
    return this.db.createFact(request);
  }

  /**
   * Получение фактов сущности
   */
  async getEntityFacts(entityId: string): Promise<Fact[]> {
    return this.db.getFactsByEntity(entityId);
  }

  /**
   * Обновление факта (изменение уверенности или значения)
   */
  async updateFact(entityId: string, key: string, newValue: string, confidence?: number): Promise<OperationResult<Fact>> {
    try {
      const facts = await this.db.getFactsByEntity(entityId);
      const existingFact = facts.find(f => f.key === key);

      if (existingFact) {
        // Обновляем существующий факт
        // Здесь нужно добавить метод updateFact в DatabaseService
        // Пока создаем новый факт с более высокой уверенностью
        return this.db.createFact({
          entity_id: entityId,
          key,
          value: newValue,
          confidence: confidence || Math.min(1.0, (existingFact.confidence || 0.5) + 0.1)
        });
      } else {
        // Создаем новый факт
        return this.db.createFact({
          entity_id: entityId,
          key,
          value: newValue,
          confidence: confidence || 0.8
        });
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка обновления факта: ${error instanceof Error ? error.message : error}` 
      };
    }
  }

  // === АВТОМАТИЧЕСКОЕ ИЗВЛЕЧЕНИЕ СУЩНОСТЕЙ ===

  /**
   * Извлечение сущностей из текста сообщения
   */
  async extractEntitiesFromText(roomId: string, text: string, sourceMessageId?: string): Promise<Entity[]> {
    const extractedEntities: Entity[] = [];

    try {
      // 1. Извлечение персонажей (имена собственные + ролевые термины)
      const characterMatches = this.extractCharacters(text);
      for (const match of characterMatches) {
        const entity = await this.findOrCreateEntity(roomId, 'character', match.name, match.description);
        if (entity) {
          extractedEntities.push(entity);
          
          // Добавляем факты о персонаже
          if (match.attributes.length > 0) {
            for (const attr of match.attributes) {
              await this.addFact({
                entity_id: entity.id,
                key: attr.key,
                value: attr.value,
                confidence: 0.7,
                source_message_id: sourceMessageId
              });
            }
          }
        }
      }

      // 2. Извлечение локаций
      const locationMatches = this.extractLocations(text);
      for (const match of locationMatches) {
        const entity = await this.findOrCreateEntity(roomId, 'location', match.name, match.description);
        if (entity) {
          extractedEntities.push(entity);
          
          // Добавляем факты о локации
          if (match.attributes.length > 0) {
            for (const attr of match.attributes) {
              await this.addFact({
                entity_id: entity.id,
                key: attr.key,
                value: attr.value,
                confidence: 0.7,
                source_message_id: sourceMessageId
              });
            }
          }
        }
      }

      // 3. Извлечение предметов
      const itemMatches = this.extractItems(text);
      for (const match of itemMatches) {
        const entity = await this.findOrCreateEntity(roomId, 'item', match.name, match.description);
        if (entity) {
          extractedEntities.push(entity);
        }
      }

      // 4. Извлечение NPC
      const npcMatches = this.extractNPCs(text);
      for (const match of npcMatches) {
        const entity = await this.findOrCreateEntity(roomId, 'npc', match.name, match.description);
        if (entity) {
          extractedEntities.push(entity);
        }
      }

      console.log(`🔍 Извлечено ${extractedEntities.length} сущностей из текста`);
      return extractedEntities;

    } catch (error) {
      console.error('Ошибка извлечения сущностей:', error);
      return [];
    }
  }

  /**
   * Поиск или создание сущности
   */
  private async findOrCreateEntity(
    roomId: string, 
    type: EntityType, 
    name: string, 
    description?: string
  ): Promise<Entity | null> {
    try {
      // Ищем существующую сущность
      const existing = await this.findEntitiesByName(roomId, name, type);
      if (existing.length > 0) {
        return existing[0]; // Возвращаем первую найденную
      }

      // Создаем новую сущность
      const result = await this.createEntity({
        room_id: roomId,
        type,
        name,
        description,
        data: {}
      });

      return result.success ? result.data || null : null;
    } catch (error) {
      console.error(`Ошибка создания сущности ${type}:${name}:`, error);
      return null;
    }
  }

  // === ПАТТЕРНЫ ИЗВЛЕЧЕНИЯ ===

  /**
   * Извлечение персонажей из текста
   */
  private extractCharacters(text: string): Array<{
    name: string;
    description?: string;
    attributes: Array<{key: string, value: string}>;
  }> {
    const characters: Array<{
      name: string;
      description?: string;
      attributes: Array<{key: string, value: string}>;
    }> = [];

    // Паттерны для поиска персонажей
    const patterns = [
      // "Меня зовут Алиса"
      /(?:меня зовут|я\s+(?:есть|это)?)\s+([А-ЯЁ][а-яё]+)/gi,
      // "персонаж Алиса"
      /персонаж[а-я\s]*([А-ЯЁ][а-яё]+)/gi,
      // "Алиса - эльф"
      /([А-ЯЁ][а-яё]+)\s*[-–—]\s*([а-яё\-]+)/gi,
      // "эльф по имени Алиса"
      /([а-яё\-]+)\s+по имени\s+([А-ЯЁ][а-яё]+)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1] || match[2];
        if (name && name.length > 1) {
          const attributes: Array<{key: string, value: string}> = [];
          
          // Ищем дополнительную информацию о персонаже
          if (match[2] && match[1] !== match[2]) {
            attributes.push({ key: 'тип', value: match[2] });
          }

          // Ищем расу/класс в окружающем тексте
          const raceMatch = text.match(new RegExp(`${name}[^.]*?(эльф|человек|дварф|полурослик|драконорожденный|тифлинг|гном)`, 'i'));
          if (raceMatch) {
            attributes.push({ key: 'раса', value: raceMatch[1] });
          }

          const classMatch = text.match(new RegExp(`${name}[^.]*?(воин|маг|следопыт|плут|клерик|варвар|бард|чародей|колдун|паладин|друид|монах)`, 'i'));
          if (classMatch) {
            attributes.push({ key: 'класс', value: classMatch[1] });
          }

          characters.push({
            name: name.trim(),
            description: `Персонаж ${name}`,
            attributes
          });
        }
      }
    }

    return characters;
  }

  /**
   * Извлечение локаций из текста
   */
  private extractLocations(text: string): Array<{
    name: string;
    description?: string;
    attributes: Array<{key: string, value: string}>;
  }> {
    const locations: Array<{
      name: string;
      description?: string;
      attributes: Array<{key: string, value: string}>;
    }> = [];

    // Паттерны для поиска локаций
    const patterns = [
      // "в таверне", "в лесу"
      /в\s+(таверне?|лесу|городе?|замке?|башне?|пещере?|храме?|доме?|комнате?|зале?)[^а-яё]*([А-ЯЁ][а-яё\s]*)?/gi,
      // "таверна Золотой дракон"
      /(таверна|лес|город|замок|башня|пещера|храм|дом)\s+[«"']?([А-ЯЁ][а-яё\s]+)[«"']?/gi,
      // "Золотой дракон" (в кавычках)
      /[«"']([А-ЯЁ][а-яё\s]{2,})[«"']/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const locationType = match[1]?.toLowerCase();
        const locationName = match[2] || match[1];
        
        if (locationName && locationName.length > 2) {
          const attributes: Array<{key: string, value: string}> = [];
          
          if (locationType && locationType !== locationName.toLowerCase()) {
            attributes.push({ key: 'тип', value: locationType });
          }

          // Ищем описательные элементы
          const atmosphereMatch = text.match(/(уютн|темн|светл|мрачн|таинственн|древн)/i);
          if (atmosphereMatch) {
            attributes.push({ key: 'атмосфера', value: atmosphereMatch[1] + 'ый' });
          }

          locations.push({
            name: locationName.trim(),
            description: `Локация: ${locationName}`,
            attributes
          });
        }
      }
    }

    return locations;
  }

  /**
   * Извлечение предметов из текста
   */
  private extractItems(text: string): Array<{
    name: string;
    description?: string;
  }> {
    const items: Array<{
      name: string;
      description?: string;
    }> = [];

    // Паттерны для поиска предметов
    const patterns = [
      // "меч", "щит", "зелье"
      /(меч|щит|лук|стрела|зелье|свиток|кольцо|амулет|посох|жезл|доспех|шлем|сапоги|плащ|кинжал|топор|молот)[а-яё]*/gi,
      // "волшебный меч"
      /(волшебн[а-яё]*|магическ[а-яё]*|древн[а-яё]*|золот[а-яё]*|серебрян[а-яё]*)\s+(меч|щит|лук|зелье|свиток|кольцо|амулет|посох|жезл)[а-яё]*/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const itemName = match[0].trim();
        if (itemName.length > 2) {
          items.push({
            name: itemName,
            description: `Предмет: ${itemName}`
          });
        }
      }
    }

    return items;
  }

  /**
   * Извлечение NPC из текста
   */
  private extractNPCs(text: string): Array<{
    name: string;
    description?: string;
  }> {
    const npcs: Array<{
      name: string;
      description?: string;
    }> = [];

    // Паттерны для поиска NPC
    const patterns = [
      // "трактирщик Борис"
      /(трактирщик|торговец|стражник|маг|жрец|кузнец|бармен|старик|старуха|девочка|мальчик|женщина|мужчина)\s+([А-ЯЁ][а-яё]+)/gi,
      // "Борис - трактирщик"
      /([А-ЯЁ][а-яё]+)\s*[-–—]\s*(трактирщик|торговец|стражник|маг|жрец|кузнец|бармен)/gi
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[2] || match[1];
        const role = match[1] || match[2];
        
        if (name && name.length > 1 && name !== role) {
          npcs.push({
            name: name.trim(),
            description: `${role}: ${name}`
          });
        }
      }
    }

    return npcs;
  }

  // === АНАЛИТИЧЕСКИЕ МЕТОДЫ ===

  /**
   * Получение связанных сущностей
   */
  async getRelatedEntities(entityId: string, roomId: string): Promise<Entity[]> {
    try {
      const entity = await this.getEntity(entityId);
      if (!entity) return [];

      const allEntities = await this.getEntitiesByRoom(roomId);
      const related: Entity[] = [];

      // Ищем сущности, упомянутые в фактах текущей сущности
      const facts = await this.getEntityFacts(entityId);
      
      for (const fact of facts) {
        for (const otherEntity of allEntities) {
          if (otherEntity.id !== entityId) {
            // Проверяем, упоминается ли другая сущность в значении факта
            if (fact.value.toLowerCase().includes(otherEntity.name.toLowerCase())) {
              related.push(otherEntity);
            }
          }
        }
      }

      return related;
    } catch (error) {
      console.error('Ошибка поиска связанных сущностей:', error);
      return [];
    }
  }

  /**
   * Получение статистики сущностей для комнаты
   */
  async getEntityStats(roomId: string): Promise<{
    total: number;
    by_type: Record<EntityType, number>;
    with_facts: number;
    recent_entities: Entity[];
  }> {
    try {
      const entities = await this.getEntitiesByRoom(roomId);
      
      const stats = {
        total: entities.length,
        by_type: {
          character: 0,
          location: 0,
          quest: 0,
          npc: 0,
          item: 0
        } as Record<EntityType, number>,
        with_facts: 0,
        recent_entities: entities.slice(-5) // Последние 5 сущностей
      };

      for (const entity of entities) {
        stats.by_type[entity.type]++;
        
        const facts = await this.getEntityFacts(entity.id);
        if (facts.length > 0) {
          stats.with_facts++;
        }
      }

      return stats;
    } catch (error) {
      console.error('Ошибка получения статистики сущностей:', error);
      return {
        total: 0,
        by_type: { character: 0, location: 0, quest: 0, npc: 0, item: 0 },
        with_facts: 0,
        recent_entities: []
      };
    }
  }
}
