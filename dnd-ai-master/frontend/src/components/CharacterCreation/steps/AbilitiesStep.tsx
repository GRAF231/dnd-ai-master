import { useState } from 'react';
import { CharacterData } from '../CharacterCreationWizard';

interface AbilitiesStepProps {
  data: CharacterData;
  onChange: (updates: Partial<CharacterData>) => void;
}

// Информация о характеристиках
const ABILITIES = [
  {
    key: 'strength' as keyof CharacterData['abilities'],
    name: 'Сила',
    shortName: 'STR',
    description: 'Физическая мощь, влияет на атаку в ближнем бою и поднятие тяжестей',
    icon: '💪',
    examples: 'Лазание, прыжки, удары мечом'
  },
  {
    key: 'dexterity' as keyof CharacterData['abilities'],
    name: 'Ловкость',
    shortName: 'DEX',
    description: 'Быстрота и координация, влияет на класс брони и атаки дальнего боя',
    icon: '🤸',
    examples: 'Уклонение, стрельба из лука, скрытность'
  },
  {
    key: 'constitution' as keyof CharacterData['abilities'],
    name: 'Телосложение',
    shortName: 'CON',
    description: 'Выносливость и здоровье, влияет на количество хитов',
    icon: '🛡️',
    examples: 'Сопротивление болезням, выносливость'
  },
  {
    key: 'intelligence' as keyof CharacterData['abilities'],
    name: 'Интеллект',
    shortName: 'INT',
    description: 'Способность к рассуждению и памяти, важен для волшебников',
    icon: '🧠',
    examples: 'Исследование, знание истории, магия'
  },
  {
    key: 'wisdom' as keyof CharacterData['abilities'],
    name: 'Мудрость',
    shortName: 'WIS',
    description: 'Проницательность и осознанность, важна для жрецов',
    icon: '🦉',
    examples: 'Восприятие, медицина, выживание'
  },
  {
    key: 'charisma' as keyof CharacterData['abilities'],
    name: 'Харизма',
    shortName: 'CHA',
    description: 'Сила личности и способность влиять на других',
    icon: '✨',
    examples: 'Убеждение, обман, выступление'
  }
];

// Методы распределения очков
const POINT_BUY_METHODS = [
  {
    id: 'point_buy',
    name: 'Покупка очков',
    description: 'Распределите 27 очков между характеристиками (8-15)',
    recommended: true
  },
  {
    id: 'standard_array',
    name: 'Стандартный набор',
    description: 'Используйте фиксированные значения: 15, 14, 13, 12, 10, 8',
    recommended: false
  },
  {
    id: 'manual',
    name: 'Ручная настройка',
    description: 'Установите значения вручную (8-18)',
    recommended: false
  }
];

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

export default function AbilitiesStep({ data, onChange }: AbilitiesStepProps) {
  const [method, setMethod] = useState<string>('point_buy');

  // Вычисляем модификатор характеристики
  const getModifier = (score: number): number => {
    return Math.floor((score - 10) / 2);
  };

  // Вычисляем потраченные очки для point buy
  const getPointCost = (score: number): number => {
    if (score <= 13) return score - 8;
    if (score === 14) return 7;
    if (score === 15) return 9;
    return 0;
  };

  const getTotalPointsSpent = (): number => {
    return Object.values(data.abilities).reduce((total, score) => {
      return total + getPointCost(score);
    }, 0);
  };

  // Обновляем характеристику
  const updateAbility = (ability: keyof CharacterData['abilities'], value: number) => {
    const newAbilities = { ...data.abilities, [ability]: value };
    onChange({ abilities: newAbilities });
  };

  // Быстрая установка значений
  const setQuickArray = (values: number[]) => {
    const newAbilities = { ...data.abilities };
    ABILITIES.forEach((ability, index) => {
      newAbilities[ability.key] = values[index] || 10;
    });
    onChange({ abilities: newAbilities });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          💪 Характеристики
        </h2>
        <p className="text-gray-400">
          Определите базовые способности вашего персонажа
        </p>
      </div>

      {/* Методы генерации */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">
          Метод распределения
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {POINT_BUY_METHODS.map((methodOption) => (
            <button
              key={methodOption.id}
              onClick={() => setMethod(methodOption.id)}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${method === methodOption.id
                  ? 'border-purple-500 bg-purple-900/50 text-white'
                  : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">{methodOption.name}</h4>
                {methodOption.recommended && (
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                    РЕКОМЕНДУЕТСЯ
                  </span>
                )}
              </div>
              <p className="text-sm opacity-75">{methodOption.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Point Buy информация */}
      {method === 'point_buy' && (
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-blue-300 font-medium">
              📊 Потрачено очков: {getTotalPointsSpent()} / 27
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => setQuickArray([15, 14, 13, 12, 10, 8])}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
              >
                Balanced
              </button>
              <button
                onClick={() => setQuickArray([15, 15, 15, 8, 8, 8])}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded"
              >
                Focused
              </button>
            </div>
          </div>
          {getTotalPointsSpent() > 27 && (
            <p className="text-red-400 text-sm mt-2">
              ⚠️ Превышен лимит очков! Уменьшите некоторые характеристики.
            </p>
          )}
        </div>
      )}

      {/* Характеристики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ABILITIES.map((ability) => {
          const score = data.abilities[ability.key];
          const modifier = getModifier(score);
          const isValidPointBuy = method !== 'point_buy' || getTotalPointsSpent() <= 27;
          
          return (
            <div key={ability.key} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              {/* Заголовок */}
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-3xl">{ability.icon}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {ability.name}
                  </h3>
                  <p className="text-sm text-gray-400">{ability.shortName}</p>
                </div>
              </div>

              {/* Значение */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300">Значение:</span>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${
                      isValidPointBuy ? 'text-white' : 'text-red-400'
                    }`}>
                      {score}
                    </span>
                    <span className={`ml-2 text-sm ${
                      modifier >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ({modifier >= 0 ? '+' : ''}{modifier})
                    </span>
                  </div>
                </div>

                {/* Слайдер или кнопки */}
                {method === 'manual' || method === 'point_buy' ? (
                  <div className="space-y-3">
                    <input
                      type="range"
                      min={method === 'point_buy' ? 8 : 3}
                      max={method === 'point_buy' ? 15 : 18}
                      value={score}
                      onChange={(e) => updateAbility(ability.key, parseInt(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex space-x-1">
                      <button
                        onClick={() => updateAbility(ability.key, Math.max(score - 1, method === 'point_buy' ? 8 : 3))}
                        className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
                      >
                        -
                      </button>
                      <button
                        onClick={() => updateAbility(ability.key, Math.min(score + 1, method === 'point_buy' ? 15 : 18))}
                        className="flex-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Описание */}
              <div className="text-xs text-gray-400 space-y-1">
                <p>{ability.description}</p>
                <p className="text-gray-500">{ability.examples}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Стандартный набор */}
      {method === 'standard_array' && (
        <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            🎯 Распределение стандартного набора
          </h3>
          <p className="text-gray-400 mb-4">
            Перетащите значения к характеристикам: {STANDARD_ARRAY.join(', ')}
          </p>
          <button
            onClick={() => setQuickArray(STANDARD_ARRAY)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
          >
            Применить стандартное распределение
          </button>
        </div>
      )}

      {/* Итоговая статистика */}
      <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">
          📊 Итоговая статистика
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Сумма характеристик:</span>
            <span className="ml-2 text-white font-medium">
              {Object.values(data.abilities).reduce((sum, val) => sum + val, 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Средняя:</span>
            <span className="ml-2 text-white font-medium">
              {(Object.values(data.abilities).reduce((sum, val) => sum + val, 0) / 6).toFixed(1)}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Сумма модификаторов:</span>
            <span className="ml-2 text-white font-medium">
              {Object.values(data.abilities).reduce((sum, val) => sum + getModifier(val), 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
