'use client';

import { useState } from 'react';
import { charactersApi, CreateCharacterData, Character } from '@/utils/charactersApi';

// Компоненты шагов
import BasicInfoStep from './steps/BasicInfoStep';
import AbilitiesStep from './steps/AbilitiesStep';
import RacialFeaturesStep from './steps/RacialFeaturesStep';
import ClassSkillsStep from './steps/ClassSkillsStep';
import EquipmentStep from './steps/EquipmentStep';

// Типы для данных персонажа
export interface CharacterData {
  // Базовая информация
  name: string;
  race: string;
  class: string;
  background: string;
  level: number;
  
  // Характеристики
  abilities: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  
  // Дополнительная информация
  hitPoints: number;
  armorClass: number;
  skills: string[];
  equipment: string[];
}

// Определяем шаги
const STEPS = [
  { id: 1, title: 'Основы', description: 'Имя, раса, класс', icon: '👤' },
  { id: 2, title: 'Характеристики', description: 'STR, DEX, CON...', icon: '💪' },
  { id: 3, title: 'Расовые черты', description: 'Особенности расы', icon: '🧝‍♀️' },
  { id: 4, title: 'Навыки класса', description: 'Умения и заклинания', icon: '⚔️' },
  { id: 5, title: 'Снаряжение', description: 'Оружие и экипировка', icon: '🎒' }
];

interface CharacterCreationWizardProps {
  roomId: string;
  playerName: string;
  onComplete: (character: Character) => void;
  onCancel: () => void;
}

export default function CharacterCreationWizard({ 
  roomId, 
  playerName, 
  onComplete, 
  onCancel 
}: CharacterCreationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Состояние данных персонажа
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: '',
    race: '',
    class: '',
    background: 'Folk Hero',
    level: 1,
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10
    },
    hitPoints: 0,
    armorClass: 10,
    skills: [],
    equipment: []
  });

  // Функция для обновления данных
  const updateCharacterData = (updates: Partial<CharacterData>) => {
    setCharacterData(prev => ({ ...prev, ...updates }));
  };

  // Проверка валидности текущего шага
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(characterData.name && characterData.race && characterData.class);
      case 2:
        return Object.values(characterData.abilities).every(val => val >= 8 && val <= 18);
      case 3:
      case 4:
      case 5:
        return true;
      default:
        return false;
    }
  };

  // Переход к следующему шагу
  const handleNext = () => {
    if (currentStep < STEPS.length && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Переход к предыдущему шагу
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Переход к конкретному шагу
  const handleStepClick = (step: number) => {
    // Можно перейти только к уже пройденным шагам или следующему валидному
    if (step <= currentStep || (step === currentStep + 1 && isStepValid(currentStep))) {
      setCurrentStep(step);
    }
  };

  // Завершение создания персонажа
  const handleComplete = async () => {
    if (!isStepValid(currentStep)) return;
    
    setIsSubmitting(true);
    try {
      // Создаем данные для API
      const createData: CreateCharacterData = {
        name: characterData.name,
        race: characterData.race,
        class: characterData.class,
        abilities: characterData.abilities,
        roomId,
        playerName,
        level: characterData.level,
        background: characterData.background
      };

      // Отправляем данные через REST API
      const character = await charactersApi.createCharacter(createData);
      console.log('Character created successfully:', character);
      
      // Передаем созданного персонажа в onComplete
      onComplete(character);
    } catch (error) {
      console.error('Error creating character:', error);
      // TODO: Показать пользователю ошибку
    } finally {
      setIsSubmitting(false);
    }
  };

  // Рендер текущего шага
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep 
            data={characterData} 
            onChange={updateCharacterData}
          />
        );
      case 2:
        return (
          <AbilitiesStep 
            data={characterData} 
            onChange={updateCharacterData}
          />
        );
      case 3:
        return (
          <RacialFeaturesStep 
            data={characterData} 
            onChange={updateCharacterData}
          />
        );
      case 4:
        return (
          <ClassSkillsStep 
            data={characterData} 
            onChange={updateCharacterData}
          />
        );
      case 5:
        return (
          <EquipmentStep 
            data={characterData} 
            onChange={updateCharacterData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Боковая навигация */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Заголовок */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white mb-2">
            🧙‍♂️ Создание персонажа
          </h1>
          <p className="text-gray-400 text-sm">
            Пошаговое создание героя для D&D 5e
          </p>
        </div>

        {/* Список шагов */}
        <div className="flex-1 p-4 space-y-2">
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isAccessible = step.id <= currentStep || 
              (step.id === currentStep + 1 && isStepValid(currentStep));

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                disabled={!isAccessible}
                className={`
                  w-full p-4 rounded-lg text-left transition-all
                  ${isActive 
                    ? 'bg-purple-600 text-white' 
                    : isCompleted 
                      ? 'bg-green-900/50 text-green-300 hover:bg-green-900/70' 
                      : isAccessible
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{step.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-medium">{step.title}</h3>
                    <p className="text-sm opacity-75">{step.description}</p>
                  </div>
                  {isCompleted && (
                    <span className="text-green-400">✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Кнопка отмены */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-md transition-colors"
          >
            ← Вернуться в игру
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex-1 flex flex-col">
        {/* Прогресс-бар (мобильная версия) */}
        <div className="lg:hidden bg-gray-800 p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-medium">
              Шаг {currentStep} из {STEPS.length}
            </span>
            <span className="text-gray-400">
              {Math.round((currentStep / STEPS.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Контент шага */}
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {renderCurrentStep()}
        </div>

        {/* Навигационные кнопки */}
        <div className="p-6 lg:p-8 border-t border-gray-700 bg-gray-800">
          <div className="flex justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`
                px-6 py-2 font-medium rounded-md transition-colors
                ${currentStep === 1
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 hover:bg-gray-700 text-white'
                }
              `}
            >
              ← Назад
            </button>

            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid(currentStep)}
                className={`
                  px-6 py-2 font-medium rounded-md transition-colors
                  ${!isStepValid(currentStep)
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }
                `}
              >
                Далее →
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={!isStepValid(currentStep) || isSubmitting}
                className={`
                  px-8 py-2 font-medium rounded-md transition-colors
                  ${!isStepValid(currentStep) || isSubmitting
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  }
                `}
              >
                {isSubmitting ? 'Создание...' : '✨ Создать персонажа'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
