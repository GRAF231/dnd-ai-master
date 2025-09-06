# 🎮 РЕЗЮМЕ ТЗ: AI D&D Master Service

## 📋 КРАТКОЕ ОПИСАНИЕ
MVP веб-сервиса для D&D с ИИ-мастером, предназначенный для игры с друзьями. Включает голосовую связь, персистентную память кампании и персональных ИИ-ассистентов.

## 🎯 КЛЮЧЕВЫЕ ЦЕЛИ
1. **Основная функция**: ИИ ведет D&D сессии для 4-5 игроков
2. **Техническая цель**: Стабильная работа в течение 2-часовых сессий
3. **Бизнес-цель**: Бесплатный для друзей, контроль расходов API
4. **UX цель**: Простота использования без регистрации

## 🏗️ АРХИТЕКТУРНЫЕ РЕШЕНИЯ

### Выбор технологий
- **Frontend**: Next.js + TypeScript (быстрая разработка, SSR)
- **Backend**: Node.js + Fastify (производительность, простота)
- **Database**: SQLite (нет сложности настройки, достаточно для MVP)
- **LLM**: Claude 3.5 Sonnet для DM, GPT-4o-mini для ассистентов (качество vs стоимость)
- **Voice**: WebRTC mesh (простота vs SFU)

### Системные паттерны
```
Пользователи -> WebRTC Mesh (голос)
     ↓
   Frontend (React)
     ↓  
   WebSocket (чат)
     ↓
   Backend API
     ↓
   Context Manager -> LLM APIs
     ↓
   SQLite (память)
```

## 🧠 СИСТЕМА ПАМЯТИ

### Стратегия сжатия контекста
1. **Активная сцена**: Только последние 10-20 ходов
2. **Сущности**: Карточки персонажей/локаций/квестов 
3. **Факты**: Структурированные key-value пары
4. **Сводки**: Автоматическое сжатие через GPT-4o-mini

### Паттерн управления контекстом
```javascript
// Псевдокод алгоритма
function buildPrompt(roomId) {
  const context = {
    system: dmSystemPrompt,
    activeScene: getLastMessages(roomId, 20),
    entities: getActiveEntities(roomId),
    facts: getRelevantFacts(roomId),
    summary: getSessionSummary(roomId)
  };
  
  return optimizeTokens(context, MAX_TOKENS);
}
```

## 💻 ТЕХНИЧЕСКАЯ РЕАЛИЗАЦИЯ

### API эндпоинты
```
POST /rooms              # Создать комнату
GET  /rooms/:id          # Получить данные комнаты
POST /dm/reply           # Ответ ИИ-мастера
POST /assistant/reply    # Ответ ассистента
GET  /entities/:id       # Получить сущность
POST /summary            # Создать сводку
```

### База данных (основные таблицы)
```sql
rooms: id, title, settings, created_at
sessions: id, room_id, started_at, summary
messages: id, room_id, role, content, timestamp
entities: id, room_id, type, name, data
facts: id, entity_id, key, value, confidence
```

## 🎮 ИГРОВАЯ МЕХАНИКА

### Инструменты ИИ-мастера
- `roll_dice(formula)` - честные броски
- `get_entity(id)` - информация о персонажах/мире
- `update_fact(entity, key, value)` - обновление фактов
- `create_npc(name, description)` - создание NPC

### Команды игроков
- `/roll 1d20+3` - бросок кубов
- `/note текст` - личная заметка
- `/gmk текст` - приватное сообщение мастеру

## 📊 ЭКОНОМИКА ПРОЕКТА

### Расходы на API (месяц)
- **DM (GPT-4o)**: ~$30 при 8 сессиях/мес
- **Ассистенты (GPT-4o-mini)**: ~$8
- **Суммаризация**: ~$5
- **Буфер**: ~$15
- **ИТОГО: ~$48/мес

### Инфраструктура
- **VPS**: €12/мес
- **Домен**: €1/мес
- **ИТОГО**: €13/мес

### Общий бюджет: ~€65/мес

## ⚠️ РИСКИ И МИТИГАЦИЯ

### Технические риски
1. **WebRTC нестабильность** → Fallback на готовые решения (Jitsi)
2. **Высокие расходы API** → Агрессивная оптимизация контекста
3. **Латентность ИИ** → Стриминг + короткие промпты по умолчанию
4. **Переполнение контекста** → Иерархические сводки

### Продуктовые риски
1. **Качество ИИ-мастера** → Итеративный промпт-инжиниринг
2. **Сложность использования** → Фокус на простоту UX
3. **Масштабирование** → Ограничение на 10 одновременных комнат

## 🚀 КРИТЕРИИ ГОТОВНОСТИ

### Минимальные требования MVP
- [ ] 4 игрока проводят 2-часовую сессию без критических багов
- [ ] ИИ-мастер помнит контекст в течение сессии
- [ ] Голосовая связь работает стабильно
- [ ] Стоимость сессии < $6

### Показатели качества
- [ ] Время отклика ИИ < 5 секунд (95% запросов)
- [ ] Голосовая задержка < 200ms
- [ ] Uptime > 99% в течение сессии
- [ ] Мобильная версия функциональна

## 📋 ПЛАН ДЕЙСТВИЙ

### Immediate Next Steps
1. **Настроить окружение** (репозиторий, API ключи, VPS)
2. **День 1-2**: Базовая инфраструктура + чат
3. **День 3-4**: ИИ-интеграция + промпты
4. **День 5-6**: Система памяти
5. **День 7-9**: WebRTC голос
6. **День 10-12**: Персональные ассистенты
7. **День 13-15**: Полировка и тестирование

### Контрольные точки
- **Неделя 1**: Функциональный ИИ-мастер с памятью
- **Неделя 2**: Полный MVP с голосом и ассистентами
- **День 15**: Production-ready версия

## 🎯 SUCCESS METRICS

### Technical KPIs
- API Response Time: <3s average
- Voice Quality: <200ms latency, <5% packet loss
- System Uptime: >99% during sessions
- Cost per Session: <$6

### Product KPIs  
- Session Duration: 2+ hours without critical issues
- User Retention: Friends return for second session
- AI Quality: Coherent storytelling throughout session

Этот план дает четкое техническое задание и roadmap для создания MVP AI D&D Master Service за 15 дней.

## 🧠 ПРЕИМУЩЕСТВА CLAUDE 3.5 SONNET ДЛЯ D&D МАСТЕРА

### Качественные характеристики
- **Длинный контекст**: 200k токенов vs 128k у GPT-4o
- **Русскоязычное повествование**: Превосходное качество литературного языка
- **Понимание ролевых игр**: Отлично знаком с механиками D&D и storytelling
- **Креативность**: Высокое качество импровизации и создания сюжетных поворотов

### Технические преимущества
- **Стоимость**: $15 vs $30 за 1M токенов (дешевле GPT-4o)
- **Tool calling**: Поддержка функций для игровых инструментов
- **Streaming**: Поддержка потокового вывода для real-time ответов
- **Context window**: Больше места для истории кампании

### Экономия бюджета
```
Сравнение месячных расходов (8 сессий):
- GPT-4o: ~$30/мес
- Claude 3.5 Sonnet: ~$25/мес
- Экономия: ~$5/мес или $60/год
```

# 🏗️ СИСТЕМНЫЕ ПАТТЕРНЫ AI D&D MASTER

## 🎯 АРХИТЕКТУРНЫЕ ПРИНЦИПЫ

### 1. **Модульная архитектура с фасадами**
- **MemoryManager** как единый фасад для всех операций с памятью
- **ToolsService** как центральный менеджер инструментов
- **ElizaService** как абстракция над LLM API
- Четкое разделение ответственности между модулями

### 2. **Интеллектуальное управление ресурсами**
- **ContextManager** для приоритизации и оптимизации контекста
- **SummaryService** для автоматического сжатия данных
- **Кэширование** с автоматической инвалидацией
- **Токен-менеджмент** для экономии API вызовов

### 3. **Автоматизация и самообучение**
- **EntityService** автоматически извлекает сущности из текста
- **Система фактов** с уровнями уверенности
- **Автоматическое определение сцен** по контексту
- **Фоновая обработка** без блокировки пользователя

## 🧠 ПАТТЕРНЫ СИСТЕМЫ ПАМЯТИ

### 1. **Layered Memory Architecture**
```
┌─────────────────────────────────────┐
│           MemoryManager             │ ← Единый фасад
├─────────────────────────────────────┤
│  ContextManager  │  SummaryService  │ ← Интеллектуальные сервисы
├─────────────────────────────────────┤
│      EntityService                  │ ← Управление сущностями
├─────────────────────────────────────┤
│      DatabaseService                │ ← Персистентность
└─────────────────────────────────────┘
```

### 2. **Smart Context Prioritization**
- **Временные веса**: Новые сообщения важнее старых
- **Участники**: Сообщения игроков приоритетнее системных
- **Ключевые слова**: D&D термины повышают приоритет
- **Связи с сущностями**: Упоминания персонажей/локаций важны
- **Недавность**: Последние 10 сообщений получают бонус

### 3. **Hierarchical Summarization**
```
Сообщения → Группы сообщений → Сцены → Сессии → Кампании
     ↓              ↓            ↓        ↓         ↓
   Факты      Мини-сводки    Сводки   Итоги   История
                             сцен    сессий   кампании
```

### 4. **Entity-Fact Relationship Model**
```
Entity (Персонаж/Локация/NPC/Предмет)
├── Facts (Атрибуты с уверенностью 0.0-1.0)
├── Mentions (Упоминания в сообщениях)
├── Relationships (Связи с другими сущностями)
└── Statistics (Частота, последнее упоминание)
```

## 🔧 ТЕХНИЧЕСКИЕ ПАТТЕРНЫ

### 1. **Anthropic Tool Format Standard**
```typescript
interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}
```

### 2. **Result Pattern with Error Handling**
```typescript
interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
```

### 3. **Caching Pattern with TTL**
```typescript
interface CachedContext {
  context: OptimizedContext;
  created_at: Date;
  expires_at: Date;
  cache_key: string;
}
```

### 4. **Priority Scoring Algorithm**
```typescript
priority_score = (
  time_weight * time_factor +
  participant_weight * participant_factor +
  keyword_weight * keyword_factor +
  entity_weight * entity_factor
) / normalization_factor
```

## 🎮 ИГРОВЫЕ ПАТТЕРНЫ

### 1. **Tool Integration Pattern**
- Каждый инструмент реализует `BaseTool` интерфейс
- Автоматическая регистрация в `ToolsService`
- Единообразная обработка ошибок и результатов
- Интеграция с системой памяти

### 2. **Session Lifecycle Management**
```
Room Creation → Session Start → Message Processing → Context Building → 
Entity Extraction → Memory Storage → Response Generation → 
Auto Summarization → Session End
```

### 3. **Character Sheet Integration**
- Персонажи автоматически становятся сущностями
- REST API для UI + Tool API для ИИ-автономии
- Централизованная база через FileStorage
- Поиск по имени и ID

### 4. **Memory-Enhanced DM Pattern**
```typescript
async processUserMessage(roomId: string, content: string) {
  // 1. Сохранить сообщение
  const message = await this.saveMessage(content);
  
  // 2. Инвалидировать кэш
  this.invalidateCache(roomId);
  
  // 3. Извлечь сущности
  await this.extractEntities(content);
  
  // 4. Построить оптимизированный контекст
  const context = await this.buildOptimizedContext(roomId);
  
  // 5. Проверить необходимость сжатия
  await this.checkAutoSummary(sessionId);
  
  return { message, context };
}
```

## 📊 ПАТТЕРНЫ ПРОИЗВОДИТЕЛЬНОСТИ

### 1. **Lazy Loading with Caching**
- Контекст загружается по требованию
- Кэширование с автоматической инвалидацией
- Инкрементальные обновления при новых данных

### 2. **Token Budget Management**
- Приоритизация контента по релевантности
- Умное обрезание старых сообщений
- Сохранение критически важной информации
- Ограничение до 150k токенов (80% для сообщений, 20% для сущностей)

### 3. **Background Processing**
- Фоновое создание сводок без блокировки UI
- Очередь задач с приоритизацией
- Автоматические триггеры по количеству сообщений

### 4. **Database Optimization**
- Индексы на часто используемые поля
- Транзакционная безопасность
- Batch операции для множественных вставок

## 🔄 ПАТТЕРНЫ ИНТЕГРАЦИИ

### 1. **Backward Compatibility**
- Новые методы не ломают существующий API
- Опциональные параметры для расширения функциональности
- Graceful degradation при отсутствии памяти

### 2. **Service Composition**
```typescript
class MemoryManager {
  private db: DatabaseService;
  private entityService: EntityService;
  private contextManager: ContextManager;
  private summaryService: SummaryService;
  
  // Композиция сервисов через единый фасад
}
```

### 3. **Event-Driven Updates**
- Автоматическая инвалидация кэша при новых сообщениях
- Триггеры для автоматического создания сводок
- Обновление статистики в реальном времени

## 🎯 ПАТТЕРНЫ КАЧЕСТВА

### 1. **Type Safety First**
- 100% TypeScript покрытие
- Строгая типизация всех интерфейсов
- Compile-time проверки

### 2. **Error Handling Strategy**
```typescript
try {
  const result = await operation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { 
    success: false, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  };
}
```

### 3. **Testing Patterns**
- Комплексное тестирование всех компонентов
- Интеграционные тесты с реальными данными
- Performance тесты для критических операций

### 4. **Documentation Standards**
- JSDoc комментарии для всех публичных методов
- Архитектурная документация в Memory Bank
- Примеры использования в тестах

## 🚀 ПАТТЕРНЫ МАСШТАБИРОВАНИЯ

### 1. **Modular Extension**
- Новые типы сущностей добавляются через расширение интерфейсов
- Новые инструменты регистрируются автоматически
- Плагинная архитектура для будущих расширений

### 2. **Resource Management**
- Автоматическая очистка устаревших кэшей
- Ограничения на размер данных в памяти
- Graceful handling больших объемов данных

### 3. **Multi-Session Support**
- Изоляция данных между комнатами
- Параллельная обработка множественных сессий
- Shared nothing архитектура для горизонтального масштабирования

---

## 📋 ПРИМЕНЕНИЕ ПАТТЕРНОВ

### ✅ Реализованные паттерны:
- **Layered Memory Architecture** - полная реализация
- **Smart Context Prioritization** - алгоритм scoring работает
- **Hierarchical Summarization** - сообщения → сцены → сессии
- **Entity-Fact Relationship** - автоматическое извлечение и связи
- **Anthropic Tool Format** - все 6 инструментов конвертированы
- **Result Pattern** - единообразная обработка ошибок
- **Caching with TTL** - производительность < 200ms
- **Memory-Enhanced DM** - полная интеграция с ИИ-мастером

### 🎯 Готовность к расширению:
Архитектура готова для добавления новых компонентов без breaking changes. Все паттерны протестированы и документированы.
