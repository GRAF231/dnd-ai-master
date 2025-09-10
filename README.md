# 🎲 D&D AI Master

Веб-сервис для игры в Dungeons & Dragons с искусственным интеллектом в роли Мастера Подземелий.

## 🚀 О проекте

**D&D AI Master** - это полнофункциональный веб-сервис, который позволяет играть в D&D с ИИ-мастером на базе Claude 3.5 Sonnet. Система поддерживает tool calling для автоматических бросков кубиков, создания персонажей и управления игрой.

### ✨ Основные возможности

- 🎭 **ИИ Мастер Подземелий** - Claude 3.5 Sonnet ведет игру
- 🎲 **Автоматические броски кубиков** - tool calling для d4, d6, d8, d10, d12, d20, d100
- 💬 **Чат в реальном времени** - стриминг ответов и обычный режим
- 🏰 **Игровые комнаты** - создание и присоединение к играм
- 🎨 **Красивый UI** - стилизация в тематике D&D
- 📱 **Адаптивный дизайн** - работает на всех устройствах

## 🏗️ Архитектура

### Frontend
- **React 18** + **Next.js 15** + **TypeScript**
- **TailwindCSS** для стилизации
- **Server-Sent Events** для стриминга
- Адаптивный дизайн с мобильной поддержкой

### Backend  
- **Node.js** + **Fastify** + **TypeScript**
- **OpenRouter API** для интеграции с Claude 3.5 Sonnet
- **Tool Calling система** для игровых инструментов
- RESTful API с поддержкой стриминга

### ИИ Интеграция
- **Claude 3.5 Sonnet** через OpenRouter
- Система tool calling (OpenAI-compatible)
- Контекстная память и обработка истории
- Оптимизированные промпты для D&D

## 📁 Структура проекта

```
dnd-ai-master/
├── backend/                 # Node.js бэкенд
│   ├── src/
│   │   ├── services/
│   │   │   ├── llm/         # ИИ сервисы
│   │   │   └── tools/       # Tool calling инструменты
│   │   ├── routes/          # API маршруты
│   │   └── utils/           # Утилиты
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # React фронтенд
│   ├── src/
│   │   ├── app/             # Next.js страницы и API routes
│   │   ├── components/      # React компоненты
│   │   ├── hooks/           # Пользовательские хуки
│   │   ├── utils/           # Утилиты
│   │   └── types/           # TypeScript типы
│   ├── package.json
│   └── tsconfig.json
├── memory-bank/             # Документация и планирование
├── docker-compose.yml       # Docker конфигурация
└── README.md
```

## 🛠️ Установка и запуск

### Предварительные требования

- Node.js 20+
- pnpm (рекомендуется)
- OpenRouter API ключ

### 1. Клонирование репозитория

```bash
git clone <your-repo-url>
cd dnd
```

### 2. Настройка backend

```bash
cd dnd-ai-master/backend
pnpm install
```

Создайте `.env` файл:
```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
DM_MODEL=anthropic/claude-3.5-sonnet
PORT=3001
```

Запуск:
```bash
pnpm start
```

### 3. Настройка frontend

```bash
cd ../frontend
pnpm install
```

Создайте `.env.local` файл:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Запуск:
```bash
pnpm dev
```

### 4. Docker (альтернативный способ)

```bash
docker-compose up -d
```

## 🎮 Использование

1. Откройте браузер и перейдите на `http://localhost:3000`
2. Создайте новую игровую комнату
3. Введите имя персонажа
4. Начните общение с ИИ-мастером
5. Используйте фразы типа "бросай d20" для автоматических бросков кубиков

## 🔧 API Endpoints

### Backend API (port 3001)

- `GET /api/dm/health` - проверка состояния сервера
- `GET /api/dm/tools` - список доступных инструментов
- `POST /api/dm/reply` - отправка сообщения ИИ (обычный режим)
- `POST /api/dm/reply-stream` - отправка сообщения ИИ (стриминг)
- `POST /api/dm/test-tools` - тестирование tool calling

### Frontend API Routes (proxy)

- `POST /api/dm/reply` - проксирование к backend
- `POST /api/dm/reply-stream` - проксирование стриминга
- `GET /api/dm/tools` - проксирование списка инструментов
- `POST /api/rooms` - создание комнаты
- `GET /api/rooms/[id]` - получение информации о комнате

## 🎲 Tool Calling инструменты

### Текущие инструменты:

- **roll_dice** - броски кубиков (1d20+5, 3d6-2, и т.д.)

### Планируемые инструменты (Phase 5):

- **character_sheet** - создание и управление персонажами
- **save_note** - сохранение игровых заметок  
- **roll_advantage** - броски с преимуществом/недостатком
- **get_rules** - справочная информация по D&D
- **initiative_tracker** - трекер инициативы для боя

## 📋 Статус разработки

- ✅ **Phase 1-3**: Базовая архитектура и ИИ интеграция
- ✅ **Phase 4**: Фронтенд интеграция с tool calling
- ⚡ **Phase 5**: Расширение функционала и улучшение UX/UI

Подробная информация о прогрессе в файле `memory-bank/tasks.md`.

## 🤝 Участие в разработке

1. Форкните репозиторий
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Закоммитьте изменения (`git commit -m 'Add amazing feature'`)
4. Запушьте в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 🐛 Багрепорты и предложения

Используйте GitHub Issues для сообщения о багах и предложений по улучшению.

## 📄 Лицензия

Этот проект использует MIT лицензию. См. файл `LICENSE` для подробностей.

## 🙏 Благодарности

- OpenRouter за предоставление API доступа к Claude 3.5 Sonnet
- Anthropic за создание Claude
- Сообщество D&D за вдохновение

---

**Создано с ❤️ для любителей D&D и ИИ технологий**
