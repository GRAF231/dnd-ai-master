import { CharacterData } from '../CharacterCreationWizard';

interface RacialFeaturesStepProps {
  data: CharacterData;
  onChange: (updates: Partial<CharacterData>) => void;
}

// Расовые особенности
const RACIAL_FEATURES = {
  human: {
    name: 'Человек',
    features: [
      { name: 'Универсальность', description: '+1 ко всем характеристикам' },
      { name: 'Дополнительный навык', description: 'Владение одним дополнительным навыком' },
      { name: 'Дополнительный язык', description: 'Знание одного дополнительного языка' }
    ],
    bonuses: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 }
  },
  elf: {
    name: 'Эльф',
    features: [
      { name: 'Темное зрение', description: 'Видите в темноте на 60 футов' },
      { name: 'Острые чувства', description: 'Владение навыком Восприятие' },
      { name: 'Наследие фей', description: 'Преимущество против очарования' },
      { name: 'Транс', description: 'Не нужно спать, достаточно 4 часов медитации' }
    ],
    bonuses: { dexterity: 2 }
  },
  dwarf: {
    name: 'Дварф',
    features: [
      { name: 'Темное зрение', description: 'Видите в темноте на 60 футов' },
      { name: 'Дварфская стойкость', description: 'Сопротивление урону ядом' },
      { name: 'Знание камня', description: 'Владение инструментами каменщика' },
      { name: 'Дварфский боевой тренинг', description: 'Владение боевыми топорами и молотами' }
    ],
    bonuses: { constitution: 2 }
  },
  halfling: {
    name: 'Халфлинг',
    features: [
      { name: 'Удачливый', description: 'Можете перебросить 1 на d20' },
      { name: 'Храбрый', description: 'Преимущество против испуга' },
      { name: 'Проворство халфлинга', description: 'Можете проходить через пространство больших существ' },
      { name: 'Скрытность', description: 'Легко прячетесь за другими существами' }
    ],
    bonuses: { dexterity: 2 }
  }
};

export default function RacialFeaturesStep({ data }: RacialFeaturesStepProps) {
  const raceData = RACIAL_FEATURES[data.race as keyof typeof RACIAL_FEATURES];

  if (!raceData) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          🧝‍♀️ Расовые особенности
        </h2>
        <p className="text-gray-400">
          Сначала выберите расу на первом шаге
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          🧝‍♀️ Расовые особенности
        </h2>
        <p className="text-gray-400">
          Изучите уникальные способности расы {raceData.name}
        </p>
      </div>

      {/* Бонусы к характеристикам */}
      <div className="mb-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-xl font-semibold text-white mb-4">
          📈 Расовые бонусы к характеристикам
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(raceData.bonuses).map(([ability, bonus]) => (
            <div key={ability} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <span className="text-gray-300 capitalize">
                {ability === 'strength' && '💪 Сила'}
                {ability === 'dexterity' && '🤸 Ловкость'}
                {ability === 'constitution' && '🛡️ Телосложение'}
                {ability === 'intelligence' && '🧠 Интеллект'}
                {ability === 'wisdom' && '🦉 Мудрость'}
                {ability === 'charisma' && '✨ Харизма'}
              </span>
              <span className="text-green-400 font-bold">+{bonus}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Расовые способности */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">
          ⚡ Расовые способности
        </h3>
        <div className="space-y-4">
          {raceData.features.map((feature, index) => (
            <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="font-semibold text-white mb-2">
                {feature.name}
              </h4>
              <p className="text-gray-300">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Информационный блок */}
      <div className="mt-8 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
        <h4 className="font-semibold text-blue-300 mb-2">
          💡 Игровые советы
        </h4>
        <div className="text-blue-200 text-sm space-y-1">
          {data.race === 'human' && (
            <p>• Люди универсальны и подходят для любого класса благодаря бонусам ко всем характеристикам</p>
          )}
          {data.race === 'elf' && (
            <p>• Эльфы отлично подходят для классов, требующих ловкости: плуты, следопыты, воины-лучники</p>
          )}
          {data.race === 'dwarf' && (
            <p>• Дварфы превосходные воины и жрецы благодаря высокому телосложению и стойкости</p>
          )}
          {data.race === 'halfling' && (
            <p>• Халфлинги идеальны для плутов благодаря ловкости и способности к скрытности</p>
          )}
        </div>
      </div>
    </div>
  );
}
