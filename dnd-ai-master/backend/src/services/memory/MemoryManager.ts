import { DatabaseService } from './DatabaseService.js';
import { EntityService } from './EntityService.js';
import { ContextManager } from './ContextManager.js';
import { SummaryService } from './SummaryService.js';
import { 
  Room, Session, Message, Entity, Fact, GameContext,
  CreateRoomRequest, CreateSessionRequest, SaveMessageRequest,
  CreateEntityRequest, CreateFactRequest, ContextOptions,
  OperationResult, MemoryStats, EntityType,
  OptimizedContext, ContextManagerConfig, SummaryServiceConfig,
  CreateSummaryRequest, Summary, CompressionStats
} from './types.js';

/**
 * Главный фасад для системы памяти AI D&D Master
 * Предоставляет единый интерфейс для всех операций с памятью
 */
export class MemoryManager {
  private db: DatabaseService;
  private entityService: EntityService;
  private contextManager: ContextManager;
  private summaryService: SummaryService;
  private initialized: boolean = false;

  constructor(
    dbPath?: string,
    contextConfig?: Partial<ContextManagerConfig>,
    summaryConfig?: Partial<SummaryServiceConfig>
  ) {
    this.db = new DatabaseService(dbPath);
    this.entityService = new EntityService(this.db);
    this.contextManager = new ContextManager(this.db, this.entityService, contextConfig);
    this.summaryService = new SummaryService(this.db, this.entityService, summaryConfig);
  }

  /**
   * Инициализация системы памяти
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    await this.db.initialize();
    this.initialized = true;
    console.log('🧠 MemoryManager инициализирован');
  }

  /**
   * Закрытие системы памяти
   */
  async close(): Promise<void> {
    if (!this.initialized) return;
    
    await this.db.close();
    this.initialized = false;
    console.log('🧠 MemoryManager закрыт');
  }

  /**
   * Проверка инициализации
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MemoryManager не инициализирован. Вызовите initialize() сначала.');
    }
  }

  // === УПРАВЛЕНИЕ КОМНАТАМИ ===

  /**
   * Создание новой комнаты
   */
  async createRoom(request: CreateRoomRequest): Promise<OperationResult<Room>> {
    this.ensureInitialized();
    return this.db.createRoom(request);
  }

  /**
   * Получение комнаты по ID
   */
  async getRoom(roomId: string): Promise<Room | undefined> {
    this.ensureInitialized();
    return this.db.getRoomById(roomId);
  }

  /**
   * Обеспечение существования комнаты (создает если не существует)
   */
  async ensureRoom(roomId: string, title?: string): Promise<Room> {
    this.ensureInitialized();
    
    let room = await this.db.getRoomById(roomId);
    
    if (!room) {
      const createResult = await this.db.createRoom({
        id: roomId,
        title: title || `Комната ${roomId}`,
        settings: {}
      });
      
      if (!createResult.success || !createResult.data) {
        throw new Error(`Не удалось создать комнату: ${createResult.error}`);
      }
      
      room = createResult.data;
      console.log(`🏠 Создана новая комната: ${roomId}`);
    }
    
    return room;
  }

  // === УПРАВЛЕНИЕ СЕССИЯМИ ===

  /**
   * Начало новой сессии или получение активной
   */
  async startSession(roomId: string): Promise<Session> {
    this.ensureInitialized();
    
    // Проверяем, есть ли активная сессия
    let session = await this.db.getActiveSession(roomId);
    
    if (!session) {
      // Создаем новую сессию
      const createResult = await this.db.createSession({ room_id: roomId });
      
      if (!createResult.success || !createResult.data) {
        throw new Error(`Не удалось создать сессию: ${createResult.error}`);
      }
      
      session = createResult.data;
      console.log(`🎮 Начата новая сессия: ${session.id} в комнате ${roomId}`);
    }
    
    return session;
  }

  /**
   * Завершение сессии
   */
  async endSession(sessionId: string, summary?: string): Promise<OperationResult<void>> {
    this.ensureInitialized();
    
    const result = await this.db.endSession(sessionId, summary);
    
    if (result.success) {
      console.log(`🏁 Сессия завершена: ${sessionId}`);
    }
    
    return result;
  }

  /**
   * Получение активной сессии для комнаты
   */
  async getActiveSession(roomId: string): Promise<Session | undefined> {
    this.ensureInitialized();
    return this.db.getActiveSession(roomId);
  }

  // === УПРАВЛЕНИЕ СООБЩЕНИЯМИ ===

  /**
   * Сохранение сообщения
   */
  async saveMessage(request: SaveMessageRequest): Promise<OperationResult<Message>> {
    this.ensureInitialized();
    
    const result = await this.db.saveMessage(request);
    
    if (result.success) {
      console.log(`💬 Сообщение сохранено: ${request.role} - ${request.content.substring(0, 50)}...`);
    }
    
    return result;
  }

  /**
   * Получение последних сообщений сессии
   */
  async getRecentMessages(sessionId: string, limit: number = 50): Promise<Message[]> {
    this.ensureInitialized();
    return this.db.getRecentMessages(sessionId, limit);
  }

  /**
   * Сохранение сообщения пользователя
   */
  async saveUserMessage(sessionId: string, content: string, playerName?: string): Promise<OperationResult<Message>> {
    return this.saveMessage({
      session_id: sessionId,
      role: 'user',
      content,
      player_name: playerName
    });
  }

  /**
   * Сохранение ответа ИИ-мастера
   */
  async saveAssistantMessage(sessionId: string, content: string, tokenCount?: number): Promise<OperationResult<Message>> {
    return this.saveMessage({
      session_id: sessionId,
      role: 'assistant',
      content,
      token_count: tokenCount
    });
  }

  // === УПРАВЛЕНИЕ СУЩНОСТЯМИ ===

  /**
   * Создание сущности
   */
  async createEntity(request: CreateEntityRequest): Promise<OperationResult<Entity>> {
    this.ensureInitialized();
    
    const result = await this.db.createEntity(request);
    
    if (result.success) {
      console.log(`🏷️ Создана сущность: ${request.type} - ${request.name}`);
    }
    
    return result;
  }

  /**
   * Получение сущности по ID
   */
  async getEntity(entityId: string): Promise<Entity | undefined> {
    this.ensureInitialized();
    return this.db.getEntityById(entityId);
  }

  /**
   * Получение всех сущностей комнаты
   */
  async getEntities(roomId: string, type?: EntityType): Promise<Entity[]> {
    this.ensureInitialized();
    return this.db.getEntitiesByRoom(roomId, type);
  }

  /**
   * Поиск сущностей по имени
   */
  async findEntitiesByName(roomId: string, name: string, type?: EntityType): Promise<Entity[]> {
    this.ensureInitialized();
    
    const entities = await this.db.getEntitiesByRoom(roomId, type);
    
    return entities.filter(entity => 
      entity.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  // === УПРАВЛЕНИЕ ФАКТАМИ ===

  /**
   * Создание факта
   */
  async createFact(request: CreateFactRequest): Promise<OperationResult<Fact>> {
    this.ensureInitialized();
    
    const result = await this.db.createFact(request);
    
    if (result.success) {
      console.log(`📝 Создан факт: ${request.key} = ${request.value}`);
    }
    
    return result;
  }

  /**
   * Получение фактов сущности
   */
  async getEntityFacts(entityId: string): Promise<Fact[]> {
    this.ensureInitialized();
    return this.entityService.getEntityFacts(entityId);
  }

  /**
   * Автоматическое извлечение сущностей из текста
   */
  async extractEntitiesFromText(roomId: string, text: string, sourceMessageId?: string): Promise<Entity[]> {
    this.ensureInitialized();
    return this.entityService.extractEntitiesFromText(roomId, text, sourceMessageId);
  }

  /**
   * Получение связанных сущностей
   */
  async getRelatedEntities(entityId: string, roomId: string): Promise<Entity[]> {
    this.ensureInitialized();
    return this.entityService.getRelatedEntities(entityId, roomId);
  }

  /**
   * Получение статистики сущностей
   */
  async getEntityStats(roomId: string): Promise<{
    total: number;
    by_type: Record<EntityType, number>;
    with_facts: number;
    recent_entities: Entity[];
  }> {
    this.ensureInitialized();
    return this.entityService.getEntityStats(roomId);
  }

  // === ПОСТРОЕНИЕ КОНТЕКСТА ===

  /**
   * Построение игрового контекста для ИИ-мастера
   */
  async buildContext(roomId: string, options: ContextOptions = {}): Promise<GameContext> {
    this.ensureInitialized();
    
    // Настройки по умолчанию
    const opts = {
      max_messages: options.max_messages || 30,
      max_tokens: options.max_tokens || 150000, // Оставляем место для ответа
      include_entities: options.include_entities !== false,
      include_facts: options.include_facts !== false,
      entity_types: options.entity_types
    };

    // Получаем активную сессию
    const session = await this.getActiveSession(roomId);
    
    if (!session) {
      throw new Error(`Нет активной сессии для комнаты ${roomId}`);
    }

    // Получаем последние сообщения
    const recent_messages = await this.getRecentMessages(session.id, opts.max_messages);

    // Получаем активные сущности
    let active_entities: Entity[] = [];
    if (opts.include_entities) {
      active_entities = await this.getEntities(roomId);
      
      // Фильтруем по типам если указано
      if (opts.entity_types && opts.entity_types.length > 0) {
        active_entities = active_entities.filter(entity => 
          opts.entity_types!.includes(entity.type)
        );
      }
    }

    // Получаем релевантные факты
    let relevant_facts: Fact[] = [];
    if (opts.include_facts && active_entities.length > 0) {
      const factPromises = active_entities.map(entity => 
        this.getEntityFacts(entity.id)
      );
      
      const allFacts = await Promise.all(factPromises);
      relevant_facts = allFacts.flat();
    }

    // Подсчитываем примерное количество токенов
    const total_tokens = this.estimateTokens(recent_messages, active_entities, relevant_facts);

    const context: GameContext = {
      session_id: session.id,
      room_id: roomId,
      recent_messages,
      active_entities,
      relevant_facts,
      session_summary: session.summary,
      total_tokens
    };

    console.log(`🧠 Контекст построен: ${recent_messages.length} сообщений, ${active_entities.length} сущностей, ${relevant_facts.length} фактов, ~${total_tokens} токенов`);

    return context;
  }

  /**
   * Примерная оценка количества токенов
   */
  private estimateTokens(messages: Message[], entities: Entity[], facts: Fact[]): number {
    let tokens = 0;
    
    // Сообщения: ~4 символа на токен
    tokens += messages.reduce((sum, msg) => sum + Math.ceil(msg.content.length / 4), 0);
    
    // Сущности: название + описание
    tokens += entities.reduce((sum, entity) => {
      const content = entity.name + (entity.description || '') + JSON.stringify(entity.data);
      return sum + Math.ceil(content.length / 4);
    }, 0);
    
    // Факты: ключ + значение
    tokens += facts.reduce((sum, fact) => {
      return sum + Math.ceil((fact.key + fact.value).length / 4);
    }, 0);
    
    return tokens;
  }

  // === ВЫСОКОУРОВНЕВЫЕ ОПЕРАЦИИ ===

  /**
   * Полная обработка сообщения пользователя
   */
  async processUserMessage(roomId: string, content: string, playerName?: string): Promise<{
    session: Session;
    message: Message;
    context: GameContext;
  }> {
    this.ensureInitialized();
    
    // Обеспечиваем существование комнаты
    await this.ensureRoom(roomId);
    
    // Получаем или создаем сессию
    const session = await this.startSession(roomId);
    
    // Сохраняем сообщение пользователя
    const messageResult = await this.saveUserMessage(session.id, content, playerName);
    
    if (!messageResult.success || !messageResult.data) {
      throw new Error(`Не удалось сохранить сообщение: ${messageResult.error}`);
    }

    // Автоматически извлекаем сущности из сообщения пользователя
    try {
      const extractedEntities = await this.extractEntitiesFromText(roomId, content, messageResult.data.id);
      if (extractedEntities.length > 0) {
        console.log(`🔍 Автоматически извлечено ${extractedEntities.length} сущностей из сообщения пользователя`);
      }
    } catch (error) {
      console.warn('Не удалось извлечь сущности из сообщения пользователя:', error);
    }
    
    // Строим контекст
    const context = await this.buildContext(roomId);
    
    return {
      session,
      message: messageResult.data,
      context
    };
  }

  /**
   * Сохранение ответа ИИ-мастера
   */
  async processAssistantResponse(sessionId: string, content: string, tokenCount?: number): Promise<Message> {
    this.ensureInitialized();
    
    const messageResult = await this.saveAssistantMessage(sessionId, content, tokenCount);
    
    if (!messageResult.success || !messageResult.data) {
      throw new Error(`Не удалось сохранить ответ ИИ: ${messageResult.error}`);
    }

    // Автоматически извлекаем сущности из ответа ИИ-мастера
    try {
      const session = await this.db.getSessionById(sessionId);
      if (session) {
        const extractedEntities = await this.extractEntitiesFromText(session.room_id, content, messageResult.data.id);
        if (extractedEntities.length > 0) {
          console.log(`🔍 Автоматически извлечено ${extractedEntities.length} сущностей из ответа ИИ-мастера`);
        }
      }
    } catch (error) {
      console.warn('Не удалось извлечь сущности из ответа ИИ-мастера:', error);
    }
    
    return messageResult.data;
  }

  // === СТАТИСТИКА И УТИЛИТЫ ===

  /**
   * Получение статистики системы памяти
   */
  async getStats(): Promise<MemoryStats> {
    this.ensureInitialized();
    
    const dbStats = await this.db.getStats();
    
    return {
      total_sessions: dbStats.total_sessions,
      total_messages: dbStats.total_messages,
      total_entities: dbStats.total_entities,
      total_facts: dbStats.total_facts,
      compressed_messages: dbStats.compressed_messages,
      average_session_length: dbStats.total_messages > 0 ? 
        Math.round(dbStats.total_messages / Math.max(dbStats.total_sessions, 1)) : 0,
      storage_size_mb: 0 // TODO: Реализовать подсчет размера файла БД
    };
  }

  // === НОВЫЕ МЕТОДЫ ДЛЯ CONTEXTMANAGER ===

  /**
   * Построение оптимизированного контекста с приоритизацией
   */
  async buildOptimizedContext(
    roomId: string,
    options?: ContextOptions
  ): Promise<OptimizedContext> {
    this.ensureInitialized();
    return this.contextManager.buildOptimizedContext(roomId, options);
  }

  /**
   * Инвалидация кэша контекста для комнаты
   */
  invalidateContextCache(roomId: string): void {
    this.contextManager.invalidateRoomCache(roomId);
  }

  /**
   * Получение статистики кэша контекста
   */
  getContextCacheStats(): {
    total_entries: number;
    active_entries: number;
    expired_entries: number;
    memory_usage_mb: number;
  } {
    return this.contextManager.getCacheStats();
  }

  /**
   * Очистка кэша контекста
   */
  clearContextCache(): void {
    this.contextManager.clearCache();
  }

  // === НОВЫЕ МЕТОДЫ ДЛЯ SUMMARYSERVICE ===

  /**
   * Создание сводки сообщений
   */
  async createSummary(request: CreateSummaryRequest): Promise<OperationResult<Summary>> {
    this.ensureInitialized();
    return this.summaryService.createSummary(request);
  }

  /**
   * Автоматическая проверка и создание сводки
   */
  async checkAutoSummary(sessionId: string): Promise<void> {
    this.ensureInitialized();
    await this.summaryService.checkAndCreateAutoSummary(sessionId);
  }

  /**
   * Определение сцен в сессии
   */
  async detectScenes(sessionId: string) {
    this.ensureInitialized();
    return this.summaryService.detectScenes(sessionId);
  }

  /**
   * Получение статистики сжатия
   */
  async getCompressionStats(sessionId: string): Promise<CompressionStats> {
    this.ensureInitialized();
    return this.summaryService.getCompressionStats(sessionId);
  }

  /**
   * Получение статуса обработки сводок
   */
  getSummaryProcessingStatus(): {
    active_sessions: string[];
    queue_size: number;
  } {
    return this.summaryService.getProcessingStatus();
  }

  /**
   * Очистка очереди обработки сводок
   */
  clearSummaryProcessingQueue(): void {
    this.summaryService.clearProcessingQueue();
  }

  // === ОБНОВЛЕННЫЕ МЕТОДЫ С ИНТЕГРАЦИЕЙ ===

  /**
   * Обработка сообщения пользователя с автоматическими функциями
   */
  async processUserMessageWithOptimizations(roomId: string, content: string, playerName?: string): Promise<{
    session: Session;
    message: Message;
    context: OptimizedContext;
  }> {
    this.ensureInitialized();
    
    // Обеспечиваем существование комнаты
    await this.ensureRoom(roomId);
    
    // Получаем или создаем сессию
    const session = await this.startSession(roomId);
    
    // Сохраняем сообщение пользователя
    const messageResult = await this.saveUserMessage(session.id, content, playerName);
    
    if (!messageResult.success || !messageResult.data) {
      throw new Error(`Не удалось сохранить сообщение: ${messageResult.error}`);
    }

    // Инвалидируем кэш контекста для комнаты
    this.invalidateContextCache(roomId);

    // Автоматически извлекаем сущности из сообщения пользователя
    try {
      const extractedEntities = await this.extractEntitiesFromText(roomId, content, messageResult.data.id);
      if (extractedEntities.length > 0) {
        console.log(`🔍 Автоматически извлечено ${extractedEntities.length} сущностей из сообщения пользователя`);
      }
    } catch (error) {
      console.warn('Не удалось извлечь сущности из сообщения пользователя:', error);
    }
    
    // Строим оптимизированный контекст
    const context = await this.buildOptimizedContext(roomId);
    
    // Проверяем необходимость автоматического создания сводки
    try {
      await this.checkAutoSummary(session.id);
    } catch (error) {
      console.warn('Ошибка автоматического создания сводки:', error);
    }
    
    return {
      session,
      message: messageResult.data,
      context
    };
  }

  /**
   * Сохранение ответа ИИ-мастера с оптимизациями
   */
  async processAssistantResponseWithOptimizations(sessionId: string, content: string, tokenCount?: number): Promise<Message> {
    this.ensureInitialized();
    
    const messageResult = await this.saveAssistantMessage(sessionId, content, tokenCount);
    
    if (!messageResult.success || !messageResult.data) {
      throw new Error(`Не удалось сохранить ответ ИИ: ${messageResult.error}`);
    }

    // Получаем roomId для инвалидации кэша
    const session = await this.db.getSessionById(sessionId);
    if (session) {
      this.invalidateContextCache(session.room_id);
    }

    // Автоматически извлекаем сущности из ответа ИИ-мастера
    try {
      if (session) {
        const extractedEntities = await this.extractEntitiesFromText(session.room_id, content, messageResult.data.id);
        if (extractedEntities.length > 0) {
          console.log(`🔍 Автоматически извлечено ${extractedEntities.length} сущностей из ответа ИИ-мастера`);
        }
      }
    } catch (error) {
      console.warn('Не удалось извлечь сущности из ответа ИИ-мастера:', error);
    }
    
    return messageResult.data;
  }

  /**
   * Тестирование системы памяти
   */
  async test(): Promise<void> {
    console.log('🧪 Тестирование MemoryManager...');
    
    try {
      // Тест создания комнаты
      const roomResult = await this.createRoom({
        id: 'test_room',
        title: 'Тестовая комната',
        settings: { test: true }
      });
      
      console.log('✅ Комната создана:', roomResult.success);
      
      // Тест создания сессии
      const session = await this.startSession('test_room');
      console.log('✅ Сессия создана:', session.id);
      
      // Тест сохранения сообщения
      const messageResult = await this.saveUserMessage(
        session.id, 
        'Тестовое сообщение', 
        'Тестовый игрок'
      );
      
      console.log('✅ Сообщение сохранено:', messageResult.success);
      
      // Тест построения контекста
      const context = await this.buildContext('test_room');
      console.log('✅ Контекст построен:', context.recent_messages.length, 'сообщений');
      
      // Тест статистики
      const stats = await this.getStats();
      console.log('✅ Статистика получена:', stats);
      
      console.log('🎉 Все тесты пройдены успешно!');
      
    } catch (error) {
      console.error('❌ Ошибка тестирования:', error);
      throw error;
    }
  }
}
