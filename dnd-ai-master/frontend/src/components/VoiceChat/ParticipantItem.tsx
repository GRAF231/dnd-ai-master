import React from 'react';
import { VoiceParticipant } from '@/hooks/useVoiceChat';
import { SpeakingIndicator } from './SpeakingIndicator';
import { VolumeSlider } from './VolumeSlider';

interface ParticipantItemProps {
  participant: VoiceParticipant;
  showControls?: boolean;
  onToggleMute?: () => void;
  onVolumeChange?: (participantId: string, volume: number) => void;
}

export const ParticipantItem: React.FC<ParticipantItemProps> = ({
  participant,
  showControls = false,
  onToggleMute,
  onVolumeChange
}) => {
  const { id, name, isLocal, isMuted, isSpeaking, connectionState, volume } = participant;

  return (
    <div className="bg-gray-700 p-3 rounded transition-colors hover:bg-gray-600">
      {/* Верхняя часть - основная информация */}
      <div className="flex items-center justify-between mb-2">
        {/* Участник информация */}
        <div className="flex items-center space-x-3">
          {/* Иконка участника */}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isLocal ? 'bg-purple-600' : 'bg-green-600'
          }`}>
            🎤
          </div>
          
          {/* Имя и статус */}
          <div>
            <div className="font-medium text-white text-sm">
              {name}
            </div>
            <div className="text-xs text-gray-400">
              {isLocal 
                ? (isMuted ? 'Микрофон выключен' : 'Говорит') 
                : connectionState
              }
            </div>
          </div>
        </div>

        {/* Индикатор говорения */}
        <SpeakingIndicator 
          isSpeaking={isSpeaking}
          isConnected={true}
          connectionState={connectionState}
        />
      </div>

      {/* Нижняя часть - controls */}
      <div className="flex items-center justify-between space-x-2">
        {/* Volume control для всех участников */}
        {onVolumeChange && (
          <VolumeSlider
            participantId={id}
            participantName={name}
            volume={volume}
            isMuted={isMuted}
            isLocal={isLocal}
            onVolumeChange={onVolumeChange}
            onToggleMute={isLocal ? onToggleMute : undefined}
            className="flex-1"
          />
        )}

        {/* Кнопка mute для локального участника (если нет volume control) */}
        {isLocal && showControls && onToggleMute && !onVolumeChange && (
          <button
            onClick={onToggleMute}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isMuted ? '🔇 Включить' : '🎤 Выключить'}
          </button>
        )}
      </div>
    </div>
  );
};
