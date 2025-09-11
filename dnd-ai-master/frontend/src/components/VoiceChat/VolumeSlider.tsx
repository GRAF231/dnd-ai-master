import React, { useState } from 'react';

interface VolumeSliderProps {
  participantId: string;
  participantName: string;
  volume: number;
  isMuted: boolean;
  isLocal?: boolean;
  onVolumeChange: (participantId: string, volume: number) => void;
  onToggleMute?: () => void;
  className?: string;
}

export const VolumeSlider: React.FC<VolumeSliderProps> = ({
  participantId,
  participantName,
  volume,
  isMuted,
  isLocal = false,
  onVolumeChange,
  onToggleMute,
  className = ''
}) => {
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    onVolumeChange(participantId, newVolume);
  };

  const getVolumeIcon = () => {
    if (isMuted) return '🔇';
    if (volume === 0) return '🔈';
    if (volume < 0.5) return '🔉';
    return '🔊';
  };

  const getVolumePercentage = () => {
    return Math.round(volume * 100);
  };

  const quickVolumeSet = (newVolume: number) => {
    onVolumeChange(participantId, newVolume);
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Индикатор громкости */}
      <div className="flex items-center space-x-1 px-2 py-1 bg-gray-600 rounded text-xs min-w-[50px]">
        <span>{getVolumeIcon()}</span>
        <span className="text-gray-300">{getVolumePercentage()}%</span>
      </div>

      {/* Слайдер громкости (всегда видимый) */}
      <div className="flex items-center space-x-2 bg-gray-700 rounded px-3 py-2 border border-gray-600">
        {/* Быстрые кнопки */}
        <div className="flex space-x-1">
          <button
            onClick={() => quickVolumeSet(0)}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
            title="Выключить"
          >
            🔇
          </button>
          <button
            onClick={() => quickVolumeSet(0.5)}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
            title="50%"
          >
            🔉
          </button>
          <button
            onClick={() => quickVolumeSet(1.0)}
            className="w-6 h-6 bg-gray-600 hover:bg-gray-500 rounded text-xs transition-colors"
            title="100%"
          >
            🔊
          </button>
        </div>

        {/* Основной слайдер */}
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={handleVolumeChange}
            className="w-20 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer volume-slider"
            style={{
              background: `linear-gradient(to right, #7c3aed 0%, #7c3aed ${volume * 100}%, #4b5563 ${volume * 100}%, #4b5563 100%)`
            }}
          />
          <span className="text-xs text-gray-300 w-8 text-right">
            {getVolumePercentage()}%
          </span>
        </div>

        {/* Кнопка mute для локального участника */}
        {isLocal && onToggleMute && (
          <button
            onClick={onToggleMute}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isMuted ? 'Вкл' : 'Выкл'}
          </button>
        )}
      </div>

      {/* Кастомные стили для слайдера */}
      <style jsx>{`
        .volume-slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #7c3aed;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .volume-slider::-webkit-slider-thumb:hover {
          background: #6d28d9;
          transform: scale(1.1);
        }

        .volume-slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #7c3aed;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .volume-slider::-moz-range-thumb:hover {
          background: #6d28d9;
          transform: scale(1.1);
        }
      `}</style>
    </div>
  );
};
