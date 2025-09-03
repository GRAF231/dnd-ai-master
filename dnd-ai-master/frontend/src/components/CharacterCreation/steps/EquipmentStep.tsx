import { useState } from 'react';
import { CharacterData } from '../CharacterCreationWizard';

interface EquipmentStepProps {
  data: CharacterData;
  onChange: (updates: Partial<CharacterData>) => void;
}

// Стартовое снаряжение по классам
const STARTING_EQUIPMENT = {
  fighter: {
    name: 'Воин',
    choices: [
      {
        category: 'Доспехи',
        options: [
          { name: 'Кольчуга + Щит', ac: '16 (13 + Лов (макс 2) + 2)', description: 'Стандартная защита' },
          { name: 'Кожаные доспехи', ac: '11 + Лов', description: 'Легкая защита, больше мобильности' }
        ]
      },
      {
        category: 'Оружие',
        options: [
          { name: 'Длинный меч + Щит', description: 'Универсальное оружие (1d8 или 1d10)' },
          { name: 'Двуручный меч', description: 'Мощное оружие двумя руками (2d6)' },
          { name: 'Длинный лук + 20 стрел', description: 'Дальнобойное оружие (1d8)' }
        ]
      }
    ],
    baseEquipment: ['Исследовательский набор', '2 кинжала', 'Простое оружие']
  },
  wizard: {
    name: 'Волшебник',
    choices: [
      {
        category: 'Оружие',
        options: [
          { name: 'Кинжал', description: 'Легкое, метательное (1d4)' },
          { name: 'Дротик x3', description: 'Метательное оружие (1d4)' }
        ]
      },
      {
        category: 'Фокус',
        options: [
          { name: 'Компонентная сумка', description: 'Материальные компоненты заклинаний' },
          { name: 'Магический фокус', description: 'Жезл, посох или орб' }
        ]
      }
    ],
    baseEquipment: ['Книга заклинаний', 'Исследовательский набор', 'Кожаные доспехи (AC 11 + Лов)']
  },
  rogue: {
    name: 'Плут',
    choices: [
      {
        category: 'Оружие',
        options: [
          { name: 'Рапира', description: 'Изящное оружие (1d8)' },
          { name: 'Короткий меч', description: 'Легкое оружие (1d6)' }
        ]
      },
      {
        category: 'Дальнобойное',
        options: [
          { name: 'Короткий лук + 20 стрел', description: 'Компактный лук (1d6)' },
          { name: 'Метательные кинжалы x5', description: 'Скрытное оружие (1d4)' }
        ]
      }
    ],
    baseEquipment: ['Кожаные доспехи (AC 11 + Лов)', '2 кинжала', 'Воровские инструменты', 'Исследовательский набор']
  },
  cleric: {
    name: 'Жрец',
    choices: [
      {
        category: 'Доспехи',
        options: [
          { name: 'Чешуйчатые доспехи', ac: 'AC 14 + Лов (макс 2)', description: 'Средняя защита' },
          { name: 'Кольчуга', ac: 'AC 16', description: 'Тяжелая защита, недостаток скрытности' }
        ]
      },
      {
        category: 'Оружие',
        options: [
          { name: 'Булава + Щит', description: 'Простое оружие (1d6) + защита' },
          { name: 'Боевой молот', description: 'Универсальное оружие (1d8/1d10)' }
        ]
      }
    ],
    baseEquipment: ['Священный символ', 'Исследовательский набор', '5 дротиков']
  }
};

export default function EquipmentStep({ data, onChange }: EquipmentStepProps) {
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const classEquipment = STARTING_EQUIPMENT[data.class as keyof typeof STARTING_EQUIPMENT];

  const handleChoiceSelect = (category: string, choice: string) => {
    const newChoices = { ...selectedChoices, [category]: choice };
    setSelectedChoices(newChoices);
    
    // Обновляем снаряжение
    const equipment = [
      ...classEquipment.baseEquipment,
      ...Object.values(newChoices)
    ];
    onChange({ equipment });
  };

  if (!classEquipment) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          🎒 Снаряжение
        </h2>
        <p className="text-gray-400">
          Сначала выберите класс на первом шаге
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          🎒 Снаряжение
        </h2>
        <p className="text-gray-400">
          Выберите стартовое снаряжение для класса {classEquipment.name}
        </p>
      </div>

      {/* Выборы снаряжения */}
      <div className="space-y-8">
        {classEquipment.choices.map((choice, index) => (
          <div key={index}>
            <h3 className="text-xl font-semibold text-white mb-4">
              {choice.category}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {choice.options.map((option, optionIndex) => {
                const isSelected = selectedChoices[choice.category] === option.name;
                
                return (
                  <button
                    key={optionIndex}
                    onClick={() => handleChoiceSelect(choice.category, option.name)}
                    className={`
                      p-4 rounded-lg border-2 text-left transition-all
                      ${isSelected
                        ? 'border-purple-500 bg-purple-900/50 text-white'
                        : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{option.name}</h4>
                      {isSelected && <span className="text-purple-400">✓</span>}
                    </div>
                    {option.ac && (
                      <p className="text-sm text-blue-300 mb-1">
                        🛡️ {option.ac}
                      </p>
                    )}
                    <p className="text-sm opacity-75">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Базовое снаряжение */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold text-white mb-4">
          📦 Базовое снаряжение (получаете автоматически)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {classEquipment.baseEquipment.map((item, index) => (
            <div key={index} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <span className="text-gray-300">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Итоговое снаряжение */}
      {data.equipment.length > 0 && (
        <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            ✨ Ваше снаряжение
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.equipment.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-green-400">•</span>
                <span className="text-gray-300">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Игровые советы */}
      <div className="mt-8 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
        <h4 className="font-semibold text-blue-300 mb-2">
          💡 Советы по снаряжению
        </h4>
        <div className="text-blue-200 text-sm space-y-1">
          {data.class === 'fighter' && (
            <>
              <p>• Меч + щит - универсальный выбор для начинающих воинов</p>
              <p>• Двуручное оружие дает больше урона, но теряется защита щита</p>
            </>
          )}
          {data.class === 'wizard' && (
            <>
              <p>• Волшебники полагаются на заклинания, а не на физическое оружие</p>
              <p>• Держитесь подальше от врагов и используйте дальнобойные атаки</p>
            </>
          )}
          {data.class === 'rogue' && (
            <>
              <p>• Рапира дает больше урона и подходит для изящных атак</p>
              <p>• Используйте скрытность и внезапные атаки для максимального эффекта</p>
            </>
          )}
          {data.class === 'cleric' && (
            <>
              <p>• Жрецы могут носить тяжелые доспехи и сражаться в ближнем бою</p>
              <p>• Не забывайте о целительных заклинаниях для поддержки группы</p>
            </>
          )}
        </div>
      </div>

      {/* Информация о завершении */}
      <div className="mt-8 p-6 bg-green-900/30 border border-green-500/50 rounded-lg">
        <h4 className="font-semibold text-green-300 mb-2">
          🎉 Почти готово!
        </h4>
        <p className="text-green-200 text-sm">
          Вы почти завершили создание персонажа! Проверьте все настройки и нажмите 
          "Создать персонажа" для завершения процесса.
        </p>
      </div>
    </div>
  );
}
