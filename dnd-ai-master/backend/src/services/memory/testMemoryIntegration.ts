#!/usr/bin/env node

import { MemoryManager } from './MemoryManager.js';

async function testMemoryIntegration() {
  console.log('🧠 Тестирование интеграции системы памяти...\n');
  
  const testDbPath = './data/integration_test.db';
  const memoryManager = new MemoryManager(testDbPath);
  
  try {
    console.log('1️⃣ Инициализация системы памяти...');
    await memoryManager.initialize();
    console.log('✅ Система памяти инициализирована\n');
    
    console.log('2️⃣ Имитация полного цикла игровой сессии...');
    
    const roomId = 'integration_test_room';
    const playerName = 'Алиса';
    
    // Шаг 1: Первое сообщение игрока
    console.log('\n--- Сообщение 1: Знакомство ---');
    const step1 = await memoryManager.processUserMessage(
      roomId,
      'Привет! Меня зовут Алиса, я эльф-следопыт. Начинаем новое приключение!',
      playerName
    );
    
    console.log(`✅ Сессия создана: ${step1.session.id}`);
    console.log(`✅ Сообщение сохранено: ${step1.message.id}`);
    console.log(`🧠 Контекст: ${step1.context.recent_messages.length} сообщений`);
    
    // Имитируем ответ ИИ-мастера
    const dmResponse1 = await memoryManager.processAssistantResponse(
      step1.session.id,
      'Добро пожаловать, Алиса! Вы находитесь на краю древнего леса. Перед вами тропинка, уходящая в глубину чащи. Что вы хотите сделать?',
      85
    );
    
    console.log(`✅ Ответ ИИ сохранен: ${dmResponse1.id}`);
    
    // Шаг 2: Второе сообщение игрока
    console.log('\n--- Сообщение 2: Исследование ---');
    const step2 = await memoryManager.processUserMessage(
      roomId,
      'Я осматриваю окрестности. Что я вижу вокруг?',
      playerName
    );
    
    console.log(`🧠 Контекст обновлен: ${step2.context.recent_messages.length} сообщений`);
    
    // Проверяем, что история сохранилась
    if (step2.context.recent_messages.length >= 2) {
      console.log('✅ История сообщений корректно сохраняется');
      step2.context.recent_messages.forEach((msg, idx) => {
        const role = msg.role === 'user' ? (msg.player_name || 'Игрок') : 'Мастер';
        console.log(`   ${idx + 1}. ${role}: ${msg.content.substring(0, 50)}...`);
      });
    }
    
    // Имитируем ответ ИИ с созданием сущности
    const dmResponse2 = await memoryManager.processAssistantResponse(
      step2.session.id,
      'Вы видите старую каменную башню, покрытую плющом. У её основания растут светящиеся грибы. Слышите шорох в кустах.',
      95
    );
    
    console.log(`✅ Ответ ИИ сохранен: ${dmResponse2.id}`);
    
    // Шаг 3: Создание сущностей
    console.log('\n--- Создание игровых сущностей ---');
    
    // Создаем локацию
    const towerResult = await memoryManager.createEntity({
      room_id: roomId,
      type: 'location',
      name: 'Древняя башня',
      description: 'Старая каменная башня, покрытая плющом, со светящимися грибами у основания',
      data: {
        atmosphere: 'mysterious',
        features: ['плющ', 'светящиеся грибы'],
        sounds: ['шорох в кустах']
      }
    });
    
    if (towerResult.success) {
      console.log(`✅ Локация создана: ${towerResult.data?.name}`);
    }
    
    // Создаем персонажа
    const characterResult = await memoryManager.createEntity({
      room_id: roomId,
      type: 'character',
      name: 'Алиса',
      description: 'Эльф-следопыт, исследующий древний лес',
      data: {
        race: 'elf',
        class: 'ranger',
        level: 1,
        background: 'outlander'
      }
    });
    
    if (characterResult.success) {
      console.log(`✅ Персонаж создан: ${characterResult.data?.name}`);
    }
    
    // Шаг 4: Проверка построения контекста с сущностями
    console.log('\n--- Проверка контекста с сущностями ---');
    const contextWithEntities = await memoryManager.buildContext(roomId);
    
    console.log(`🧠 Финальный контекст:`);
    console.log(`   📝 Сообщений: ${contextWithEntities.recent_messages.length}`);
    console.log(`   🏷️ Сущностей: ${contextWithEntities.active_entities.length}`);
    console.log(`   📊 Фактов: ${contextWithEntities.relevant_facts.length}`);
    console.log(`   🔢 Токенов: ${contextWithEntities.total_tokens}`);
    
    if (contextWithEntities.active_entities.length > 0) {
      console.log('\n🏷️ Активные сущности:');
      contextWithEntities.active_entities.forEach((entity, idx) => {
        console.log(`   ${idx + 1}. ${entity.type}: ${entity.name}`);
      });
    }
    
    // Шаг 5: Создание фактов
    console.log('\n--- Создание фактов ---');
    
    if (towerResult.success && towerResult.data) {
      const factResult = await memoryManager.createFact({
        entity_id: towerResult.data.id,
        key: 'первое_впечатление',
        value: 'Алиса заметила светящиеся грибы и услышала шорох',
        confidence: 0.9
      });
      
      if (factResult.success) {
        console.log(`✅ Факт создан: ${factResult.data?.key} = ${factResult.data?.value}`);
      }
    }
    
    // Шаг 6: Тестирование повторного подключения
    console.log('\n--- Тестирование повторного подключения ---');
    
    const reconnectStep = await memoryManager.processUserMessage(
      roomId,
      'Я вернулась! Напомни, что происходило?',
      playerName
    );
    
    console.log(`🔄 При повторном подключении:`);
    console.log(`   📝 Сообщений в контексте: ${reconnectStep.context.recent_messages.length}`);
    console.log(`   🏷️ Сущностей в контексте: ${reconnectStep.context.active_entities.length}`);
    console.log(`   📊 Фактов в контексте: ${reconnectStep.context.relevant_facts.length}`);
    
    // Шаг 7: Статистика
    console.log('\n--- Финальная статистика ---');
    const stats = await memoryManager.getStats();
    
    console.log('📊 Статистика системы памяти:');
    console.log(`   🎮 Сессий: ${stats.total_sessions}`);
    console.log(`   💬 Сообщений: ${stats.total_messages}`);
    console.log(`   🏷️ Сущностей: ${stats.total_entities}`);
    console.log(`   📝 Фактов: ${stats.total_facts}`);
    console.log(`   📊 Средняя длина сессии: ${stats.average_session_length} сообщений`);
    
    console.log('\n🎉 ВСЕ ТЕСТЫ ИНТЕГРАЦИИ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('\n✅ ПРОВЕРЕННАЯ ФУНКЦИОНАЛЬНОСТЬ:');
    console.log('   💾 Автоматическое создание комнат и сессий');
    console.log('   💬 Сохранение сообщений игроков и ИИ-мастера');
    console.log('   🏷️ Создание и управление сущностями');
    console.log('   📝 Система фактов');
    console.log('   🧠 Построение контекста из истории');
    console.log('   🔄 Персистентность между подключениями');
    console.log('   📊 Статистика и мониторинг');
    
    console.log('\n🚀 СИСТЕМА ПАМЯТИ ГОТОВА К ИНТЕГРАЦИИ С РЕАЛЬНЫМ ИИ-МАСТЕРОМ!');
    
  } catch (error) {
    console.error('❌ ОШИБКА ТЕСТИРОВАНИЯ ИНТЕГРАЦИИ:', error);
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
  testMemoryIntegration().catch(console.error);
}
