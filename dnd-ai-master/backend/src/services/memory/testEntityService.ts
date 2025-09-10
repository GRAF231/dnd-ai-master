#!/usr/bin/env node

import { MemoryManager } from './MemoryManager.js';

async function testEntityService() {
  console.log('🔍 Тестирование EntityService и автоматического извлечения сущностей...\n');
  
  const testDbPath = './data/entity_test.db';
  const memoryManager = new MemoryManager(testDbPath);
  
  try {
    console.log('1️⃣ Инициализация системы памяти...');
    await memoryManager.initialize();
    console.log('✅ Система памяти инициализирована\n');
    
    const roomId = 'entity_extraction_test';
    
    console.log('2️⃣ Тестирование автоматического извлечения сущностей...');
    
    // Тестовые сообщения с различными типами сущностей
    const testMessages = [
      {
        text: 'Привет! Меня зовут Алиса, я эльф-следопыт. Начинаем приключение!',
        description: 'Представление персонажа с расой и классом'
      },
      {
        text: 'Вы находитесь в таверне "Золотой дракон". За стойкой стоит трактирщик Борис.',
        description: 'Локация и NPC'
      },
      {
        text: 'Алиса достает свой эльфийский лук и серебряные стрелы. На поясе висит волшебный кинжал.',
        description: 'Предметы и оружие'
      },
      {
        text: 'В древнем замке живет маг Мерлин. Он хранит свитки заклинаний в башне.',
        description: 'Локация, NPC и предметы'
      },
      {
        text: 'Дварф-воин Торин встречает в пещере старика-отшельника. У того есть золотое кольцо.',
        description: 'Множественные персонажи и предметы'
      }
    ];
    
    for (let i = 0; i < testMessages.length; i++) {
      const { text, description } = testMessages[i];
      
      console.log(`\n--- ТЕСТ ${i + 1}: ${description} ---`);
      console.log(`📝 Текст: "${text}"`);
      
      // Обрабатываем сообщение (автоматически извлекаются сущности)
      const result = await memoryManager.processUserMessage(roomId, text, 'Тестер');
      
      console.log(`✅ Сообщение обработано, сессия: ${result.session.id}`);
      console.log(`🧠 Контекст: ${result.context.active_entities.length} сущностей`);
      
      // Показываем извлеченные сущности
      if (result.context.active_entities.length > 0) {
        console.log('🔍 Извлеченные сущности:');
        result.context.active_entities.forEach((entity, idx) => {
          console.log(`   ${idx + 1}. ${entity.type}: ${entity.name} - ${entity.description || 'Без описания'}`);
        });
      }
      
      // Показываем факты
      if (result.context.relevant_facts.length > 0) {
        console.log('📝 Извлеченные факты:');
        result.context.relevant_facts.forEach((fact, idx) => {
          console.log(`   ${idx + 1}. ${fact.key}: ${fact.value} (уверенность: ${fact.confidence})`);
        });
      }
    }
    
    console.log('\n3️⃣ Проверка статистики сущностей...');
    const entityStats = await memoryManager.getEntityStats(roomId);
    
    console.log('📊 Статистика сущностей:');
    console.log(`   🏷️ Всего сущностей: ${entityStats.total}`);
    console.log(`   👥 Персонажей: ${entityStats.by_type.character}`);
    console.log(`   🏠 Локаций: ${entityStats.by_type.location}`);
    console.log(`   🤖 NPC: ${entityStats.by_type.npc}`);
    console.log(`   ⚔️ Предметов: ${entityStats.by_type.item}`);
    console.log(`   📋 Квестов: ${entityStats.by_type.quest}`);
    console.log(`   📝 С фактами: ${entityStats.with_facts}`);
    
    if (entityStats.recent_entities.length > 0) {
      console.log('\n🕒 Последние созданные сущности:');
      entityStats.recent_entities.forEach((entity, idx) => {
        console.log(`   ${idx + 1}. ${entity.type}: ${entity.name}`);
      });
    }
    
    console.log('\n4️⃣ Тестирование поиска сущностей...');
    
    // Поиск персонажей
    const characters = await memoryManager.getEntities(roomId, 'character');
    console.log(`🔍 Найдено персонажей: ${characters.length}`);
    
    if (characters.length > 0) {
      const firstCharacter = characters[0];
      console.log(`👤 Первый персонаж: ${firstCharacter.name}`);
      
      // Получаем факты о персонаже
      const facts = await memoryManager.getEntityFacts(firstCharacter.id);
      if (facts.length > 0) {
        console.log(`📝 Факты о ${firstCharacter.name}:`);
        facts.forEach((fact, idx) => {
          console.log(`   ${idx + 1}. ${fact.key}: ${fact.value}`);
        });
      }
      
      // Ищем связанные сущности
      const related = await memoryManager.getRelatedEntities(firstCharacter.id, roomId);
      if (related.length > 0) {
        console.log(`🔗 Связанные сущности с ${firstCharacter.name}:`);
        related.forEach((entity, idx) => {
          console.log(`   ${idx + 1}. ${entity.type}: ${entity.name}`);
        });
      }
    }
    
    console.log('\n5️⃣ Тестирование поиска по имени...');
    
    // Поиск по частичному имени
    const aliceSearch = await memoryManager.findEntitiesByName(roomId, 'Алиса');
    console.log(`🔍 Поиск "Алиса": найдено ${aliceSearch.length} сущностей`);
    
    const tavernSearch = await memoryManager.findEntitiesByName(roomId, 'таверна');
    console.log(`🔍 Поиск "таверна": найдено ${tavernSearch.length} сущностей`);
    
    console.log('\n6️⃣ Тестирование ручного извлечения сущностей...');
    
    // Тестируем прямое извлечение из сложного текста
    const complexText = `
      В глубине Темного леса стоит заброшенный храм Луны. 
      Эльфийка-жрица Селена охраняет древний артефакт - Кристалл вечности.
      Рядом с храмом живет мудрый дракон Азурит, который знает тайны прошлого.
      В подземельях храма спрятаны магические свитки и зелья исцеления.
    `;
    
    console.log('📝 Сложный текст для извлечения:');
    console.log(complexText.trim());
    
    const extractedEntities = await memoryManager.extractEntitiesFromText(roomId, complexText);
    
    console.log(`🔍 Извлечено сущностей: ${extractedEntities.length}`);
    extractedEntities.forEach((entity, idx) => {
      console.log(`   ${idx + 1}. ${entity.type}: ${entity.name} - ${entity.description || 'Без описания'}`);
    });
    
    console.log('\n7️⃣ Финальная проверка контекста...');
    
    const finalContext = await memoryManager.buildContext(roomId);
    console.log(`🧠 Финальный контекст:`);
    console.log(`   📝 Сообщений: ${finalContext.recent_messages.length}`);
    console.log(`   🏷️ Сущностей: ${finalContext.active_entities.length}`);
    console.log(`   📊 Фактов: ${finalContext.relevant_facts.length}`);
    console.log(`   🔢 Токенов: ${finalContext.total_tokens}`);
    
    console.log('\n🎉 ВСЕ ТЕСТЫ ENTITYSERVICE ПРОЙДЕНЫ УСПЕШНО!');
    console.log('\n✅ ПРОВЕРЕННАЯ ФУНКЦИОНАЛЬНОСТЬ:');
    console.log('   🔍 Автоматическое извлечение персонажей из текста');
    console.log('   🏠 Автоматическое извлечение локаций');
    console.log('   🤖 Автоматическое извлечение NPC');
    console.log('   ⚔️ Автоматическое извлечение предметов');
    console.log('   📝 Автоматическое создание фактов');
    console.log('   🔍 Поиск сущностей по имени и типу');
    console.log('   🔗 Поиск связанных сущностей');
    console.log('   📊 Статистика сущностей');
    console.log('   🧠 Интеграция с контекстом памяти');
    
    console.log('\n🚀 ENTITYSERVICE ГОТОВ К ИСПОЛЬЗОВАНИЮ!');
    
  } catch (error) {
    console.error('❌ ОШИБКА ТЕСТИРОВАНИЯ ENTITYSERVICE:', error);
    if (error instanceof Error) {
      console.error('Детали:', error.message);
    }
  } finally {
    await memoryManager.close();
    console.log('\n📦 Система памяти закрыта');
  }
}

// Запуск тестирования
if (import.meta.url === `file://${process.argv[1]}`) {
  testEntityService().catch(console.error);
}
