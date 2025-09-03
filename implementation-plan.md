# 🚀 IMPLEMENTATION PLAN: Phase 5 Enhancement

## 📋 ПРОМПТ ДЛЯ IMPLEMENTATION MODE

```
Привет! Я готов перейти к реализации Phase 5 для проекта AI D&D Master.

СТАТУС ЗАВЕРШЕННЫХ ЭТАПОВ:
✅ Phase 1-4: Базовая система с Claude 3.5 Sonnet + Tool Calling работает
✅ Creative Phase: Все архитектурные и дизайнерские решения приняты
✅ Style Guide: Создан memory-bank/style-guide.md
✅ Детальное планирование: Все компоненты спроектированы

ЗАДАЧА IMPLEMENTATION:
Реализовать принятые в Creative Phase решения согласно приоритетам.

ПРИОРИТЕТ 1 - РАСШИРЕНИЕ СИСТЕМЫ ИНСТРУМЕНТОВ (2-3 часа):
Реализовать модульную архитектуру с 5 новыми инструментами:

1. CharacterSheetService - создание/управление персонажами D&D 5e
2. NotesManagerService - сохранение и поиск игровых заметок  
3. AdvancedDiceService - броски с преимуществом/недостатком
4. RulesReferenceService - справочная информация по D&D правилам
5. InitiativeTrackerService - трекер инициативы для боевых сцен

АРХИТЕКТУРНЫЕ РЕШЕНИЯ (из Creative Phase):
- Базовая абстракция BaseTool interface
- Отдельный сервис для каждого инструмента  
- JSON файловое хранение для персистентности
- Интеграция через обновленный ToolsService
- Следование паттернам существующего DiceRollerService

ПРИОРИТЕТ 2 - UI СОЗДАНИЯ ПЕРСОНАЖЕЙ (1.5-2 часа):
- Полноэкранный мастер с боковой навигацией
- 5 шагов создания персонажа D&D 5e
- Строгое следование style-guide.md
- Route /character/create с возвратом в игру
- Мобильная адаптация

ПРИОРИТЕТ 3 - АНИМАЦИИ КУБИКОВ (1 час):
- CSS анимации + SVG эффекты для критических результатов
- Интеграция с существующим tool calling
- Цветовое кодирование по style guide

ФАЙЛЫ ДЛЯ РЕФЕРЕНСА:
Backend: 
- /backend/src/services/tools/diceRoller.ts (пример существующего инструмента)
- /backend/src/services/tools/index.ts (система управления)

Frontend:
- /frontend/src/components/GameChat/GameChat.tsx (существующий UI)
- memory-bank/style-guide.md (обязательно следовать!)

КРИТЕРИИ ГОТОВНОСТИ:
- Все 5 новых инструментов работают и интегрированы с Claude 3.5 Sonnet
- ИИ-мастер может создавать персонажей, сохранять заметки, управлять инициативой
- UI следует style guide на 100%
- Тестирование через существующий GameChat интерфейс

Давай начнем с Приоритета 1 - расширения системы инструментов. 
Начни с создания базовой абстракции BaseTool, затем поэтапно реализуй каждый сервис.

Структура проекта:
/dnd/dnd-ai-master/
├── backend/src/services/tools/ (здесь добавляем новые инструменты)
├── frontend/src/components/ (здесь UI компоненты)
└── memory-bank/ (документация и style guide)
```

## 🎯 ДЕТАЛЬНЫЙ ПЛАН РЕАЛИЗАЦИИ

### ЭТАП 1: Базовая инфраструктура инструментов (30 мин)

1. **Создать BaseTool interface**:
```typescript
// backend/src/services/tools/BaseTool.ts
interface BaseTool {
  getToolDefinition(): ToolDefinition;
  handleToolCall(args: any): string;
  validateArgs(args: any): boolean;
  getName(): string;
  getDescription(): string;
}
```

2. **Создать FileStorage utility**:
```typescript  
// backend/src/services/tools/utils/FileStorage.ts
class FileStorage {
  save(filename: string, data: any): void;
  load(filename: string): any;
  exists(filename: string): boolean;
}
```

### ЭТАП 2: CharacterSheetService (45 мин)

```typescript
// backend/src/services/tools/characterSheet.ts
class CharacterSheetService implements BaseTool {
  // D&D 5e character creation and management
  // - createCharacter(name, race, class, abilities)
  // - getCharacter(id)
  // - updateCharacter(id, updates) 
  // - listCharacters(roomId)
}
```

**Tool Definition**:
- create_character: Создать нового персонажа
- get_character: Получить информацию о персонаже
- update_character: Обновить характеристики персонажа

### ЭТАП 3: NotesManagerService (30 мин)

```typescript
// backend/src/services/tools/notesManager.ts
class NotesManagerService implements BaseTool {
  // Game notes management
  // - saveNote(content, category, roomId)
  // - searchNotes(query, roomId)
  // - getNotes(category, roomId)
  // - deleteNote(id)
}
```

**Tool Definition**:
- save_note: Сохранить игровую заметку
- search_notes: Найти заметки по запросу
- get_notes: Получить заметки по категории

### ЭТАП 4: AdvancedDiceService (30 мин)

```typescript
// backend/src/services/tools/advancedDice.ts  
class AdvancedDiceService implements BaseTool {
  // Advanced dice rolling
  // - rollWithAdvantage(dice): roll twice, take higher
  // - rollWithDisadvantage(dice): roll twice, take lower
  // - rollMultiple(dice, count): multiple rolls
}
```

**Tool Definition**:
- roll_advantage: Бросок с преимуществом
- roll_disadvantage: Бросок с недостатком

### ЭТАП 5: RulesReferenceService (30 мин)

```typescript
// backend/src/services/tools/rulesReference.ts
class RulesReferenceService implements BaseTool {
  // D&D 5e rules lookup
  // - getSpellInfo(spellName)
  // - getConditionInfo(condition)
  // - getActionInfo(action)
  // - searchRules(query)
}
```

### ЭТАП 6: InitiativeTrackerService (30 мин)

```typescript
// backend/src/services/tools/initiativeTracker.ts
class InitiativeTrackerService implements BaseTool {
  // Combat initiative tracking
  // - startCombat(roomId)
  // - addCombatant(name, initiative)
  // - nextTurn()
  // - endCombat()
}
```

### ЭТАП 7: Интеграция с ToolsService (15 мин)

Обновить `backend/src/services/tools/index.ts`:
- Импортировать все новые сервисы
- Добавить в getAllTools()
- Обновить executeToolCall() switch statement

### ЭТАП 8: Тестирование (15 мин)

Протестировать каждый инструмент через:
- Direct API calls
- GameChat UI
- Integration с Claude 3.5 Sonnet

## 📊 МЕТРИКИ ГОТОВНОСТИ

### Backend Tools (Приоритет 1):
- [ ] BaseTool interface создан
- [ ] CharacterSheetService: create/get/update персонажей
- [ ] NotesManagerService: save/search/get заметок  
- [ ] AdvancedDiceService: advantage/disadvantage броски
- [ ] RulesReferenceService: поиск правил D&D
- [ ] InitiativeTrackerService: управление боевой инициативой
- [ ] Все инструменты интегрированы в ToolsService
- [ ] Тестирование через GameChat ✅

### UI Components (Приоритет 2):
- [ ] CharacterCreationWizard с 5 шагами
- [ ] Следование memory-bank/style-guide.md
- [ ] Мобильная адаптация
- [ ] Интеграция с character sheet tool

### Animations (Приоритет 3):
- [ ] DiceAnimation компонент
- [ ] CSS анимации базовых бросков
- [ ] SVG эффекты для критических результатов
- [ ] Интеграция с tool calling результатами

---

**ВРЕМЯ ВЫПОЛНЕНИЯ**: 4-6 часов total
**РЕЗУЛЬТАТ**: Расширенная система с 5 новыми инструментами + улучшенным UI

Ready to implement! 🚀
