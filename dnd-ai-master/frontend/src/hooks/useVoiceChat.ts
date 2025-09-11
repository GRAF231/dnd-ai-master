'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// События для WebRTC signaling
const VOICE_ACTIONS = {
  JOIN: 'voice-join',
  LEAVE: 'voice-leave', 
  ADD_PEER: 'voice-add-peer',
  REMOVE_PEER: 'voice-remove-peer',
  RELAY_SDP: 'voice-relay-sdp',
  RELAY_ICE: 'voice-relay-ice',
  ICE_CANDIDATE: 'voice-ice-candidate',
  SESSION_DESCRIPTION: 'voice-session-description'
};

const LOCAL_AUDIO = 'LOCAL_AUDIO';

export interface VoiceParticipant {
  id: string;
  name: string;
  isLocal: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  connectionState: string;
  volume: number;
}

export interface VoiceChatHook {
  participants: VoiceParticipant[];
  isConnected: boolean;
  connectionStates: Record<string, string>;
  isInitializing: boolean;
  isMuted: boolean;
  joinVoiceChat: (roomId: string, playerName: string) => Promise<void>;
  leaveVoiceChat: () => void;
  toggleMute: () => void;
  forcePlayAllAudio: () => void;
  setParticipantVolume: (participantId: string, volume: number) => void;
  volumes: Record<string, number>;
}

export const useVoiceChat = (): VoiceChatHook => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [participantNames, setParticipantNames] = useState<Record<string, string>>({});
  const [connectionStates, setConnectionStates] = useState<Record<string, string>>({});
  const [isInitializing, setIsInitializing] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentPlayerName, setCurrentPlayerName] = useState<string | null>(null);
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  // Refs для WebRTC
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const localMediaStream = useRef<MediaStream | null>(null);
  const audioElements = useRef<Record<string, HTMLAudioElement>>({});

  // Загрузка настроек громкости из localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVolumes = localStorage.getItem('voiceChat-volumes');
      if (savedVolumes) {
        try {
          const parsedVolumes = JSON.parse(savedVolumes);
          setVolumes(parsedVolumes);
        } catch (error) {
          console.error('Failed to parse saved volumes:', error);
        }
      }
    }
  }, []);

  // Функция установки громкости участника
  const setParticipantVolume = useCallback((participantId: string, volume: number) => {
    setVolumes(prev => {
      const newVolumes = { ...prev, [participantId]: volume };
      
      // Сохранение в localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('voiceChat-volumes', JSON.stringify(newVolumes));
      }
      
      // Применение громкости к аудио элементу
      if (audioElements.current[participantId]) {
        audioElements.current[participantId].volume = volume;
      }
      
      return newVolumes;
    });
  }, []);

  // Функция получения громкости участника (с дефолтным значением)
  const getParticipantVolume = useCallback((participantId: string): number => {
    return volumes[participantId] ?? 0.8; // Дефолт 80%
  }, [volumes]);

  // Функция добавления участника
  const addParticipant = useCallback((participantId: string) => {
    setParticipants(prev => {
      if (!prev.includes(participantId)) {
        return [...prev, participantId];
      }
      return prev;
    });
  }, []);

  // Функция удаления участника
  const removeParticipant = useCallback((participantId: string) => {
    setParticipants(prev => prev.filter(p => p !== participantId));
  }, []);

  // Инициализация Socket.IO
  useEffect(() => {
    const newSocket = io('http://localhost:8001', {
      transports: ['websocket'],
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('✅ VoiceChat: Connected to signaling server');
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ VoiceChat: Disconnected from signaling server');
      setIsConnected(false);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // WebRTC обработчики
  useEffect(() => {
    if (!socket) return;

    // Обработка нового пира
    const handleAddPeer = async ({ peerID, createOffer, playerName }: { peerID: string; createOffer: boolean; playerName?: string }) => {
      console.log(`📞 VoiceChat: Adding peer: ${peerID}, createOffer: ${createOffer}`);

      if (peerID in peerConnections.current) {
        console.warn(`VoiceChat: Already connected to peer ${peerID}`);
        return;
      }

      // Создание RTCPeerConnection с расширенной конфигурацией для Chromium
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
        ],
        iceCandidatePoolSize: 10,
        iceTransportPolicy: 'all'
      });

      peerConnections.current[peerID] = peerConnection;

      // Обработка ICE кандидатов
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(`🧊 VoiceChat: Generated ICE candidate for ${peerID}:`, event.candidate.type, event.candidate.protocol);
          socket.emit(VOICE_ACTIONS.RELAY_ICE, {
            peerID,
            iceCandidate: event.candidate
          });
        } else {
          console.log(`🧊 VoiceChat: ICE gathering complete for ${peerID}`);
        }
      };

      // Обработка ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`🧊 VoiceChat: ICE connection state for ${peerID}:`, peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'failed') {
          console.warn(`❌ VoiceChat: ICE connection failed for ${peerID}, attempting restart`);
          peerConnection.restartIce();
        }
      };

      // Обработка ICE gathering state  
      peerConnection.onicegatheringstatechange = () => {
        console.log(`🧊 VoiceChat: ICE gathering state for ${peerID}:`, peerConnection.iceGatheringState);
      };

      // Обработка удаленного аудио потока
      peerConnection.ontrack = ({ streams: [remoteStream], track }) => {
        console.log(`🎵 VoiceChat: Received remote track from ${peerID}: ${track.kind}, enabled: ${track.enabled}`);
        console.log(`🎵 VoiceChat: Remote stream tracks count: ${remoteStream.getTracks().length}`);
        
        // Создание audio элемента для удаленного потока
        const audioElement = new Audio();
        audioElement.srcObject = remoteStream;
        audioElement.autoplay = true;
        
        // Применение сохраненной громкости или дефолтного значения
        const savedVolume = getParticipantVolume(peerID);
        audioElement.volume = savedVolume;
        console.log(`🔊 VoiceChat: Set volume for ${peerID}: ${savedVolume}`);
        
        // Попытка воспроизведения (важно для современных браузеров)
        audioElement.play().then(() => {
          console.log(`✅ VoiceChat: Successfully started playing audio from ${peerID}`);
        }).catch(error => {
          console.warn(`⚠️ VoiceChat: Could not auto-play audio for ${peerID}:`, error);
        });
        
        audioElements.current[peerID] = audioElement;
        addParticipant(peerID);
        
        // Сохраняем имя участника, если оно передано
        if (playerName) {
          setParticipantNames(prev => ({ ...prev, [peerID]: playerName }));
        }
      };

      // Обработка состояния соединения
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log(`🔗 VoiceChat: Peer ${peerID} connection state: ${state}`);
        setConnectionStates(prev => ({ ...prev, [peerID]: state }));
      };

      // Добавление локального потока
      if (localMediaStream.current) {
        const tracks = localMediaStream.current.getTracks();
        console.log(`📤 VoiceChat: Adding ${tracks.length} local tracks to peer ${peerID}`);
        tracks.forEach((track, index) => {
          console.log(`📤 VoiceChat: Track ${index}: ${track.kind}, enabled: ${track.enabled}`);
          peerConnection.addTrack(track, localMediaStream.current!);
        });
      }

      // Создание offer если нужно
      if (createOffer) {
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          
          socket.emit(VOICE_ACTIONS.RELAY_SDP, {
            peerID,
            sessionDescription: offer
          });
        } catch (error) {
          console.error('❌ VoiceChat: Error creating offer:', error);
        }
      }
    };

    // Обработка session description
    const handleSessionDescription = async ({ peerID, sessionDescription }: { peerID: string; sessionDescription: RTCSessionDescription }) => {
      console.log(`📋 VoiceChat: Received ${sessionDescription.type} from ${peerID}`);
      
      try {
        const peerConnection = peerConnections.current[peerID];
        if (!peerConnection) return;

        await peerConnection.setRemoteDescription(new RTCSessionDescription(sessionDescription));

        // Если получили offer, создаем answer
        if (sessionDescription.type === 'offer') {
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          socket.emit(VOICE_ACTIONS.RELAY_SDP, {
            peerID,
            sessionDescription: answer
          });
        }
      } catch (error) {
        console.error('❌ VoiceChat: Error handling session description:', error);
      }
    };

    // Обработка ICE кандидата
    const handleIceCandidate = ({ peerID, iceCandidate }: { peerID: string; iceCandidate: RTCIceCandidate }) => {
      console.log(`🧊 VoiceChat: Received ICE candidate from ${peerID}:`, iceCandidate.type, iceCandidate.protocol);
      
      const peerConnection = peerConnections.current[peerID];
      if (peerConnection && peerConnection.remoteDescription) {
        peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate))
          .then(() => {
            console.log(`✅ VoiceChat: Successfully added ICE candidate for ${peerID}`);
          })
          .catch(error => {
            console.error(`❌ VoiceChat: Error adding ICE candidate for ${peerID}:`, error);
            // В Chromium иногда помогает повторная попытка
            setTimeout(() => {
              if (peerConnection.remoteDescription) {
                peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate))
                  .catch(retryError => console.error(`❌ VoiceChat: Retry failed for ${peerID}:`, retryError));
              }
            }, 100);
          });
      } else {
        console.warn(`⚠️ VoiceChat: Cannot add ICE candidate for ${peerID}: no remote description or connection`);
      }
    };

    // Обработка удаления пира
    const handleRemovePeer = ({ peerID }: { peerID: string }) => {
      console.log(`👋 VoiceChat: Removing peer: ${peerID}`);
      
      if (peerConnections.current[peerID]) {
        peerConnections.current[peerID].close();
        delete peerConnections.current[peerID];
      }

      if (audioElements.current[peerID]) {
        audioElements.current[peerID].pause();
        delete audioElements.current[peerID];
      }

      removeParticipant(peerID);
      setConnectionStates(prev => {
        const newStates = { ...prev };
        delete newStates[peerID];
        return newStates;
      });
      setParticipantNames(prev => {
        const newNames = { ...prev };
        delete newNames[peerID];
        return newNames;
      });
    };

    // Регистрация обработчиков
    socket.on(VOICE_ACTIONS.ADD_PEER, handleAddPeer);
    socket.on(VOICE_ACTIONS.SESSION_DESCRIPTION, handleSessionDescription);
    socket.on(VOICE_ACTIONS.ICE_CANDIDATE, handleIceCandidate);
    socket.on(VOICE_ACTIONS.REMOVE_PEER, handleRemovePeer);

    return () => {
      socket.off(VOICE_ACTIONS.ADD_PEER);
      socket.off(VOICE_ACTIONS.SESSION_DESCRIPTION);
      socket.off(VOICE_ACTIONS.ICE_CANDIDATE);
      socket.off(VOICE_ACTIONS.REMOVE_PEER);
    };
  }, [socket, addParticipant, removeParticipant]);

  // Подключение к голосовому чату
  const joinVoiceChat = async (roomId: string, playerName: string) => {
    if (!socket) {
      console.warn('VoiceChat: No socket connection');
      return;
    }

    if (isConnected) {
      console.warn('VoiceChat: Already connected');
      return;
    }

    setIsInitializing(true);
    setCurrentRoomId(roomId);
    setCurrentPlayerName(playerName);

    try {
      // Получение аудио потока с улучшенными настройками для Chromium
      console.log('🎤 VoiceChat: Requesting microphone access...');
      const audioConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
          // Добавляем принудительные настройки для Chromium
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true
        },
        video: false
      };

      // Логируем информацию о браузере
      const isChromium = typeof window !== 'undefined' && /Chrome|Chromium|Edge/.test(navigator.userAgent);
      console.log(`🌐 VoiceChat: Browser: ${isChromium ? 'Chromium-based' : 'Other'}`);
      
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);

      localMediaStream.current = stream;
      console.log('✅ VoiceChat: Got local audio stream');

      // Присоединение к комнате с именем игрока
      socket.emit(VOICE_ACTIONS.JOIN, { 
        room: roomId, 
        playerName: playerName 
      });
      setIsConnected(true);
      addParticipant(LOCAL_AUDIO);
      // Устанавливаем имя для локального участника
      setParticipantNames(prev => ({ ...prev, [LOCAL_AUDIO]: playerName }));

    } catch (error) {
      console.error('❌ VoiceChat: Error accessing microphone:', error);
      throw error;
    } finally {
      setIsInitializing(false);
    }
  };

  // Отключение от голосового чата
  const leaveVoiceChat = () => {
    if (!socket) return;

    console.log('👋 VoiceChat: Leaving voice chat...');

    // Остановка локального потока
    if (localMediaStream.current) {
      localMediaStream.current.getTracks().forEach(track => track.stop());
      localMediaStream.current = null;
    }

    // Закрытие всех peer connections
    Object.values(peerConnections.current).forEach(pc => pc.close());
    peerConnections.current = {};

    // Остановка всех audio элементов
    Object.values(audioElements.current).forEach(audio => audio.pause());
    audioElements.current = {};

    // Уведомление сервера
    socket.emit(VOICE_ACTIONS.LEAVE);

    setIsConnected(false);
    setParticipants([]);
    setConnectionStates({});
    setParticipantNames({});
    setCurrentRoomId(null);
    setCurrentPlayerName(null);
  };

  // Переключение микрофона
  const toggleMute = () => {
    if (localMediaStream.current) {
      const audioTrack = localMediaStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Принудительное воспроизведение всех аудио элементов
  const forcePlayAllAudio = () => {
    Object.entries(audioElements.current).forEach(([peerID, audio]) => {
      audio.play().then(() => {
        console.log(`✅ VoiceChat: Force played audio for ${peerID}`);
      }).catch(error => {
        console.warn(`❌ VoiceChat: Failed to force play audio for ${peerID}:`, error);
      });
    });
  };

    // Формирование списка участников с дополнительной информацией
  const participantsWithInfo: VoiceParticipant[] = participants.map(participantId => {
    const isLocal = participantId === LOCAL_AUDIO;
    const connectionState = connectionStates[participantId] || 'new';
    
    // Получаем имя участника из сохраненных имен или используем fallback
    const participantName = participantNames[participantId] || 
      (isLocal ? (currentPlayerName || 'Вы') : `Игрок ${participantId.slice(0, 6)}`);
    
    return {
      id: participantId,
      name: participantName,
      isLocal,
      isMuted: isLocal ? isMuted : false,
      isSpeaking: false, // TODO: Реализовать определение речи
      connectionState,
      volume: getParticipantVolume(participantId)
    };
  });

  return {
    participants: participantsWithInfo,
    isConnected,
    connectionStates,
    isInitializing,
    isMuted,
    joinVoiceChat,
    leaveVoiceChat,
    toggleMute,
    forcePlayAllAudio,
    setParticipantVolume,
    volumes
  };
};
