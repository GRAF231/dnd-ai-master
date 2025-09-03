# 🎲 AI D&D Master Service

MVP веб-сервиса для D&D с ИИ-мастером на базе Claude 3.5 Sonnet.

## 🚀 Быстрый старт

### Требования
- Node.js 20+
- Docker & Docker Compose
- Anthropic API ключ

### Запуск разработки
```bash
# Клонировать и установить зависимости
npm install

# Запустить в dev режиме
docker-compose up -d

# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

## 🏗️ Архитектура
- **Frontend**: Next.js + TypeScript + TailwindCSS
- **Backend**: Node.js + Fastify + SQLite
- **AI**: Claude 3.5 Sonnet + GPT-4o-mini
- **Voice**: WebRTC mesh + coturn

## 📋 План разработки
1. **День 1-2**: Базовая инфраструктура ✅
2. **День 3-4**: ИИ-интеграция и чат
3. **День 5-6**: Система памяти
4. **День 7-9**: WebRTC голос
5. **День 10-12**: Персональные ассистенты
6. **День 13-15**: Полировка и тестирование

## 💰 Стоимость MVP
- Инфраструктура: €13/мес
- API расходы: ~$48/мес
- **Общий бюджет**: ~€60/мес

## 🔗 API Конфигурация

### Сторонний API Сервис
Проект использует **сторонний сервис** для доступа к Claude 3.5 Sonnet, который полностью совместим с Anthropic API.

#### Настройка:
1. Получите API ключ для стороннего сервиса
2. Укажите базовый URL сервиса в `.env`:
   ```env
   ANTHROPIC_API_KEY=your_key_here
   ANTHROPIC_BASE_URL=https://your-proxy-service.com/v1
   ```

#### Совместимость:
- Используется стандартная библиотека `@anthropic-ai/sdk`
- Все методы API остаются идентичными
- Изменяется только точка подключения

#### Fallback:
При недоступности стороннего сервиса можно быстро переключиться на оригинальный Anthropic API, изменив только `ANTHROPIC_BASE_URL`.
