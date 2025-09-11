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

export default function VoiceTestPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState('test-room');
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [connectionStates, setConnectionStates] = useState<Record<string, string>>({});
  const [isClient, setIsClient] = useState(false);

  // Refs для WebRTC
  const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
  const localMediaStream = useRef<MediaStream | null>(null);
  const audioElements = useRef<Record<string, HTMLAudioElement>>({});

  // Определение клиентской стороны для избежания hydration ошибок
  useEffect(() => {
    setIsClient(true);
  }, []);

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
      console.log('✅ Connected to signaling server');
      setSocket(newSocket);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from signaling server');
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
    const handleAddPeer = async ({ peerID, createOffer }: { peerID: string; createOffer: boolean }) => {
      console.log(`📞 Adding peer: ${peerID}, createOffer: ${createOffer}`);

      if (peerID in peerConnections.current) {
        console.warn(`Already connected to peer ${peerID}`);
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
          console.log(`🧊 Generated ICE candidate for ${peerID}:`, event.candidate.type, event.candidate.protocol);
          socket.emit(VOICE_ACTIONS.RELAY_ICE, {
            peerID,
            iceCandidate: event.candidate
          });
        } else {
          console.log(`🧊 ICE gathering complete for ${peerID}`);
        }
      };

      // Обработка ICE connection state
      peerConnection.oniceconnectionstatechange = () => {
        console.log(`🧊 ICE connection state for ${peerID}:`, peerConnection.iceConnectionState);
        if (peerConnection.iceConnectionState === 'failed') {
          console.warn(`❌ ICE connection failed for ${peerID}, attempting restart`);
          peerConnection.restartIce();
        }
      };

      // Обработка ICE gathering state  
      peerConnection.onicegatheringstatechange = () => {
        console.log(`🧊 ICE gathering state for ${peerID}:`, peerConnection.iceGatheringState);
      };

      // Обработка удаленного аудио потока
      peerConnection.ontrack = ({ streams: [remoteStream], track }) => {
        console.log(`🎵 Received remote track from ${peerID}: ${track.kind}, enabled: ${track.enabled}`);
        console.log(`🎵 Remote stream tracks count: ${remoteStream.getTracks().length}`);
        
        // Создание audio элемента для удаленного потока
        const audioElement = new Audio();
        audioElement.srcObject = remoteStream;
        audioElement.autoplay = true;
        audioElement.volume = 1.0;
        
        // Попытка воспроизведения (важно для современных браузеров)
        audioElement.play().then(() => {
          console.log(`✅ Successfully started playing audio from ${peerID}`);
        }).catch(error => {
          console.warn(`⚠️ Could not auto-play audio for ${peerID}:`, error);
        });
        
        audioElements.current[peerID] = audioElement;
        addParticipant(peerID);
      };

      // Обработка состояния соединения
      peerConnection.onconnectionstatechange = () => {
        const state = peerConnection.connectionState;
        console.log(`🔗 Peer ${peerID} connection state: ${state}`);
        setConnectionStates(prev => ({ ...prev, [peerID]: state }));
      };

      // Добавление локального потока
      if (localMediaStream.current) {
        const tracks = localMediaStream.current.getTracks();
        console.log(`📤 Adding ${tracks.length} local tracks to peer ${peerID}`);
        tracks.forEach((track, index) => {
          console.log(`📤 Track ${index}: ${track.kind}, enabled: ${track.enabled}`);
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
          console.error('❌ Error creating offer:', error);
        }
      }
    };

    // Обработка session description
    const handleSessionDescription = async ({ peerID, sessionDescription }: { peerID: string; sessionDescription: RTCSessionDescription }) => {
      console.log(`📋 Received ${sessionDescription.type} from ${peerID}`);
      
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
        console.error('❌ Error handling session description:', error);
      }
    };

    // Обработка ICE кандидата
    const handleIceCandidate = ({ peerID, iceCandidate }: { peerID: string; iceCandidate: RTCIceCandidate }) => {
      console.log(`🧊 Received ICE candidate from ${peerID}:`, iceCandidate.type, iceCandidate.protocol);
      
      const peerConnection = peerConnections.current[peerID];
      if (peerConnection && peerConnection.remoteDescription) {
        peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate))
          .then(() => {
            console.log(`✅ Successfully added ICE candidate for ${peerID}`);
          })
          .catch(error => {
            console.error(`❌ Error adding ICE candidate for ${peerID}:`, error);
            // В Chromium иногда помогает повторная попытка
            setTimeout(() => {
              if (peerConnection.remoteDescription) {
                peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate))
                  .catch(retryError => console.error(`❌ Retry failed for ${peerID}:`, retryError));
              }
            }, 100);
          });
      } else {
        console.warn(`⚠️ Cannot add ICE candidate for ${peerID}: no remote description or connection`);
      }
    };

    // Обработка удаления пира
    const handleRemovePeer = ({ peerID }: { peerID: string }) => {
      console.log(`👋 Removing peer: ${peerID}`);
      
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
  const joinVoiceChat = async () => {
    if (!socket) {
      alert('Нет подключения к серверу');
      return;
    }

    try {
      // Получение аудио потока с улучшенными настройками для Chromium
      console.log('🎤 Requesting microphone access...');
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
      console.log(`🌐 Browser: ${isChromium ? 'Chromium-based' : 'Other'}`);
      
      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);

      localMediaStream.current = stream;
      console.log('✅ Got local audio stream');

      // Присоединение к комнате
      socket.emit(VOICE_ACTIONS.JOIN, { room: roomId });
      setIsConnected(true);
      addParticipant(LOCAL_AUDIO);

    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      alert('Не удалось получить доступ к микрофону');
    }
  };

  // Отключение от голосового чата
  const leaveVoiceChat = () => {
    if (!socket) return;

    console.log('👋 Leaving voice chat...');

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
        console.log(`✅ Force played audio for ${peerID}`);
      }).catch(error => {
        console.warn(`❌ Failed to force play audio for ${peerID}:`, error);
      });
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">🎙️ Тест голосовой связи WebRTC</h1>
          <p className="text-gray-400">Простейшая базовая реализация для D&D игр</p>
        </div>

        {/* Настройки комнаты */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Настройки</h2>
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">ID комнаты</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                disabled={isConnected}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
              />
            </div>
            <div className="flex space-x-2">
              {!isConnected ? (
                <button
                  onClick={joinVoiceChat}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  🎤 Подключиться
                </button>
              ) : (
                <button
                  onClick={leaveVoiceChat}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  📞 Отключиться
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Статус подключения */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Статус</h2>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${socket ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Signaling сервер: {socket ? 'Подключен' : 'Отключен'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <span>Голосовой чат: {isConnected ? 'Активен' : 'Неактивен'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isMuted ? 'bg-red-500' : isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
              <span>Микрофон: {isMuted ? 'Отключен' : isConnected ? 'Включен' : 'Неактивен'}</span>
            </div>
            {isClient && (
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${/Chrome|Chromium|Edge/.test(navigator.userAgent) ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                <span>Браузер: {/Chrome|Chromium|Edge/.test(navigator.userAgent) ? 'Chromium (требует доп. настройки)' : 'Safari/Other'}</span>
              </div>
            )}
          </div>
          
          {/* Кнопка для принудительного воспроизведения */}
          {participants.length > 1 && (
            <div className="mt-4">
              <button
                onClick={forcePlayAllAudio}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                🔊 Включить звук принудительно
              </button>
              <p className="text-xs text-gray-400 mt-1">
                Нажмите если не слышите других участников
              </p>
            </div>
          )}
        </div>
        
        {/* Дополнительная debug информация */}
        {Object.keys(connectionStates).length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">🔧 Debug информация</h2>
            <div className="space-y-2 text-sm">
              {Object.entries(connectionStates).map(([peerID, state]) => (
                <div key={peerID} className="flex justify-between">
                  <span>Peer {peerID.slice(0, 8)}:</span>
                  <span className={state === 'connected' ? 'text-green-400' : 'text-yellow-400'}>
                    {state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}



        {/* Участники */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Участники ({participants.length})</h2>
          <div className="space-y-3">
            {participants.map(participantId => {
              const isLocal = participantId === LOCAL_AUDIO;
              const connectionState = connectionStates[participantId] || 'new';
              
              return (
                <div key={participantId} className="flex items-center justify-between bg-gray-700 p-3 rounded">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isLocal ? 'bg-purple-600' : 'bg-green-600'}`}>
                      🎤
                    </div>
                    <div>
                      <div className="font-medium">
                        {isLocal ? 'Вы' : `Участник ${participantId.slice(0, 8)}`}
                      </div>
                      <div className="text-sm text-gray-400">
                        Статус: {isLocal ? (isMuted ? 'Микрофон выключен' : 'Говорит') : connectionState}
                      </div>
                    </div>
                  </div>
                  
                  {isLocal && isConnected && (
                    <button
                      onClick={toggleMute}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        isMuted 
                          ? 'bg-red-600 hover:bg-red-700 text-white' 
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {isMuted ? '🔇 Включить' : '🎤 Выключить'}
                    </button>
                  )}
                </div>
              );
            })}
            
            {participants.length === 0 && (
              <div className="text-gray-500 text-center py-4">
                Нет подключенных участников
              </div>
            )}
          </div>
        </div>

        {/* Инструкции */}
        <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Инструкции</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Убедитесь, что бэкенд сервер запущен на портах 8000 (API) и 8001 (Socket.io)</li>
            <li>Введите ID комнаты (или оставьте по умолчанию "test-room")</li>
            <li>Нажмите "Подключиться" и разрешите доступ к микрофону</li>
            <li>Откройте эту же страницу в другой вкладке/браузере с тем же ID комнаты</li>
            <li>Теперь вы можете разговаривать между вкладками!</li>
            <li>Используйте кнопку "Выключить/Включить" для управления микрофоном</li>
          </ol>
          
          {/* Специальные инструкции для Chromium */}
          {isClient && /Chrome|Chromium|Edge/.test(navigator.userAgent) && (
            <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
              <h3 className="text-lg font-semibold mb-2 text-yellow-300">⚠️ Для Chromium браузеров</h3>
              <ul className="list-disc list-inside space-y-1 text-yellow-200 text-sm">
                <li>Убедитесь, что сайт работает по HTTPS (или localhost)</li>
                <li>Проверьте настройки микрофона в браузере</li>
                <li>Если звук не слышен - нажмите "🔊 Включить звук принудительно"</li>
                <li>Откройте Developer Console (F12) для подробной debug информации</li>
                <li>При проблемах попробуйте перезагрузить страницу</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
