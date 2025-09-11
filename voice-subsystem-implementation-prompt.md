# 🎙️ ПРОМПТ ДЛЯ РЕАЛИЗАЦИИ: ГОЛОСОВАЯ ПОДСИСТЕМА AI D&D MASTER

## 📊 ТЕКУЩИЙ СТАТУС ПРОЕКТА

**Дата**: 2025-01-09  
**Проект**: AI D&D Master Service  
**Режим**: IMPLEMENT MODE  
**Задача**: Голосовая подсистема (Level 4, 4-6 часов)

## ✅ ЗАВЕРШЕННЫЕ ЭТАПЫ

### 🎯 ПЛАНИРОВАНИЕ ЗАВЕРШЕНО
- Архитектурный анализ Level 4 системы выполнен
- Технологический стек определен (WebRTC + TTS + Socket.io)
- Поэтапный план из 4 этапов создан (5 часов работы)
- Challenges & mitigations задокументированы

### 🎨 CREATIVE PHASES ЗАВЕРШЕНЫ
**1. VoiceChat UI Design** ✅
- **Решение**: Integrated Voice Panel
- **Описание**: Компактная панель интегрированная в GameChat UI с real-time speaking indicators

**2. TTS Architecture** ✅
- **Решение**: Multi-Provider TTS Factory  
- **Описание**: Поддержка множественных TTS провайдеров с интеллектуальным кэшированием

**3. Audio State Management** ✅
- **Решение**: Priority-Based Mixing Algorithm
- **Описание**: Иерархия приоритетов с smooth transitions между audio источниками

## 🎯 ЗАДАЧА ДЛЯ РЕАЛИЗАЦИИ

### Цель:
Реализовать полнофункциональную голосовую подсистему для AI D&D Master, включающую WebRTC P2P голосовую связь между игроками и TTS озвучку ИИ-мастера.

### Ожидаемый результат:
4-5 игроков могут общаться голосом во время D&D сессии с ИИ-мастером, который помнит всю историю кампании и может озвучивать свои ответы через TTS.

## 🏗️ АРХИТЕКТУРА ДЛЯ РЕАЛИЗАЦИИ

### Frontend Components:
```
/frontend/src/components/VoiceChat/
├── VoicePanel.tsx           # Главная панель голосового чата
├── ParticipantItem.tsx      # Элемент участника с индикаторами
├── VoiceControls.tsx        # Кнопки управления (mute, volume)
├── TTSControls.tsx          # Управление TTS ИИ-мастера
├── AudioVisualizer.tsx      # Визуализация speaking activity
└── index.ts                 # Экспорты компонентов
```

### Backend Services:
```
/backend/src/services/voice/
├── SignalingService.ts      # WebRTC signaling через Socket.io
├── TTSManager.ts           # Multi-provider TTS управление
├── VoiceSelector.ts        # Логика выбора голосов
├── CacheManager.ts         # Кэширование TTS аудио
├── AudioStateManager.ts    # Priority-based mixing logic
└── providers/
    ├── AzureTTSProvider.ts # Azure TTS интеграция
    ├── GoogleTTSProvider.ts # Google TTS интеграция
    └── LocalTTSProvider.ts  # Local TTS (Piper)
```

### Infrastructure:
```
/infrastructure/
├── coturn.conf             # TURN server конфигурация
├── docker-compose.voice.yml # Voice services containers
└── nginx-voice.conf        # Reverse proxy для WebSocket
```

## 🔄 ПОЭТАПНЫЙ ПЛАН РЕАЛИЗАЦИИ

### **ЭТАП 1: WebRTC Infrastructure** (1.5 часа)

#### Backend: Signaling Server
```typescript
// /backend/src/services/voice/SignalingService.ts
interface SignalingService {
  handleConnection(socket: Socket): void;
  createRoom(roomId: string): VoiceRoom;
  joinRoom(socket: Socket, roomId: string): void;
  handleOffer(socket: Socket, offer: RTCSessionDescription): void;
  handleAnswer(socket: Socket, answer: RTCSessionDescription): void;
  handleIceCandidate(socket: Socket, candidate: RTCIceCandidate): void;
  leaveRoom(socket: Socket): void;
}
```

#### Frontend: WebRTC Manager
```typescript
// /frontend/src/hooks/useWebRTC.ts
interface WebRTCManager {
  connectionState: RTCPeerConnectionState;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  joinVoiceChat(roomId: string): Promise<void>;
  leaveVoiceChat(): void;
  toggleMute(): void;
  setVolume(participantId: string, volume: number): void;
}
```

#### TURN Server Setup
```yaml
# docker-compose.voice.yml
services:
  coturn:
    image: coturn/coturn:latest
    ports:
      - "3478:3478"
      - "5349:5349" 
      - "49152-65535:49152-65535/udp"
    environment:
      - TURN_USERNAME=${TURN_USERNAME}
      - TURN_PASSWORD=${TURN_PASSWORD}
    volumes:
      - ./coturn.conf:/etc/coturn/turnserver.conf
```

**Критерии готовности Этапа 1:**
- [ ] Socket.io signaling server запущен и обрабатывает WebRTC events
- [ ] Frontend устанавливает WebRTC peer connections
- [ ] TURN server работает и relay traffic
- [ ] Аудио потоки передаются между клиентами
- [ ] Basic connection state management

### **ЭТАП 2: VoiceChat UI Integration** (1 час)

#### VoicePanel Component
```typescript
// /frontend/src/components/VoiceChat/VoicePanel.tsx
interface VoicePanelProps {
  participants: VoiceParticipant[];
  currentUser: VoiceParticipant;
  isConnected: boolean;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleVoice: () => void;
}

// Style Guide compliance:
className="bg-gray-800 rounded-lg p-4 border border-gray-700"
```

#### Integration с GameChat
```typescript
// /frontend/src/app/room/[id]/page.tsx
// Добавить VoicePanel в существующий GameChat layout
<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
  <div className="lg:col-span-1">
    <VoicePanel {...voiceProps} />
  </div>
  <div className="lg:col-span-3">
    <GameChat {...existingProps} />
  </div>
</div>
```

#### Speaking Indicators
```css
/* Animated speaking indicator */
.speaking-indicator {
  @apply w-3 h-3 rounded-full bg-green-500;
  animation: pulse 1.5s ease-in-out infinite;
}

.muted-indicator {
  @apply w-3 h-3 rounded-full bg-red-500;
}

.connecting-indicator {
  @apply w-3 h-3 rounded-full bg-yellow-500 animate-pulse;
}
```

**Критерии готовности Этапа 2:**
- [ ] VoicePanel интегрирована в GameChat UI
- [ ] Список участников отображается с правильными индикаторами
- [ ] Кнопки mute/unmute функциональны
- [ ] Real-time обновление speaking indicators
- [ ] Мобильная адаптивность (collapsible panel)

### **ЭТАП 3: TTS Integration** (1.5 часа)

#### TTS Manager Implementation
```typescript
// /backend/src/services/voice/TTSManager.ts
class TTSManager {
  private providers: Map<string, TTSProvider>;
  private cacheManager: CacheManager;
  private voiceSelector: VoiceSelector;

  async generateTTS(
    text: string, 
    characterId?: string,
    priority: 'immediate' | 'background' = 'background'
  ): Promise<AudioBuffer> {
    // 1. Check cache
    const cacheKey = this.generateCacheKey(text, characterId);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // 2. Select voice and provider
    const voiceConfig = await this.voiceSelector.selectVoice(characterId);
    
    // 3. Generate TTS
    const audioBuffer = await this.generateWithProvider(text, voiceConfig);
    
    // 4. Cache result
    await this.cacheManager.set(cacheKey, audioBuffer);
    
    return audioBuffer;
  }
}
```

#### DM Agent TTS Integration
```typescript
// /backend/src/services/llm/dmAgentWithMemory.ts
// Расширить существующий DMAgentWithMemoryService
class DMAgentWithVoiceService extends DMAgentWithMemoryService {
  constructor(
    private ttsManager: TTSManager,
    // ... existing dependencies
  ) {
    super(/* existing params */);
  }

  async processMessage(
    roomId: string, 
    content: string,
    options: { enableTTS?: boolean } = {}
  ): Promise<DMAIResponse> {
    // Existing logic...
    const response = await super.processMessage(roomId, content);
    
    // Add TTS if enabled
    if (options.enableTTS && this.shouldGenerateTTS(response)) {
      response.audioBuffer = await this.ttsManager.generateTTS(
        response.content, 
        'dm-master',
        'immediate'
      );
    }
    
    return response;
  }
}
```

#### Frontend TTS Player
```typescript
// /frontend/src/components/VoiceChat/TTSPlayer.tsx
interface TTSPlayerProps {
  audioBuffer?: ArrayBuffer;
  isPlaying: boolean;
  onPlayComplete: () => void;
}

const TTSPlayer: React.FC<TTSPlayerProps> = ({ audioBuffer, isPlaying, onPlayComplete }) => {
  const audioContextRef = useRef<AudioContext>();
  
  useEffect(() => {
    if (audioBuffer && isPlaying) {
      playTTSAudio(audioBuffer);
    }
  }, [audioBuffer, isPlaying]);
};
```

**Критерии готовности Этапа 3:**
- [ ] TTS Manager с multi-provider support
- [ ] Cache система для TTS аудио файлов
- [ ] DM Agent автоматически генерирует TTS для ответов
- [ ] Frontend воспроизводит TTS аудио
- [ ] TTS controls в VoicePanel (enable/disable)

### **ЭТАП 4: Audio State Management** (1 час)

#### Priority-Based Mixing Implementation
```typescript
// /backend/src/services/voice/AudioStateManager.ts
enum AudioPriority {
  DM_TTS = 100,
  PLAYER_VOICE = 75,
  SYSTEM_SOUND = 25,
  BACKGROUND = 10
}

class AudioStateManager {
  private audioSources: Map<string, AudioSource> = new Map();
  private currentState: AudioState = AudioState.IDLE;
  
  async handleAudioEvent(event: AudioEvent): Promise<void> {
    const newState = this.calculateNewState(event);
    await this.transitionToState(newState);
    this.broadcastStateUpdate(newState);
  }
  
  private async transitionToState(newState: AudioState): Promise<void> {
    // Implement smooth transitions with fade in/out
    const transition = this.getTransition(this.currentState, newState);
    await transition.execute();
    this.currentState = newState;
  }
}
```

#### Frontend Audio Context Management
```typescript
// /frontend/src/hooks/useAudioState.ts
interface AudioState {
  dmSpeaking: boolean;
  playersSpeaking: string[];
  ttsPlaying: boolean;
  volumes: Map<string, number>;
}

const useAudioState = (roomId: string) => {
  const [audioState, setAudioState] = useState<AudioState>(initialState);
  
  useEffect(() => {
    const socket = getSocket();
    socket.on('audio-state-update', setAudioState);
    return () => socket.off('audio-state-update');
  }, [roomId]);
  
  return { audioState, updateAudioState };
};
```

#### Visual Indicator Sync
```typescript
// /frontend/src/components/VoiceChat/ParticipantItem.tsx
const ParticipantItem: React.FC<ParticipantItemProps> = ({ participant, audioState }) => {
  const isSpeaking = audioState.playersSpeaking.includes(participant.id);
  const volume = audioState.volumes.get(participant.id) || 1.0;
  
  return (
    <div className="flex items-center justify-between p-2 bg-gray-700 rounded">
      <div className="flex items-center space-x-2">
        <SpeakingIndicator 
          isSpeaking={isSpeaking} 
          isMuted={participant.isMuted}
          connectionStatus={participant.connectionStatus}
        />
        <span className="text-white">{participant.name}</span>
      </div>
      <VolumeControl value={volume} onChange={handleVolumeChange} />
    </div>
  );
};
```

**Критерии готовности Этапа 4:**
- [ ] AudioStateManager с priority-based logic
- [ ] Smooth transitions между audio states
- [ ] Real-time synchronization visual indicators
- [ ] Volume controls для каждого участника
- [ ] Graceful handling audio conflicts

## 🔧 ТЕХНИЧЕСКАЯ КОНФИГУРАЦИЯ

### Environment Variables:
```bash
# TTS Configuration
TTS_PROVIDER=azure
TTS_API_KEY=your_api_key
TTS_VOICE_DM=en-US-AriaNeural
TTS_CACHE_DIR=./data/tts-cache
TTS_CACHE_TTL=2592000  # 30 days

# WebRTC Configuration
TURN_SERVER_URL=turn:your-domain.com:3478
TURN_USERNAME=username  
TURN_PASSWORD=password
SIGNALING_PORT=8001
WEBRTC_ENABLED=true

# Voice Features
VOICE_ENABLED=true
TTS_ENABLED=true
AUTO_TTS_DM=false
MAX_VOICE_PARTICIPANTS=5
```

### Docker Services:
```yaml
# Добавить в docker-compose.yml
services:
  coturn:
    image: coturn/coturn:latest
    ports:
      - "3478:3478"
      - "5349:5349"
      - "49152-65535:49152-65535/udp"
    environment:
      - TURN_USERNAME=${TURN_USERNAME}
      - TURN_PASSWORD=${TURN_PASSWORD}
    volumes:
      - ./coturn.conf:/etc/coturn/turnserver.conf
    restart: unless-stopped
```

## 🧪 TESTING STRATEGY

### Unit Tests:
- [ ] TTSManager provider switching
- [ ] AudioStateManager state transitions  
- [ ] VoicePanel component rendering
- [ ] WebRTC connection establishment

### Integration Tests:
- [ ] End-to-end voice chat между 2 клиентами
- [ ] TTS generation и playback
- [ ] Audio state synchronization
- [ ] Mobile responsive behavior

### Manual Testing Scenarios:
1. **Basic Voice Chat**: 3 игрока подключаются и разговаривают
2. **TTS Integration**: ИИ-мастер отвечает с TTS озвучкой
3. **Audio Conflicts**: Simultaneous speaking handling
4. **Connection Issues**: Network interruption recovery
5. **Mobile Usage**: Tablet/phone compatibility

## ⚠️ KNOWN CHALLENGES & SOLUTIONS

### 1. WebRTC NAT Traversal
**Challenge**: Users behind strict NAT/firewall  
**Solution**: Reliable TURN server с multiple endpoints
**Testing**: Test через mobile hotspot

### 2. TTS Latency  
**Challenge**: Delay между text и audio generation
**Solution**: Aggressive caching + background pre-generation
**Monitoring**: Track TTS response times

### 3. Audio Synchronization
**Challenge**: Desync между visual indicators и actual audio
**Solution**: Event-driven state updates с timestamps
**Validation**: Visual/audio timing tests

### 4. Browser Compatibility
**Challenge**: WebRTC differences между browsers
**Solution**: adapter.js polyfill + feature detection
**Support**: Chrome, Firefox, Safari latest versions

## 🎯 ACCEPTANCE CRITERIA

### MVP Success Criteria:
- [ ] 4-5 игроков подключаются к голосовому чату в комнате
- [ ] Стабильная голосовая связь в течение 2+ часов тестирования  
- [ ] ИИ-мастер может озвучивать ответы через TTS (опционально)
- [ ] Все текстовые функции GameChat работают параллельно
- [ ] Graceful degradation при connection issues
- [ ] Audio latency < 150ms для voice communication
- [ ] TTS generation < 3 секунд для typical responses
- [ ] Mobile compatibility на планшетах

### Performance Metrics:
- WebRTC connection establishment: < 5 секунд
- TTS cache hit ratio: > 70%
- Audio state transitions: < 100ms
- Memory usage: < 100MB additional per client
- Bandwidth: < 64kbps per audio stream

## 📋 INTEGRATION REQUIREMENTS

### Существующие системы:
- **Memory System**: Логирование voice activity в session stats
- **DM Agent**: Auto TTS generation для narrative responses  
- **GameChat UI**: Seamless integration без breaking changes
- **Style Guide**: Strict adherence к color scheme и components

### API Endpoints (добавить):
```
GET  /api/voice/status           # Voice subsystem status
POST /api/voice/rooms/:id/join   # Join voice chat
POST /api/voice/tts/generate     # Manual TTS generation  
GET  /api/voice/settings         # User voice preferences
PUT  /api/voice/settings         # Update voice preferences
```

## 🚀 DEPLOYMENT CHECKLIST

### Pre-deployment:
- [ ] All environment variables configured
- [ ] TURN server deployed и accessible
- [ ] TTS API keys valid и tested
- [ ] SSL certificates для WebRTC (required)
- [ ] Firewall rules для TURN ports
- [ ] Docker containers build successfully

### Post-deployment Monitoring:
- [ ] WebRTC connection success rate
- [ ] TTS API response times  
- [ ] TURN server usage statistics
- [ ] Audio quality metrics
- [ ] User adoption metrics

---

## 📝 ФИНАЛЬНЫЙ ПРОМПТ ДЛЯ РЕАЛИЗАЦИИ

**Ты - senior full-stack developer, специализирующийся на real-time web applications и WebRTC. Твоя задача - реализовать голосовую подсистему для AI D&D Master согласно детальному плану выше.**

**НАЧНИ С ЭТАПА 1** - настройка WebRTC infrastructure. Создай signaling server, frontend WebRTC manager, и TURN server конфигурацию. Следуй архитектурным решениям из Creative Phase и поэтапному плану.

**ИСПОЛЬЗУЙ СУЩЕСТВУЮЩУЮ КОДОВУЮ БАЗУ**: Интегрируйся с current GameChat UI, DM Agent, и Memory System. Соблюдай Style Guide и code patterns.

**ЦЕЛЬ**: Функциональная голосовая подсистема за 4-6 часов работы с возможностью voice chat между игроками и TTS озвучкой ИИ-мастера.

**Готов реализовать? Начинай с Этапа 1!** 🚀
