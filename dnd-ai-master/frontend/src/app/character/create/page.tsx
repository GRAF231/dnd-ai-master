'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CharacterCreationWizard } from '@/components/CharacterCreation';

function CharacterCreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  
  // Получаем параметры из URL
  const roomId = searchParams.get('roomId') || '';
  const playerName = searchParams.get('playerName') || '';

  useEffect(() => {
    // Проверяем наличие обязательных параметров
    if (!roomId || !playerName) {
      // Перенаправляем на главную страницу если параметры отсутствуют
      router.push('/');
      return;
    }
    setIsLoading(false);
  }, [roomId, playerName, router]);

  const handleCharacterComplete = () => {
    // Возвращаемся в комнату с созданным персонажем
    router.push(`/room/${roomId}?playerName=${encodeURIComponent(playerName)}&characterCreated=true`);
  };

  const handleCancel = () => {
    // Возвращаемся в комнату без создания персонажа
    router.push(`/room/${roomId}?playerName=${encodeURIComponent(playerName)}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Загрузка мастера создания персонажа...</p>
        </div>
      </div>
    );
  }

  return (
    <CharacterCreationWizard
      roomId={roomId}
      playerName={playerName}
      onComplete={handleCharacterComplete}
      onCancel={handleCancel}
    />
  );
}

export default function CharacterCreatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Загрузка...</p>
        </div>
      </div>
    }>
      <CharacterCreateContent />
    </Suspense>
  );
}
