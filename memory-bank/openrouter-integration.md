# 🔗 OPENROUTER ИНТЕГРАЦИЯ - СПРАВОЧНАЯ ИНФОРМАЦИЯ

## ⚠️ ВАЖНОЕ ПРАВИЛО
**ПРИ ЛЮБЫХ ВОПРОСАХ ПО API OPENROUTER - ОБЯЗАТЕЛЬНО СПРАШИВАТЬ У ПОЛЬЗОВАТЕЛЯ, НЕ ГАДАТЬ!**

## 🎯 ОСНОВНЫЕ ПАРАМЕТРЫ ПОДКЛЮЧЕНИЯ

### Базовая конфигурация:
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://your-site-url.com', // Опционально
    'X-Title': 'AI D&D Master', // Опционально
  },
});
```

### Модель Claude 3.5 Sonnet:
```json
{
  "model": "anthropic/claude-3.5-sonnet"
}
```

## 🔧 КОНФИГУРАЦИЯ ОКРУЖЕНИЯ

### Переменные .env:
```env
# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Опциональные заголовки
SITE_URL=https://your-domain.com
SITE_NAME=AI D&D Master

# Настройки API
API_TIMEOUT=30000
LOG_API_REQUESTS=true
MAX_RETRIES=3
```

## 📡 STREAMING RESPONSES

### Базовый streaming:
```typescript
const response = await openai.chat.completions.create({
  model: 'anthropic/claude-3.5-sonnet',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
});

// Обработка SSE
for await (const chunk of response) {
  const content = chunk.choices[0]?.delta?.content;
  if (content) {
    console.log(content);
  }
}
```

### Важные детали streaming:
- OpenRouter отправляет комментарии `: OPENROUTER PROCESSING` для предотвращения таймаутов
- Можно игнорировать согласно SSE specs
- Поддерживается отмена через AbortController

## 🛠️ TOOL CALLING

### Определение инструментов:
```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "roll_dice",
        "description": "Бросить игральные кубы для D&D",
        "parameters": {
          "type": "object",
          "properties": {
            "formula": {
              "type": "string",
              "description": "Формула броска (например: '1d20+3', '2d6')"
            }
          },
          "required": ["formula"]
        }
      }
    }
  ]
}
```

### Обработка tool calls:
```typescript
// 1. Отправка с tools
const response = await openai.chat.completions.create({
  model: 'anthropic/claude-3.5-sonnet',
  messages: messages,
  tools: tools
});

// 2. Проверка tool_calls в ответе
if (response.choices[0].message.tool_calls) {
  // Выполнить локально и добавить результат в messages
  for (const toolCall of response.choices[0].message.tool_calls) {
    const result = await executeToolLocally(toolCall);
    messages.push({
      role: "tool",
      tool_call_id: toolCall.id,
      content: JSON.stringify(result)
    });
  }
  
  // 3. Повторный запрос с результатами
  const finalResponse = await openai.chat.completions.create({
    model: 'anthropic/claude-3.5-sonnet',
    messages: messages,
    tools: tools // Обязательно включать tools в каждый запрос
  });
}
```

## 🎮 СПЕЦИФИКА ДЛЯ D&D МАСТЕРА

### Планируемые инструменты:
1. **roll_dice** - броски кубов
2. **get_entity** - информация о персонажах/локациях
3. **update_fact** - обновление фактов о мире
4. **create_npc** - создание NPC

### Промпт для DM:
```typescript
const dmSystemPrompt = `Ты опытный мастер D&D, ведущий увлекательную кампанию.
- Описывай сцены кратко но образно (3-6 предложений)
- Используй инструменты для бросков кубов
- Подстраивайся под стиль группы
- Помни контекст и последствия действий
- Не раскрывай закулисную информацию
- Создавай живых, запоминающихся NPC
- Поддерживай напряжение и интригу`;
```

## 🔄 ПАРАМЕТРЫ УПРАВЛЕНИЯ

### Tool choice:
```json
// Автоматический выбор (по умолчанию)
{ "tool_choice": "auto" }

// Запрет использования tools
{ "tool_choice": "none" }

// Принудительное использование конкретного tool
{
  "tool_choice": {
    "type": "function", 
    "function": {"name": "roll_dice"}
  }
}
```

### Parallel tool calls:
```json
// Разрешить параллельные вызовы (по умолчанию)
{ "parallel_tool_calls": true }

// Только последовательные вызовы
{ "parallel_tool_calls": false }
```

## 📊 ЭКОНОМИКА

### Стоимость Claude 3.5 Sonnet через OpenRouter:
- Обычно дешевле прямого доступа к Anthropic
- Точные цены уточнять на openrouter.ai
- Биллинг идет через OpenRouter, не напрямую

## 🔍 ОТЛАДКА И МОНИТОРИНГ

### Логирование запросов:
```typescript
// Добавить в middleware
if (process.env.LOG_API_REQUESTS === 'true') {
  console.log('OpenRouter Request:', {
    model: request.model,
    messages: request.messages.length,
    tools: request.tools?.length || 0,
    timestamp: new Date().toISOString()
  });
}
```

### Обработка ошибок:
```typescript
try {
  const response = await openai.chat.completions.create(request);
  return response;
} catch (error) {
  console.error('OpenRouter API Error:', error);
  // Здесь может быть fallback логика
  throw error;
}
```

## ⚠️ ВАЖНЫЕ ОГРАНИЧЕНИЯ И ОСОБЕННОСТИ

1. **Tools parameter**: Должен быть включен в каждый запрос (шаги 1 и 3)
2. **Streaming cancellation**: Поддерживается через AbortController
3. **Rate limiting**: Следовать рекомендациям OpenRouter
4. **Headers**: HTTP-Referer и X-Title опциональны но полезны для рейтингов

## 🎯 ПЛАН ИНТЕГРАЦИИ НА ДЕНЬ 3-4

1. Добавить OpenAI SDK в бэкенд
2. Создать OpenRouter service с конфигурацией
3. Реализовать базового DM агента
4. Добавить streaming в чат
5. Реализовать первый tool (roll_dice)
6. Протестировать интеграцию

**НАПОМИНАНИЕ**: При любых неясностях по API - спрашивать у пользователя, не додумывать!
