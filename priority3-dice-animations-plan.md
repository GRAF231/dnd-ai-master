# 🎲 PRIORITY 3: DICE ANIMATIONS PLAN

## 🎯 ЦЕЛЬ
Создать красивые анимации кубиков для интеграции с существующей системой tool calling

## 📋 ТЕКУЩЕЕ СОСТОЯНИЕ
- ✅ DiceRoller tool работает и возвращает результаты
- ✅ AdvancedDice tool поддерживает advantage/disadvantage
- ✅ GameChat отображает tool call результаты
- ✅ Frontend получает tool calls от backend

## 🎨 АРХИТЕКТУРНОЕ РЕШЕНИЕ (из Creative Phase)
**Гибридный подход**: CSS анимации + SVG эффекты
- CSS для базовых анимаций (производительность)
- SVG для критических результатов (красота)
- Цветовое кодирование по style guide
- Опциональные звуковые эффекты

## 🚀 ПЛАН РЕАЛИЗАЦИИ (1-1.5 часа)

### ЭТАП 1: DiceAnimation компонент (30 мин)
```typescript
// frontend/src/components/DiceAnimation/DiceAnimation.tsx
interface DiceAnimationProps {
  type: 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
  result: number;
  maxValue: number;
  isRolling: boolean;
  onComplete?: () => void;
}
```

**Функциональность:**
- Анимация вращения кубика (CSS keyframes)
- Показ финального результата
- Цветовое кодирование:
  - Критический успех (max value): золотой
  - Критическая неудача (1): красный
  - Обычный результат: белый/серый

### ЭТАП 2: CSS анимации (20 мин)
```css
.dice-animation {
  /* 3D вращение кубика */
  animation: diceRoll 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform-style: preserve-3d;
}

@keyframes diceRoll {
  0% { transform: rotateX(0) rotateY(0) rotateZ(0); }
  25% { transform: rotateX(180deg) rotateY(180deg) rotateZ(90deg); }
  50% { transform: rotateX(360deg) rotateY(360deg) rotateZ(180deg); }
  75% { transform: rotateX(540deg) rotateY(540deg) rotateZ(270deg); }
  100% { transform: rotateX(720deg) rotateY(720deg) rotateZ(360deg); }
}
```

### ЭТАП 3: SVG эффекты для критических результатов (20 мин)
```typescript
// Компонент для критических эффектов
const CriticalEffect = ({ type }: { type: 'success' | 'failure' }) => {
  // SVG частицы, искры, лучи света
}
```

### ЭТАП 4: Интеграция с GameChat (15 мин)
```typescript
// Обновить MessageComponent для отображения анимаций
const renderToolCall = (toolCall: ToolCallResult) => {
  if (toolCall.name === 'roll_dice' || toolCall.name === 'advanced_dice') {
    return <DiceAnimationDisplay toolCall={toolCall} />;
  }
  // ... остальные tool calls
}
```

### ЭТАП 5: Звуковые эффекты (опционально, 10 мин)
```typescript
// Простые звуки через Web Audio API
const playDiceSound = (result: number, maxValue: number) => {
  if (result === maxValue) playSound('critical-success.mp3');
  else if (result === 1) playSound('critical-failure.mp3');
  else playSound('dice-roll.mp3');
}
```

## 📊 ФАЙЛЫ ДЛЯ СОЗДАНИЯ/ИЗМЕНЕНИЯ

### Новые файлы:
- `frontend/src/components/DiceAnimation/DiceAnimation.tsx`
- `frontend/src/components/DiceAnimation/DiceAnimation.module.css`
- `frontend/src/components/DiceAnimation/index.ts`

### Изменения в существующих файлах:
- `frontend/src/components/GameChat/GameChat.tsx` - интеграция анимаций
- `frontend/src/types/index.ts` - типы для анимаций

## 🎯 КРИТЕРИИ ГОТОВНОСТИ

### Базовая функциональность:
- [ ] DiceAnimation компонент создан
- [ ] CSS анимации работают
- [ ] Интеграция с tool calls
- [ ] Цветовое кодирование результатов

### Расширенная функциональность:
- [ ] SVG эффекты для критических результатов
- [ ] Анимации для advantage/disadvantage
- [ ] Звуковые эффекты (опционально)
- [ ] Мобильная адаптация

### Тестирование:
- [ ] Анимации работают с DiceRoller tool
- [ ] Анимации работают с AdvancedDice tool
- [ ] Производительность на мобильных устройствах
- [ ] Accessibility (motion-reduce поддержка)

## 🚀 ПРОМПТ ДЛЯ СЛЕДУЮЩЕЙ СЕССИИ

```
Привет! Продолжаю разработку AI D&D Master проекта.

СТАТУС: Phase 5 - Приоритет 3: Анимации кубиков

ЗАДАЧА: Создать красивые анимации кубиков для интеграции с tool calling системой

ПЛАН РАБОТЫ (1-1.5 часа):
1. Создать DiceAnimation компонент с CSS анимациями
2. Добавить цветовое кодирование (критические результаты) 
3. Интегрировать с GameChat для отображения tool calls
4. Добавить SVG эффекты для критических результатов
5. Протестировать с существующими dice tools

ФАЙЛЫ ДЛЯ КОНТЕКСТА:
- frontend/src/components/GameChat/GameChat.tsx (существующий UI)
- backend/src/services/tools/diceRoller.ts (dice tool)
- backend/src/services/tools/advancedDice.ts (advanced dice tool)
- memory-bank/style-guide.md (цвета и стили)

АРХИТЕКТУРА: Гибридный подход CSS + SVG
- CSS для базовых анимаций (производительность)
- SVG для критических эффектов (красота)
- Интеграция с существующей tool calling системой

ЦЕЛЬ: Красивые анимации кубиков, которые автоматически запускаются при tool calls!
```

## ✅ ГОТОВО К СТАРТУ ПРИОРИТЕТА 3!
