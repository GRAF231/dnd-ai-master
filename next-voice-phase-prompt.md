# 🎙️ AI D&D MASTER - VOICE SUBSYSTEM STAGE 3-4

## 📊 ТЕКУЩИЙ СТАТУС ПРОЕКТА

**Дата**: 2025-09-11  
**Проект**: AI D&D Master Service  
**Режим**: BUILD MODE  
**Задача**: Голосовая подсистема - Этапы 3-4 TTS & Audio State Management (2.5 часа)

## ✅ ЭТАПЫ 1-2 ЗАВЕРШЕНЫ УСПЕШНО

### 🎯 ДОСТИГНУТЫЕ РЕЗУЛЬТАТЫ:
- ✅ **WebRTC Infrastructure** - полнофункциональный signaling на Socket.io 
- ✅ **VoicePanel Integration** - голосовая панель в основной игровой комнате
- ✅ **Volume Controls** - слайдеры громкости для каждого участника (всегда видимые)
- ✅ **Persistent Settings** - настройки сохраняются в localStorage
- ✅ **Mobile Responsive** - адаптивный UI с collapsible панелью
- ✅ **Real-time Audio** - мгновенное применение volume changes

### 🔧 ТЕХНИЧЕСКАЯ АРХИТЕКТУРА:
```
Реализованные компоненты:
- Backend: SignalingService.ts (Socket.io сервер на порту 8001)
- Frontend: VoicePanel.tsx (интегрирован в /room/[id])
- Hooks: useVoiceChat.ts (полный state management)
- Components: VolumeSlider, ParticipantItem, VoiceControls, SpeakingIndicator
- Features: Volume controls (0-100%), quick buttons, mute/unmute
```

### 📋 ПРОТЕСТИРОВАНО И РАБОТАЕТ:
- ✅ Голосовая связь между участниками в игровых комнатах
- ✅ Volume controls с real-time применением
- ✅ localStorage persistence настроек громкости
- ✅ Мобильная адаптивность
- ✅ UI integration без breaking changes

## 🎯 ЗАДАЧИ ДЛЯ РЕАЛИЗАЦИИ

Реализовать **ЭТАПЫ 3-4** голосовой подсистемы:

### **ЭТАП 3: TTS Integration** (1.5 часа)
**Цель**: Добавить Text-to-Speech для автоматической озвучки ответов ИИ-мастера

### **ЭТАП 4: Audio State Management** (1 час)  
**Цель**: Система приоритетов и управления аудио состояниями

## 🏗️ ДЕТАЛЬНЫЙ ПЛАН РЕАЛИЗАЦИИ

### **ЭТАП 3: TTS Integration** ⏱️ 1.5 часа

#### 🎯 Цель:
Добавить систему Text-to-Speech для автоматической озвучки ответов ИИ-мастера с кешированием и multi-provider поддержкой.

#### 📋 Backend Components:

**1. TTS Manager**
```typescript
// /backend/src/services/voice/TTSManager.ts
class TTSManager {
  private providers: Map<string, TTSProvider>;
  private cacheManager: CacheManager;
  
  async generateTTS(
    text: string, 
    characterId: string = 'dm-master',
    priority: 'immediate' | 'background' = 'background'
  ): Promise<ArrayBuffer>;
  
  async playTTSInRoom(roomId: string, audioBuffer: ArrayBuffer): Promise<void>;
  private async cleanText(text: string): Promise<string>; // Убирает markdown, эмодзи
}
```

**2. TTS Providers**
```typescript
// /backend/src/services/voice/providers/
├── BaseTTSProvider.ts       # Базовый интерфейс
├── AzureTTSProvider.ts      # Azure Cognitive Services (primary)
├── GoogleTTSProvider.ts     # Google Cloud TTS (fallback)  
└── LocalTTSProvider.ts      # Web Speech API (offline fallback)
```

**3. Cache Manager**
```typescript
// /backend/src/services/voice/CacheManager.ts
class CacheManager {
  private cacheDir: string = './data/tts-cache';
  
  async get(key: string): Promise<ArrayBuffer | null>;
  async set(key: string, data: ArrayBuffer, ttl?: number): Promise<void>;
  generateCacheKey(text: string, voice: string, provider: string): string;
  async cleanup(): Promise<void>; // Удаление expired files
}
```

#### 🔗 Integration с DM Agent:
```typescript
// Расширить DMAgentWithMemoryService
interface DMResponse {
  content: string;
  audioBuffer?: ArrayBuffer;  // Новое поле
  toolCalls?: ToolCall[];
  ttsGenerated?: boolean;
}

// Добавить TTS generation в processMessage
if (config.autoTTS && shouldGenerateTTS(response.content)) {
  try {
    response.audioBuffer = await ttsManager.generateTTS(
      response.content, 
      'dm-master',
      'immediate'
    );
    response.ttsGenerated = true;
  } catch (error) {
    console.warn('TTS generation failed:', error);
  }
}
```

#### 🎵 Frontend TTS Player:
```typescript
// /frontend/src/components/VoiceChat/TTSPlayer.tsx
interface TTSPlayerProps {
  audioBuffer?: ArrayBuffer;
  isPlaying: boolean;
  volume: number;
  onPlayComplete: () => void;
  priority: 'high' | 'normal';
}

// /frontend/src/hooks/useTTSPlayer.ts
interface TTSPlayerHook {
  playTTS: (audioBuffer: ArrayBuffer, priority?: string) => Promise<void>;
  stopTTS: () => void;
  isPlaying: boolean;
  queue: TTSQueueItem[];
}
```

#### ✅ Критерии готовности Этапа 3:
- [ ] TTSManager с Azure + Google providers
- [ ] Cache система с автоматической очисткой (TTL 30 дней)
- [ ] DM Agent автоматически генерирует TTS для ответов
- [ ] Frontend TTSPlayer компонент с queue системой
- [ ] TTS controls в VoicePanel (включить/выключить автоозвучку)
- [ ] Graceful fallback при недоступности TTS API

---

### **ЭТАП 4: Audio State Management** ⏱️ 1 час

#### 🎯 Цель:
Реализовать систему приоритетов для управления одновременными аудио потоками с auto-ducking и smooth transitions.

#### 📋 Audio State Manager:
```typescript
// /backend/src/services/voice/AudioStateManager.ts
enum AudioPriority {
  DM_TTS = 100,           // Высший приоритет - ИИ-мастер говорит
  PLAYER_VOICE = 75,      // Голос игроков
  SYSTEM_SOUND = 25,      // Системные звуки (dice rolls)
  BACKGROUND = 10         // Фоновые звуки
}

interface AudioSource {
  id: string;
  type: 'voice' | 'tts' | 'system';
  priority: AudioPriority;
  volume: number;
  isActive: boolean;
  roomId: string;
}

class AudioStateManager {
  private audioSources: Map<string, AudioSource>;
  private roomStates: Map<string, AudioRoomState>;
  
  async handleAudioEvent(roomId: string, event: AudioEvent): Promise<void>;
  private calculateNewState(event: AudioEvent): AudioRoomState;
  private async transitionToState(roomId: string, newState: AudioRoomState): Promise<void>;
  private async applyAutoDucking(roomId: string): Promise<void>;
}
```

#### 🔊 Frontend Audio Context:
```typescript
// /frontend/src/hooks/useAudioState.ts
interface AudioState {
  dmSpeaking: boolean;
  dmTTSPlaying: boolean;
  playersSpeaking: string[];
  volumes: Map<string, number>;
  currentPriority: AudioPriority;
  isDucked: boolean;
}

interface AudioStateHook {
  audioState: AudioState;
  updateAudioState: (newState: Partial<AudioState>) => void;
  applyAutoDucking: (priority: AudioPriority) => void;
  restoreVolumes: () => void;
}

// Auto-ducking logic:
// - При TTS: уменьшаем voice volume на 60%
// - При important system sounds: уменьшаем на 30%
// - Smooth fade in/out transitions (200ms)
```

#### 🎚️ Enhanced VoicePanel:
```typescript
// Обновить VoicePanel с audio state controls
interface VoicePanelProps {
  roomId: string;
  playerName: string;
  audioSettings?: {
    autoTTS: boolean;
    autoDucking: boolean;
    duckingLevel: number; // 0-100%
  };
}

// Новые controls в панели:
// - Toggle автоозвучки ИИ-мастера
// - Toggle auto-ducking
// - Slider уровня ducking
// - Master volume для TTS
```

#### ✅ Критерии готовности Этапа 4:
- [ ] AudioStateManager с priority-based логикой
- [ ] Smooth transitions между аудио состояниями (fade in/out 200ms)
- [ ] Auto-ducking: снижение voice volume при TTS на 60%
- [ ] Real-time синхронизация visual indicators
- [ ] Audio settings в VoicePanel (auto-ducking controls)
- [ ] Graceful handling аудио конфликтов и edge cases

## 🔧 ТЕХНИЧЕСКАЯ КОНФИГУРАЦИЯ

### Environment Variables:
```bash
# TTS Configuration (добавить в .env)
TTS_PROVIDER=azure
TTS_API_KEY=your_azure_key_here
TTS_REGION=eastus
TTS_VOICE_DM=en-US-AriaNeural
TTS_VOICE_FEMALE=en-US-JennyNeural
TTS_VOICE_MALE=en-US-DavisNeural

# Google TTS Fallback
GOOGLE_TTS_API_KEY=your_google_key_here
GOOGLE_TTS_VOICE=en-US-Standard-C

# TTS Caching
TTS_CACHE_DIR=./data/tts-cache
TTS_CACHE_TTL=2592000  # 30 days
TTS_CACHE_MAX_SIZE=1GB

# Audio Features
VOICE_ENABLED=true
TTS_ENABLED=true
AUTO_TTS_DM=false  # Опциональная авто-генерация
AUTO_DUCKING_ENABLED=true
DUCKING_LEVEL=60   # Процент снижения при ducking
MAX_VOICE_PARTICIPANTS=6
```

### API Endpoints (добавить):
```typescript
// Новые endpoints для TTS и audio management
POST /api/voice/tts/generate     # Ручная генерация TTS
GET  /api/voice/tts/cache-stats  # Статистика кеша
DELETE /api/voice/tts/cache      # Очистка кеша
GET  /api/voice/audio-state/:roomId  # Текущее состояние аудио в комнате
POST /api/voice/audio-state/:roomId  # Обновление audio state
GET  /api/voice/settings/:playerId   # Персональные настройки игрока
PUT  /api/voice/settings/:playerId   # Обновление настроек
```

## 🧪 ТЕСТИРОВАНИЕ

### Testing Strategy:
1. **Unit Tests**: TTS providers, AudioStateManager, TTSPlayer
2. **Integration Tests**: End-to-end TTS + voice chat + auto-ducking
3. **Manual Testing**: 
   - 3+ игрока + ИИ-мастер с TTS
   - Одновременное говорение + TTS
   - Mobile devices TTS playback
   - Audio priority switching

### Test Scenarios:
```typescript
// Основные сценарии для тестирования:
1. ИИ-мастер генерирует TTS → auto-ducking voice participants
2. Игрок говорит во время TTS → pause TTS, resume after
3. Multiple TTS requests → queue system
4. Network failure during TTS → graceful fallback
5. Cache hit/miss scenarios
6. Mobile TTS autoplay restrictions
```

## ⚠️ ИЗВЕСТНЫЕ CHALLENGES

### 1. TTS Latency & Caching
**Проблема**: Задержка генерации TTS может нарушать flow игры
**Решение**: 
- Aggressive caching с предиктивной генерацией
- Fallback to text если TTS недоступен > 3 сек
- Background generation для common phrases

### 2. Mobile TTS Autoplay  
**Проблема**: Mobile browsers блокируют autoplay
**Решение**:
- User gesture detection
- "Tap to enable TTS" промпт
- Graceful degradation to text-only

### 3. Audio Mixing Complexity
**Проблема**: Управление multiple audio streams
**Решение**:
- Web Audio API context management
- Priority-based mixing
- Hardware volume control integration

## 🎯 ACCEPTANCE CRITERIA

### MVP Success Criteria:
- [ ] ИИ-мастер автоматически озвучивает ответы через TTS
- [ ] TTS cache обеспечивает < 1 сек latency для repeated phrases
- [ ] Auto-ducking работает корректно при TTS playback
- [ ] Audio settings сохраняются per-player
- [ ] Все текстовые функции работают параллельно с TTS
- [ ] Mobile compatibility для TTS (с user gesture)

### Advanced Success Criteria:
- [ ] Multiple TTS voices для разных персонажей
- [ ] Predictive TTS generation для common responses
- [ ] Advanced audio mixing с Web Audio API
- [ ] Real-time audio level visualization
- [ ] Custom ducking profiles per player

### Performance Metrics:
- TTS generation: < 3 секунд для typical responses  
- TTS cache hit rate: > 80% после warming
- Audio state transitions: < 100ms
- Memory usage: < 50MB TTS cache per session
- CPU usage: < 10% during active TTS playback

## 📋 INTEGRATION REQUIREMENTS

### Существующие системы:
- **VoicePanel**: Добавить TTS controls без breaking UI
- **GameChat**: Интеграция TTS playback с message display
- **DM Agent**: Seamless TTS generation в response pipeline
- **Memory System**: Опциональное логирование TTS activity

### Backward Compatibility:
- TTS - полностью опциональная feature
- Existing voice chat работает без изменений
- Graceful degradation при отсутствии TTS API keys
- Settings migration для existing users

## 🚀 DEPLOYMENT CHECKLIST

### Pre-deployment:
- [ ] Azure TTS API keys настроены и протестированы
- [ ] Google TTS fallback keys настроены
- [ ] TTS cache директория создана с правильными permissions
- [ ] Environment variables добавлены в production .env
- [ ] Audio device permissions на production домене

### Post-deployment:
- [ ] TTS cache warming для common phrases
- [ ] Monitoring TTS API quotas и usage
- [ ] Performance monitoring audio mixing
- [ ] User feedback collection для TTS quality

## 📝 ФИНАЛЬНЫЙ ПРОМПТ ДЛЯ РЕАЛИЗАЦИИ

**Ты - senior full-stack developer, специализирующийся на React + TypeScript, Node.js и Audio API. Твоя задача - реализовать ЭТАПЫ 3-4 голосовой подсистемы для AI D&D Master.**

**НАЧНИ С ЭТАПА 3** - создай TTS систему с Azure provider, кешированием и интеграцией в DM Agent. Затем реализуй Audio State Management с auto-ducking.

**СОБЛЮДАЙ АРХИТЕКТУРУ**: 
- Используй существующую VoicePanel и useVoiceChat
- Интегрируйся с DMAgentWithMemoryService без breaking changes
- Следуй Style Guide и patterns проекта
- Поддерживай mobile compatibility

**ПОЭТАПНЫЙ ПОДХОД**:
1. Сначала TTS Backend (TTSManager + providers + cache)
2. Затем TTS Frontend (TTSPlayer + controls)  
3. DM Agent integration для auto-TTS
4. Audio State Management с auto-ducking
5. Testing и polish

**ЦЕЛЬ**: Полнофункциональная TTS система с автоозвучкой ИИ-мастера и intelligent audio state management.

**Готов к Этапу 3?** 🚀
