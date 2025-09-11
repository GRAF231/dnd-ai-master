import React from 'react';

interface SpeakingIndicatorProps {
  isSpeaking: boolean;
  isConnected: boolean;
  connectionState?: string;
}

export const SpeakingIndicator: React.FC<SpeakingIndicatorProps> = ({
  isSpeaking,
  isConnected,
  connectionState = 'new'
}) => {
  const getIndicatorColor = () => {
    if (!isConnected) return 'bg-gray-500';
    if (connectionState === 'failed') return 'bg-red-500';
    if (connectionState === 'connecting') return 'bg-yellow-500';
    if (isSpeaking) return 'bg-green-500 animate-pulse';
    return 'bg-green-500';
  };

  const getIndicatorTooltip = () => {
    if (!isConnected) return 'Не подключен';
    if (connectionState === 'failed') return 'Ошибка подключения';
    if (connectionState === 'connecting') return 'Подключается...';
    if (isSpeaking) return 'Говорит';
    return 'Подключен';
  };

  return (
    <div 
      className={`w-3 h-3 rounded-full ${getIndicatorColor()}`}
      title={getIndicatorTooltip()}
    />
  );
};
