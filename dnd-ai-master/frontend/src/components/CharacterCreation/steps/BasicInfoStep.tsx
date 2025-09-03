import { CharacterData } from '../CharacterCreationWizard';

interface BasicInfoStepProps {
  data: CharacterData;
  onChange: (updates: Partial<CharacterData>) => void;
}

// Доступные расы
const RACES = [
  { id: 'human', name: 'Человек', description: '+1 ко всем характеристикам', icon: '👤' },
  { id: 'elf', name: 'Эльф', description: '+2 Ловкость, темное зрение', icon: '🧝‍♀️' },
  { id: 'dwarf', name: 'Дварф', description: '+2 Телосложение, сопротивление яду', icon: '🧔' },
  { id: 'halfling', name: 'Халфлинг', description: '+2 Ловкость, удача', icon: '🍀' }
];

// Доступные классы
const CLASSES = [
  { id: 'fighter', name: 'Воин', description: 'Мастер боя и тактики', icon: '⚔️' },
  { id: 'wizard', name: 'Волшебник', description: 'Изучающий магию ученый', icon: '🧙‍♂️' },
  { id: 'rogue', name: 'Плут', description: 'Мастер скрытности и ловкости', icon: '🗡️' },
  { id: 'cleric', name: 'Жрец', description: 'Целитель и защитник', icon: '⛪' }
];

// Доступные предыстории
const BACKGROUNDS = [
  { id: 'folk_hero', name: 'Народный герой', description: 'Простолюдин ставший героем' },
  { id: 'soldier', name: 'Солдат', description: 'Опытный военный' },
  { id: 'criminal', name: 'Преступник', description: 'Вор или мошенник' },
  { id: 'acolyte', name: 'Послушник', description: 'Служитель храма' }
];

export default function BasicInfoStep({ data, onChange }: BasicInfoStepProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          👤 Основная информация
        </h2>
        <p className="text-gray-400">
          Задайте базовые характеристики вашего персонажа
        </p>
      </div>

      <div className="space-y-8">
        {/* Имя персонажа */}
        <div>
          <label className="block text-lg font-semibold text-white mb-3">
            Имя персонажа
          </label>
          <input
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Введите имя героя..."
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
          />
          {!data.name && (
            <p className="mt-2 text-sm text-gray-400">
              💡 Выберите запоминающееся имя для вашего героя
            </p>
          )}
        </div>

        {/* Раса */}
        <div>
          <label className="block text-lg font-semibold text-white mb-4">
            Раса
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {RACES.map((race) => (
              <button
                key={race.id}
                onClick={() => onChange({ race: race.id })}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all hover:scale-105
                  ${data.race === race.id
                    ? 'border-purple-500 bg-purple-900/50 text-white'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }
                `}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">{race.icon}</span>
                  <h3 className="font-semibold text-lg">{race.name}</h3>
                </div>
                <p className="text-sm opacity-75">{race.description}</p>
              </button>
            ))}
          </div>
          {!data.race && (
            <p className="mt-3 text-sm text-gray-400">
              💡 Раса влияет на характеристики и способности персонажа
            </p>
          )}
        </div>

        {/* Класс */}
        <div>
          <label className="block text-lg font-semibold text-white mb-4">
            Класс
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CLASSES.map((characterClass) => (
              <button
                key={characterClass.id}
                onClick={() => onChange({ class: characterClass.id })}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all hover:scale-105
                  ${data.class === characterClass.id
                    ? 'border-purple-500 bg-purple-900/50 text-white'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }
                `}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl">{characterClass.icon}</span>
                  <h3 className="font-semibold text-lg">{characterClass.name}</h3>
                </div>
                <p className="text-sm opacity-75">{characterClass.description}</p>
              </button>
            ))}
          </div>
          {!data.class && (
            <p className="mt-3 text-sm text-gray-400">
              💡 Класс определяет основные способности и стиль игры
            </p>
          )}
        </div>

        {/* Предыстория */}
        <div>
          <label className="block text-lg font-semibold text-white mb-4">
            Предыстория
          </label>
          <div className="space-y-2">
            {BACKGROUNDS.map((background) => (
              <button
                key={background.id}
                onClick={() => onChange({ background: background.name })}
                className={`
                  w-full p-3 rounded-lg border text-left transition-all
                  ${data.background === background.name
                    ? 'border-purple-500 bg-purple-900/30 text-white'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }
                `}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">{background.name}</h4>
                    <p className="text-sm opacity-75">{background.description}</p>
                  </div>
                  {data.background === background.name && (
                    <span className="text-purple-400">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Превью персонажа */}
        {data.name && data.race && data.class && (
          <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">
              ✨ Превью персонажа
            </h3>
            <div className="text-gray-300">
              <p className="text-xl font-medium text-white mb-2">
                {data.name}
              </p>
              <p>
                <span className="text-gray-400">Раса:</span> {RACES.find(r => r.id === data.race)?.name}
              </p>
              <p>
                <span className="text-gray-400">Класс:</span> {CLASSES.find(c => c.id === data.class)?.name}
              </p>
              <p>
                <span className="text-gray-400">Предыстория:</span> {data.background}
              </p>
              <p>
                <span className="text-gray-400">Уровень:</span> {data.level}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
