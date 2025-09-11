'use client';

import React, { useState } from 'react';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { ParticipantItem } from './ParticipantItem';
import { VoiceControls } from './VoiceControls';

interface VoicePanelProps {
  roomId: string;
  playerName: string;
  className?: string;
}

export const VoicePanel: React.FC<VoicePanelProps> = ({
  roomId,
  playerName,
  className = ''
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const {
    participants,
    isConnected,
    connectionStates,
    isInitializing,
    isMuted,
    joinVoiceChat,
    leaveVoiceChat,
    toggleMute,
    forcePlayAllAudio,
    setParticipantVolume
  } = useVoiceChat();

  const handleToggleVoice = async () => {
    if (isConnected) {
      leaveVoiceChat();
    } else {
      try {
        await joinVoiceChat(roomId, playerName);
      } catch (error) {
        console.error('Voice chat join error:', error);
        // TODO: Показать пользователю ошибку
      }
    }
  };

  const localParticipant = participants.find(p => p.isLocal);
  const remoteParticipants = participants.filter(p => !p.isLocal);

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 h-full flex flex-col ${className}`}>
      {/* Заголовок с возможностью сворачивания */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-white">🎙️ Голосовая связь</h3>
          {isConnected && (
            <span className="px-2 py-1 bg-green-600 text-xs rounded text-white">
              {participants.length}
            </span>
          )}
        </div>
        
        {/* Кнопки управления заголовка */}
        <div className="flex items-center space-x-1">
          {/* Debug toggle (скрытая кнопка, активируется двойным кликом) */}
          <button
            onDoubleClick={() => setShowDebugInfo(!showDebugInfo)}
            className="text-gray-400 hover:text-white transition-colors text-xs"
            title="Двойной клик для debug режима"
          >
            ⚙️
          </button>
          
          {/* Кнопка сворачивания (для мобильных) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="md:hidden text-gray-400 hover:text-white transition-colors"
          >
            {isCollapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Основное содержимое */}
      {!isCollapsed && (
        <div className="flex-1 flex flex-col p-4 space-y-4 overflow-hidden">
          {/* Элементы управления */}
          <VoiceControls
            isConnected={isConnected}
            isMuted={isMuted}
            isInitializing={isInitializing}
            participantCount={participants.length}
            onToggleMute={toggleMute}
            onToggleVoice={handleToggleVoice}
            onForcePlayAudio={remoteParticipants.length > 0 ? forcePlayAllAudio : undefined}
          />

          {/* Список участников */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3">
              {/* Локальный участник (вы) */}
              {localParticipant && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Вы</h4>
                  <ParticipantItem
                    participant={localParticipant}
                    showControls={isConnected}
                    onToggleMute={toggleMute}
                    onVolumeChange={setParticipantVolume}
                  />
                </div>
              )}

              {/* Удаленные участники */}
              {remoteParticipants.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">
                    Другие игроки ({remoteParticipants.length})
                  </h4>
                  <div className="space-y-2">
                    {remoteParticipants.map((participant) => (
                      <ParticipantItem
                        key={participant.id}
                        participant={participant}
                        onVolumeChange={setParticipantVolume}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Пустое состояние */}
              {participants.length === 0 && (
                <div className="text-center py-6">
                  <div className="text-gray-500 text-sm">
                    {isConnected 
                      ? 'Ожидание других игроков...' 
                      : 'Подключитесь к голосовому чату'
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Debug информация */}
          {showDebugInfo && Object.keys(connectionStates).length > 0 && (
            <div className="border-t border-gray-700 pt-3">
              <div className="text-xs text-gray-400 space-y-1">
                <div className="font-medium">🔧 Debug информация:</div>
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

          {/* Подсказки для новых пользователей */}
          {!isConnected && (
            <div className="border-t border-gray-700 pt-3">
              <div className="text-xs text-gray-400">
                <p className="mb-1">💡 Подключитесь для голосового общения</p>
                <p>Убедитесь, что разрешили доступ к микрофону</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Свернутое состояние */}
      {isCollapsed && (
        <div className="p-4">
          <div className="text-sm text-gray-400 text-center">
            {isConnected ? `🎙️ ${participants.length} участников` : '🎙️ Голосовая связь'}
          </div>
        </div>
      )}
    </div>
  );
};
