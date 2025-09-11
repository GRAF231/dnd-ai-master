# ЗАДАЧИ ПРОЕКТА AI D&D MASTER

**Дата обновления**: 2025-09-11  
**Текущий режим**: BUILD MODE - Голосовая подсистема  
**Активная задача**: Этап 2 завершен, переход к Этапу 3

## ✅ ЗАВЕРШЕННЫЕ ЗАДАЧИ

### 🎙️ ЭТАП 2: VoiceChat UI Integration (ЗАВЕРШЕН)
**Цель**: Интегрировать голосовую связь в основную игровую комнату

#### ✅ Выполненные компоненты:
- [x] **VoicePanel** - главный компонент голосовой панели
- [x] **useVoiceChat Hook** - извлечен из voice-test с полным функционалом
- [x] **ParticipantItem** - компонент участника с volume controls
- [x] **VolumeSlider** - полнофункциональный слайдер громкости (всегда видимый)
- [x] **VoiceControls** - кнопки управления голосовой связью
- [x] **SpeakingIndicator** - индикаторы активности участников

#### ✅ Функциональность:
- [x] Интеграция в `/room/[id]` без breaking changes
- [x] Volume controls для каждого участника (0-100%)
- [x] Быстрые кнопки громкости (0%, 50%, 100%)
- [x] Персистентность настроек в localStorage
- [x] Мобильная адаптивность с collapsible панелью
- [x] Real-time audio volume управление
- [x] Мute/unmute функциональность
- [x] Speaking indicators с WebRTC integration

#### ✅ Архитектурные решения:
- Использует существующий SignalingService (порт 8001)
- Следует Style Guide цветовой схеме
- Volume state management с автоматическим применением
- Совместимость с Chrome/Safari WebRTC

## 🎯 АКТИВНЫЕ ЗАДАЧИ

### 🔊 ЭТАП 3: TTS Integration (В ПЛАНАХ)
**Цель**: Добавить Text-to-Speech для автоматической озвучки ответов ИИ-мастера
**Время**: 1.5 часа

#### 📋 Компоненты для создания:
- [ ] **TTSManager** - управление TTS providers и кешированием
- [ ] **AzureTTSProvider** - основной TTS провайдер
- [ ] **CacheManager** - кеширование TTS файлов
- [ ] **TTSPlayer** - frontend компонент для воспроизведения
- [ ] Интеграция с DMAgentWithMemoryService

#### 📋 Функциональность:
- [ ] Автоматическая генерация TTS для ответов ИИ-мастера
- [ ] Кеширование TTS файлов (30 дней TTL)
- [ ] Multi-provider поддержка (Azure primary, Google fallback)
- [ ] TTS controls в VoicePanel (вкл/выкл)
- [ ] Priority-based audio mixing

### 🎛️ ЭТАП 4: Audio State Management (В ПЛАНАХ)
**Цель**: Система приоритетов для управления аудио потоками
**Время**: 1 час

#### 📋 Компоненты:
- [ ] **AudioStateManager** - priority-based логика
- [ ] **useAudioState** - frontend audio context
- [ ] Auto-ducking при TTS воспроизведении
- [ ] Smooth transitions между состояниями

## 🔧 ТЕХНИЧЕСКАЯ КОНФИГУРАЦИЯ

### Environment Variables (для Stage 3-4):
```bash
# TTS Configuration
TTS_PROVIDER=azure
TTS_API_KEY=your_api_key_here
TTS_VOICE_DM=en-US-AriaNeural
TTS_CACHE_DIR=./data/tts-cache
TTS_CACHE_TTL=2592000  # 30 days

# Voice Features
VOICE_ENABLED=true
TTS_ENABLED=true
AUTO_TTS_DM=false
MAX_VOICE_PARTICIPANTS=6
```

### API Endpoints (для реализации):
```typescript
GET  /api/voice/status           # Статус голосовой подсистемы
POST /api/voice/rooms/:id/join   # Присоединение к голосовому чату
POST /api/voice/tts/generate     # Ручная генерация TTS
GET  /api/voice/settings         # Пользовательские настройки
PUT  /api/voice/settings         # Обновление настроек
```

## 🧪 ТЕСТИРОВАНИЕ

### ✅ Протестировано (Stage 2):
- [x] Voice connection между участниками
- [x] Volume controls с real-time применением
- [x] localStorage persistence настроек
- [x] Мобильная адаптивность
- [x] WebRTC signaling stability
- [x] UI integration без breaking changes

### 📋 Требует тестирования (Stage 3-4):
- [ ] TTS generation и воспроизведение
- [ ] Audio priority система
- [ ] Auto-ducking функциональность
- [ ] Cache management
- [ ] Multi-browser TTS compatibility

## 🎯 ACCEPTANCE CRITERIA

### ✅ Stage 2 (Завершен):
- [x] 4+ игроков подключаются к голосовому чату
- [x] VoicePanel интегрирована без нарушения UI
- [x] Volume controls для каждого участника
- [x] Настройки сохраняются между сессиями
- [x] Мобильная совместимость

### 📋 Stage 3-4 (Предстоит):
- [ ] ИИ-мастер озвучивает ответы через TTS
- [ ] Audio priority система работает корректно
- [ ] Performance: TTS generation < 3 сек
- [ ] Audio state transitions < 100ms

## 📊 МЕТРИКИ ПРОИЗВОДИТЕЛЬНОСТИ

### ✅ Текущие показатели:
- Voice connection establishment: < 5 секунд ✅
- UI responsiveness: без lag ✅
- Volume control latency: < 50ms ✅
- Memory usage: оптимальное ✅

### 📋 Целевые показатели (Stage 3-4):
- TTS generation: < 3 секунд
- Audio state transitions: < 100ms
- Cache hit rate: > 80%
- Concurrent TTS + Voice: стабильная работа

