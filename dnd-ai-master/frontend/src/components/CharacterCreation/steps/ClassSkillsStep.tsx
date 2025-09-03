import { CharacterData } from '../CharacterCreationWizard';

interface ClassSkillsStepProps {
  data: CharacterData;
  onChange: (updates: Partial<CharacterData>) => void;
}

// Навыки классов
const CLASS_SKILLS = {
  fighter: {
    name: 'Воин',
    hitDie: 'd10',
    primaryAbility: 'Сила или Ловкость',
    savingThrows: ['Сила', 'Телосложение'],
    skillChoices: ['Акробатика', 'Обращение с животными', 'Атлетика', 'История', 'Проницательность', 'Запугивание', 'Восприятие', 'Выживание'],
    skillCount: 2,
    features: [
      { name: 'Стиль боя', description: 'Выберите специализацию: Защита, Дуэль, Стрельба или Сражение двумя оружиями' },
      { name: 'Second Wind', description: 'Восстановите 1d10+1 хитов как бонусное действие' }
    ]
  },
  wizard: {
    name: 'Волшебник',
    hitDie: 'd6',
    primaryAbility: 'Интеллект',
    savingThrows: ['Интеллект', 'Мудрость'],
    skillChoices: ['Магия', 'История', 'Проницательность', 'Медицина', 'Религия', 'Расследование'],
    skillCount: 2,
    features: [
      { name: 'Заклинания', description: 'Знаете 3 заклинания 0-го уровня и 6 заклинаний 1-го уровня' },
      { name: 'Книга заклинаний', description: 'Записывайте новые заклинания в книгу' },
      { name: 'Ритуальное колдовство', description: 'Можете сотворять заклинания как ритуалы' }
    ]
  },
  rogue: {
    name: 'Плут',
    hitDie: 'd8',
    primaryAbility: 'Ловкость',
    savingThrows: ['Ловкость', 'Интеллект'],
    skillChoices: ['Акробатика', 'Атлетика', 'Обман', 'Проницательность', 'Запугивание', 'Расследование', 'Восприятие', 'Выступление', 'Убеждение', 'Ловкость рук', 'Скрытность', 'Выживание'],
    skillCount: 4,
    features: [
      { name: 'Скрытая атака', description: '+1d6 урона при преимуществе на атаку' },
      { name: 'Воровской жаргон', description: 'Тайный язык воров и мошенников' },
      { name: 'Экспертиза', description: 'Удвойте бонус мастерства для двух навыков' }
    ]
  },
  cleric: {
    name: 'Жрец',
    hitDie: 'd8',
    primaryAbility: 'Мудрость',
    savingThrows: ['Мудрость', 'Харизма'],
    skillChoices: ['История', 'Проницательность', 'Медицина', 'Убеждение', 'Религия'],
    skillCount: 2,
    features: [
      { name: 'Заклинания', description: 'Знаете все заклинания жреца своего уровня' },
      { name: 'Божественный домен', description: 'Выберите домен: Жизнь, Свет, Знание, Обман, Природа, Буря, Война' },
      { name: 'Путь к богам', description: 'Можете использовать священный символ как фокус заклинаний' }
    ]
  }
};

export default function ClassSkillsStep({ data, onChange }: ClassSkillsStepProps) {
  const classData = CLASS_SKILLS[data.class as keyof typeof CLASS_SKILLS];

  const toggleSkill = (skill: string) => {
    const newSkills = data.skills.includes(skill) 
      ? data.skills.filter(s => s !== skill)
      : [...data.skills, skill];
    
    // Ограничиваем количество навыков
    if (newSkills.length <= (classData?.skillCount || 2)) {
      onChange({ skills: newSkills });
    }
  };

  if (!classData) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          ⚔️ Навыки класса
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
          ⚔️ Навыки класса
        </h2>
        <p className="text-gray-400">
          Настройте способности класса {classData.name}
        </p>
      </div>

      {/* Основная информация о классе */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-white mb-2">Кость хитов</h4>
          <p className="text-2xl font-bold text-green-400">{classData.hitDie}</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-white mb-2">Основная характеристика</h4>
          <p className="text-sm text-gray-300">{classData.primaryAbility}</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-white mb-2">Спасброски</h4>
          <p className="text-sm text-gray-300">{classData.savingThrows.join(', ')}</p>
        </div>
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h4 className="font-semibold text-white mb-2">Навыки</h4>
          <p className="text-sm text-gray-300">{data.skills.length}/{classData.skillCount}</p>
        </div>
      </div>

      {/* Выбор навыков */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold text-white mb-4">
          🎯 Выберите навыки ({data.skills.length}/{classData.skillCount})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {classData.skillChoices.map((skill) => {
            const isSelected = data.skills.includes(skill);
            const canSelect = isSelected || data.skills.length < classData.skillCount;
            
            return (
              <button
                key={skill}
                onClick={() => toggleSkill(skill)}
                disabled={!canSelect}
                className={`
                  p-3 rounded-lg text-left transition-all border
                  ${isSelected
                    ? 'border-purple-500 bg-purple-900/50 text-white'
                    : canSelect
                      ? 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                      : 'border-gray-700 bg-gray-900 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{skill}</span>
                  {isSelected && <span className="text-purple-400">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
        {data.skills.length === classData.skillCount && (
          <p className="mt-3 text-sm text-green-400">
            ✅ Все навыки выбраны! Вы можете изменить выбор, сняв отметку с ненужных навыков.
          </p>
        )}
      </div>

      {/* Классовые способности */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">
          ⚡ Способности 1-го уровня
        </h3>
        <div className="space-y-4">
          {classData.features.map((feature, index) => (
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

      {/* Игровые советы */}
      <div className="mt-8 p-4 bg-blue-900/30 border border-blue-500/50 rounded-lg">
        <h4 className="font-semibold text-blue-300 mb-2">
          💡 Рекомендации по навыкам
        </h4>
        <div className="text-blue-200 text-sm space-y-1">
          {data.class === 'fighter' && (
            <>
              <p>• Рекомендуется: Атлетика (для силовых маневров), Восприятие (для инициативы)</p>
              <p>• Альтернативы: Запугивание (для социальных ситуаций), Выживание (для исследований)</p>
            </>
          )}
          {data.class === 'wizard' && (
            <>
              <p>• Рекомендуется: Магия (для определения заклинаний), Расследование (для поиска информации)</p>
              <p>• Альтернативы: История (для знаний), Проницательность (для социальных ситуаций)</p>
            </>
          )}
          {data.class === 'rogue' && (
            <>
              <p>• Рекомендуется: Скрытность, Восприятие, Ловкость рук, Расследование</p>
              <p>• Универсальный выбор для разностороннего плута</p>
            </>
          )}
          {data.class === 'cleric' && (
            <>
              <p>• Рекомендуется: Проницательность (для чтения людей), Медицина (для лечения)</p>
              <p>• Альтернативы: Религия (для знаний), Убеждение (для лидерства)</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
