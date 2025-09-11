import React from 'react';

interface VoiceControlsProps {
  isConnected: boolean;
  isMuted: boolean;
  isInitializing: boolean;
  participantCount: number;
  onToggleMute: () => void;
  onToggleVoice: () => void;
  onForcePlayAudio?: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isConnected,
  isMuted,
  isInitializing,
  participantCount,
  onToggleMute,
  onToggleVoice,
  onForcePlayAudio
}) => {
  const isDisabled = isInitializing;

  return (
    <div className="space-y-3">
      {/* Основные кнопки управления */}
      <div className="flex space-x-2">
        {!isConnected ? (
          <button
            onClick={onToggleVoice}
            disabled={isDisabled}
            className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
          >
            {isInitializing ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Подключение...
              </>
            ) : (
              <>🎤 Подключиться</>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={onToggleMute}
              disabled={isDisabled}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                isMuted 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              } disabled:bg-gray-600`}
            >
              {isMuted ? '🔇 Включить' : '🎤 Выключить'}
            </button>
            
            <button
              onClick={onToggleVoice}
              disabled={isDisabled}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
            >
              📞 Отключиться
            </button>
          </>
        )}
      </div>

      {/* Кнопка принудительного воспроизведения (если есть другие участники) */}
      {isConnected && participantCount > 1 && onForcePlayAudio && (
        <button
          onClick={onForcePlayAudio}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
        >
          🔊 Включить звук принудительно
        </button>
      )}

      {/* Статус подключения */}
      <div className="text-xs text-gray-400 space-y-1">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
          <span>Голосовой чат: {isConnected ? 'Активен' : 'Неактивен'}</span>
        </div>
        {isConnected && (
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span>Микрофон: {isMuted ? 'Отключен' : 'Включен'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
