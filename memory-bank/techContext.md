# 🔧 Техническая документация проекта AI D&D Master

**Версия**: 1.1  
**Дата создания**: 2025-01-09  
**Последнее обновление**: 2025-01-09

## 🎯 Цель проекта
Создание веб-платформы для игры в D&D с ИИ-мастером, поддерживающей:
- Голосовую связь между участниками
- Интеллектуального DM-агента
- Системы управления кампаниями
- Инструменты для RPG игры (кубики, персонажи, заметки)

## 🏗 Архитектура системы

### Frontend (Next.js 15.5.2)
```
/frontend/
├── src/
│   ├── app/                    # App Router (Next.js 15)
│   │   ├── page.tsx           # Главная страница
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Глобальные стили
│   │   ├── room/[id]/         # Динамические комнаты
│   │   │   └── page.tsx       # Страница игровой комнаты
│   │   ├── character/create/  # Создание персонажей  
│   │   │   └── page.tsx       # Мастер создания персонажей
│   │   ├── voice-test/        # WebRTC тестирование
│   │   │   └── page.tsx       # Страница тестирования голосовой связи
│   │   └── api/               # API Routes (Next.js)
│   │       ├── dm/            # Proxy для DM агента
│   │       ├── characters/    # Proxy для персонажей
│   │       └── rooms/         # Proxy для комнат
│   ├── components/            # React компоненты
│   │   ├── GameChat/          # Игровой чат с DM
│   │   ├── CharacterCreation/ # Создание персонажей
│   │   ├── AssistantPanel/    # Панель ассистентов
│   │   ├── GamePanels/        # Игровые панели
│   │   ├── Commands/          # Игровые команды
│   │   ├── DiceAnimation/     # Анимация кубиков
│   │   └── VoiceChat/         # Голосовая связь
│   ├── hooks/                 # React хуки
│   │   ├── useGameChat.ts     # Хук для игрового чата
│   │   └── useWebRTC.ts       # Хук для WebRTC (планируется)
│   ├── types/                 # TypeScript типы
│   │   └── index.ts           # Общие типы проекта
│   └── utils/                 # Утилиты
│       ├── api.ts             # API клиент
│       └── charactersApi.ts   # API для персонажей
├── package.json               # Зависимости фронтенда
└── tsconfig.json             # TypeScript конфигурация
```

### Backend (Fastify + TypeScript)
```
/backend/
├── src/
│   ├── index.ts              # Точка входа + Socket.io
│   ├── routes/               # API маршруты
│   │   ├── dm.ts            # DM агент маршруты
│   │   └── characters.ts     # Персонажи маршруты
│   ├── services/            # Бизнес логика
│   │   ├── llm/             # ИИ сервисы
│   │   │   ├── elizaService.ts     # Интеграция с Eliza
│   │   │   ├── dmAgentEliza.ts     # DM агент
│   │   │   └── dmAgentWithMemory.ts # DM с памятью
│   │   ├── memory/          # Система памяти
│   │   │   ├── DatabaseService.ts  # SQLite ORM
│   │   │   ├── MemoryManager.ts    # Главный фасад
│   │   │   ├── EntityService.ts    # Управление сущностями
│   │   │   ├── ContextManager.ts   # Управление контекстом
│   │   │   └── SummaryService.ts   # Суммаризация
│   │   ├── tools/           # Игровые инструменты
│   │   │   ├── BaseTool.ts         # Базовый класс
│   │   │   ├── diceRoller.ts       # Броски кубиков
│   │   │   ├── advancedDice.ts     # Продвинутые кубики
│   │   │   ├── characterSheet.ts   # Листы персонажей
│   │   │   ├── notesManager.ts     # Заметки
│   │   │   ├── rulesReference.ts   # Справочник правил
│   │   │   ├── initiativeTracker.ts # Трекер инициативы
│   │   │   └── index.ts            # Менеджер инструментов
│   │   ├── voice/           # Голосовая подсистема
│   │   │   └── SignalingService.ts # WebRTC signaling
│   │   └── context/         # Контекстные сервисы
│   ├── models/              # Модели данных
│   └── utils/               # Утилиты
│       ├── config.ts        # Конфигурация
│       └── env.ts          # Environment переменные
├── data/                    # Данные приложения
│   ├── characters_*.json    # Файлы персонажей
│   └── *.db                # SQLite базы данных
├── package.json            # Зависимости бэкенда
└── tsconfig.json          # TypeScript конфигурация
```

## 🔌 Ключевые интеграции

### LLM Provider: Eliza API
- **Endpoint**: `https://api.eliza.yandex.net/raw`
- **Модель**: `claude-3-5-sonnet-20241022`
- **Функции**: Стриминг, Tool Calling, Система промптов
- **Сервис**: `ElizaService` → `DMAgentElizaService`

### База данных: SQLite
- **Местоположение**: `/backend/data/*.db`
- **ORM**: Custom `DatabaseService`
- **Схема**: 7 таблиц (rooms, sessions, messages, scenes, entities, facts, summaries)
- **Миграции**: Автоматические при запуске

### Real-time: Socket.io
- **Порт**: 8001 (отдельный HTTP сервер)
- **Использование**: WebRTC signaling, чат, real-time updates
- **Сервисы**: `SignalingService` для голосовой связи

### WebRTC: P2P голосовая связь  
- **STUN серверы**: Google Public STUN
- **Архитектура**: Mesh network для небольших групп
- **Signaling**: Socket.io на порту 8001
- **Тестирование**: `/voice-test` страница

## 📦 Основные зависимости

### Frontend
```json
{
  "next": "^15.5.2",
  "react": "^19.1.0", 
  "react-dom": "^19.1.0",
  "socket.io-client": "^4.7.5",
  "typescript": "^5.9.2",
  "tailwindcss": "^3.4.1"
}
```

### Backend
```json
{
  "fastify": "^5.1.0",
  "socket.io": "^4.7.5", 
  "sqlite3": "^5.1.7",
  "typescript": "^5.9.2",
  "ts-node": "^10.9.2",
  "dotenv": "^16.4.5"
}
```

## 🌐 API Endpoints

### DM Agent API
- `POST /api/dm/reply` - Обычный ответ DM агента
- `POST /api/dm/reply-stream` - Стриминговый ответ DM агента  
- `GET /api/dm/tools` - Информация о доступных инструментах
- `POST /api/dm/test` - Тестирование DM агента

### Characters API
- `GET /api/characters` - Список персонажей комнаты
- `POST /api/characters` - Создание нового персонажа
- `GET /api/characters/:id` - Детали персонажа
- `PUT /api/characters/:id` - Обновление персонажа

### Rooms API
- `POST /api/rooms` - Создание новой комнаты
- `GET /api/rooms/:id` - Информация о комнате

### Voice API
- `GET /api/voice/rooms` - Статистика голосовых комнат
- `GET /api/voice/rooms/:id` - Информация о голосовой комнате

## 🔄 Порты и сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| Frontend (Next.js) | 3000 | React приложение |
| Backend API (Fastify) | 8000 | REST API + основная логика |
| Socket.io Server | 8001 | WebRTC signaling + real-time |

## 🛠 Инструменты разработки

### Build & Development
- **Frontend**: `npm run dev` (Next.js development server)
- **Backend**: `pnpm dev` (nodemon + ts-node/esm)
- **Package Manager**: pnpm (для консистентности)
- **TypeScript**: Строгий режим, полная типизация

### Database Tools
- **SQLite**: Файловая база данных
- **Migrations**: Автоматические через `DatabaseService`
- **File Storage**: JSON файлы для персонажей/заметок

### WebRTC Tools
- **Testing**: `/voice-test` страница
- **Debugging**: Browser DevTools Console
- **STUN**: Google Public STUN servers

## 🔒 Environment Variables

### Backend (.env)
```env
# Eliza API
ELIZA_BASE_URL=https://api.eliza.yandex.net/raw
ELIZA_API_KEY=your_api_key_here
ELIZA_MODEL=claude-3-5-sonnet-20241022

# Server Configuration  
PORT=8000
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_PATH=./data/
```

## 📝 Файловая структура данных

### Characters Storage
```
/backend/data/
├── characters_default.json     # Персонажи комнаты "default"
├── characters_[room_id].json   # Персонажи конкретной комнаты
└── ...
```

### Memory Database
```
/backend/data/
├── memory.db                   # Основная база памяти
├── test_memory.db             # Тестовая база
└── ...
```

## 🔧 Deployment Notes

### Production Build
```bash
# Frontend
cd frontend && npm run build

# Backend  
cd backend && npm run build

# Start
npm start
```

### Docker Support
- Готовность: Частичная
- TODO: Создать Dockerfile и docker-compose.yml для продакшена

### Environment Requirements
- **Node.js**: >=18.0.0
- **NPM/PNPM**: Последние версии
- **Browser**: Chrome/Safari с WebRTC поддержкой

---

**Примечание**: Этот документ автоматически обновляется при изменении архитектуры проекта.
