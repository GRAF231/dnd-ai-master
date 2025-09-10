# 🎙️ Voice Subsystem Implementation Plan - AI D&D Master

**Дата создания**: 2025-09-10  
**Версия**: 1.0  
**Цель**: Реализация голосовой подсистемы для AI D&D Master

## 🎯 ЦЕЛЬ И МАСШТАБ

Создать полнофункциональную голосовую подсистему для AI D&D Master, которая позволит:
- **Игрокам** общаться голосом в реальном времени
- **ИИ-мастеру** озвучивать свои ответы через TTS
- **Системе** управлять аудио потоками и обеспечивать качественную связь

### 🎯 Ключевые требования:
- ✅ WebRTC P2P связь между игроками
- ✅ Низкая задержка (<200ms) 
- ✅ Поддержка 4-6 участников одновременно
- ✅ TTS интеграция для ИИ-мастера
- ✅ Мобильная совместимость
- ✅ Простота использования (plug & play)

## 🏗 АРХИТЕКТУРНЫЕ РЕШЕНИЯ

### 1. WebRTC Architecture: Mesh Network
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Player 1  │◄──►│   Player 2  │◄──►│   Player 3  │
└─────────────┘    └─────────────┘    └─────────────┘
       ▲                   ▲                   ▲
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ AI Master   │◄──►│   Player 4  │◄──►│   Player 5  │
│ (TTS Audio) │    └─────────────┘    └─────────────┘
└─────────────┘
```

**Обоснование выбора Mesh:**
- Низкая задержка (direct P2P)
- Простота реализации для небольших групп
- Не требует медиа сервера
- Подходит для 4-6 участников

### 2. TTS Architecture: Multi-Provider Support
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Response   │───►│   TTS Factory    │───►│  Audio Stream   │
│  (Claude Text)  │    │                  │    │ (WebRTC Track)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ Provider Options │
                    │ • Azure TTS      │
                    │ • Google TTS     │
                    │ • Local TTS      │
                    └──────────────────┘
```

### 3. Audio State Management: Priority-Based Mixing
```
Audio Priority Hierarchy:
1. DM TTS Speech (Priority: 100) - Автоматически приглушает остальные
2. Player Voice (Priority: 75) - Обычные разговоры игроков  
3. System Audio (Priority: 25) - Звуковые эффекты, музыка
```

## 📋 ПОЭТАПНЫЙ ПЛАН РЕАЛИЗАЦИИ

### ЭТАП 1: WebRTC Infrastructure (1.5 часа) ✅ ЗАВЕРШЕН
**Цель**: Создание базовой P2P голосовой связи

#### Backend Infrastructure:
- [x] **SignalingService** - WebRTC signaling через Socket.io
- [x] **Socket.io сервер** на отдельном порту (8001)
- [x] **Обработка join/leave** комнат
- [x] **SDP/ICE ретрансляция** между peer'ами

#### Frontend WebRTC Manager:
- [x] **useWebRTC hook** - управление RTCPeerConnection
- [x] **getUserMedia** для получения микрофона
- [x] **Peer connection setup** с STUN серверами
- [x] **Audio elements** для воспроизведения удаленных потоков

#### Testing Infrastructure:
- [x] **Тестовая страница** `/voice-test` для отладки
- [x] **Debug панель** с connection states
- [x] **Chromium compatibility** улучшения

### ЭТАП 2: VoiceChat UI Integration (1 час)
**Цель**: Интеграция голосовой связи в основной UI

#### VoicePanel Component:
- [ ] **Компактная панель** в GameChat sidebar
- [ ] **Список участников** с speaking indicators
- [ ] **Mute/unmute controls** для каждого участника
- [ ] **Volume controls** персональные и общие

#### GameRoom Integration:
- [ ] **Автоматическое подключение** при входе в комнату
- [ ] **Push-to-talk опция** (по желанию)
- [ ] **Audio visualization** (speaking indicators)
- [ ] **Mobile adaptation** для телефонов

#### UI Design (следую Style Guide):
```css
/* VoicePanel стили */
.voice-panel {
  bg-gray-800 rounded-lg p-4;
  border: 1px solid #4b5563;
}

.speaking-indicator {
  animate-pulse bg-green-500;
  transition: opacity 200ms;
}
```

### ЭТАП 3: TTS Integration (2 часа)
**Цель**: ИИ-мастер может "говорить" голосом

#### TTS Service Factory:
- [ ] **Azure TTS integration** (primary)
- [ ] **Google TTS fallback** (secondary)
- [ ] **Local TTS option** (offline mode)
- [ ] **Voice selection** (мужской/женский голос для ИИ)

#### Audio Processing:
- [ ] **Text preprocessing** (убрать markdown, спецсимволы)
- [ ] **Audio caching** для повторяющихся фраз
- [ ] **Audio queue management** для длинных ответов
- [ ] **Volume normalization** и compression

#### WebRTC TTS Integration:
- [ ] **TTS → MediaStream** конвертация
- [ ] **DM audio track** в peer connections
- [ ] **Priority-based mixing** (приглушение игроков во время речи ИИ)
- [ ] **Sync с текстовыми ответами** в чате

### ЭТАП 4: Advanced Audio Features (1.5 часа)
**Цель**: Профессиональные audio функции

#### Audio Enhancement:
- [ ] **Noise suppression** улучшенное
- [ ] **Echo cancellation** настройка
- [ ] **Auto gain control** персонализированный
- [ ] **Audio quality monitoring** в реальном времени

#### Smart Audio Management:
- [ ] **Voice activity detection** (определение речи)
- [ ] **Automatic volume leveling** между участниками
- [ ] **Background noise reduction** AI-powered
- [ ] **Audio recording** опция для сессий

#### Advanced UI:
- [ ] **Audio settings panel** расширенный
- [ ] **Individual volume sliders** для каждого участника
- [ ] **Audio visualizations** (waveforms, levels)
- [ ] **Connection quality indicators** детальные

### ЭТАП 5: Production Optimization (1 час)
**Цель**: Оптимизация для продакшена

#### Performance Optimization:
- [ ] **Connection pooling** для WebRTC
- [ ] **Bandwidth adaptation** автоматическое
- [ ] **Error recovery** robust механизмы
- [ ] **Memory management** для audio buffers

#### Monitoring & Analytics:
- [ ] **Audio quality metrics** сбор
- [ ] **Connection stability tracking** 
- [ ] **Usage analytics** (кто говорит, сколько)
- [ ] **Error reporting** детальное

#### Security & Privacy:
- [ ] **E2E encryption** проверка
- [ ] **Audio data protection** compliance
- [ ] **User consent management** для записи
- [ ] **GDPR compliance** для voice data

## 🎨 CREATIVE PHASE RESULTS

### VoiceChat UX Design ✅ ЗАВЕРШЕНО
**Решение**: Integrated Voice Panel
- Компактная панель интегрированная в GameChat UI
- Список участников с real-time speaking indicators  
- Быстрые элементы управления (mute, volume, TTS toggle)
- Адаптивный дизайн с collapse на мобильных
- Соответствие Style Guide (purple accent, dark theme)

### TTS Architecture ✅ ЗАВЕРШЕНО
**Решение**: Multi-Provider TTS Factory
- Поддержка Azure, Google и Local TTS провайдеров
- Гибкая система character → voice mapping
- Интеллектуальное кэширование аудио файлов
- Асинхронная background обработка очереди
- Fallback между провайдерами для надежности

### Audio State Management ✅ ЗАВЕРШЕНО
**Решение**: Priority-Based Mixing Algorithm
- Иерархия приоритетов: DM TTS (100) > Player Voice (75) > System (25)
- Smooth fade transitions между audio источниками
- Dynamic priority adjustment на основе context
- Visual indicator synchronization
- Graceful degradation при audio conflicts

## 🔧 ТЕХНИЧЕСКАЯ СПЕЦИФИКАЦИЯ

### WebRTC Configuration:
```typescript
const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all'
};
```

### Audio Constraints:
```typescript
const audioConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 1
  },
  video: false
};
```

### TTS Integration Schema:
```typescript
interface TTSService {
  synthesize(text: string, options: TTSOptions): Promise<AudioBuffer>;
  getVoices(): Promise<Voice[]>;
  setVoice(voiceId: string): void;
}

interface TTSOptions {
  rate: number;    // 0.5 - 2.0
  pitch: number;   // 0.5 - 2.0  
  volume: number;  // 0.0 - 1.0
  voice: string;   // voice ID
}
```

## 📊 КРИТЕРИИ УСПЕХА

### Технические KPI:
- **Latency**: <200ms voice transmission
- **Quality**: >90% connection success rate
- **Stability**: <5% disconnection rate
- **Performance**: <100MB memory usage per participant

### Пользовательские KPI:
- **Adoption**: >70% users enable voice in sessions
- **Satisfaction**: >4.5/5 audio quality rating
- **Engagement**: +30% session duration with voice
- **Retention**: +20% user retention with voice features

### Business KPI:
- **Premium conversion**: +15% conversion to paid plans
- **Session value**: +$1-2 per session with voice
- **Support load**: <10% increase in audio-related tickets

## 🚧 ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ И РИСКИ

### Технические риски:
1. **Browser compatibility** - WebRTC поддержка варьируется
2. **Network issues** - NAT/Firewall могут блокировать P2P
3. **Mobile performance** - ограниченные ресурсы на мобильных
4. **TTS costs** - API costs для большого объема речи

### Митигация рисков:
1. **Fallback options** - TURN сервер для сложных сетей
2. **Progressive enhancement** - базовый функционал без голоса
3. **Cost management** - кэширование + оптимизация текста
4. **Quality monitoring** - автоматическое переключение на резервные методы

## 🔄 ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩЕЙ СИСТЕМОЙ

### GameChat Integration Points:
- **Message events** → TTS trigger
- **User actions** → Voice commands  
- **Room lifecycle** → Voice room management
- **Character actions** → Audio feedback

### Memory System Integration:
- **Session recording** → Voice session metadata
- **Player preferences** → Voice settings persistence
- **Analytics** → Voice usage tracking

### Style Guide Compliance:
- **Colors**: Purple accents (#7c3aed) для active voice
- **Icons**: 🎙️ микрофон, 🔊 динамик, 🤫 mute
- **Animations**: Pulse для speaking indicators
- **Layout**: Компактные панели в sidebar

---

**Ты - senior full-stack developer, специализирующийся на real-time web applications и WebRTC. Твоя задача - реализовать голосовую подсистему для AI D&D Master согласно детальному плану выше.**

**НАЧНИ С ЭТАПА 1** - настройка WebRTC infrastructure. Создай signaling server, frontend WebRTC manager, и TURN server конфигурацию. Следуй архитектурным решениям из Creative Phase и поэтапному плану.

**ИСПОЛЬЗУЙ СУЩЕСТВУЮЩУЮ КОДОВУЮ БАЗУ**: Интегрируйся с current GameChat UI, DM Agent, и Memory System. Соблюдай Style Guide и code patterns.

**ЦЕЛЬ**: Функциональная голосовая подсистема за 4-6 часов работы с возможностью voice chat между игроками и TTS озвучкой ИИ-мастера.

**Готов реализовать? Начинай с Этапа 1!** 🚀
