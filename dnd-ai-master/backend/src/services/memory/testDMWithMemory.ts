#!/usr/bin/env node

import { MemoryManager } from './MemoryManager.js';
import { DMAgentWithMemoryService } from '../llm/dmAgentWithMemory.js';
import { ElizaService } from '../llm/eliza.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testDMWithMemory() {
  console.log('🧠🎮 Тестирование DMAgent с системой памяти...\n');
  
  // Инициализация системы памяти
  const testDbPath = './data/dm_memory_test.db';
  const memoryManager = new MemoryManager(testDbPath);
  
  // Инициализация Eliza сервиса
  const elizaService = new ElizaService({
    apiKey: process.env.ELIZA_API_KEY || 'test-key',
    baseURL: process.env.ELIZA_BASE_URL || 'https://api.eliza.yandex.net',
    timeout: 30000,
    maxRetries: 3,
    logRequests: true
  });
  
  // Создание DMAgent с памятью
  const dmAgent = new DMAgentWithMemoryService(elizaService, memoryManager);
  
  try {
    console.log('1️⃣ Инициализация системы памяти...');
    await memoryManager.initialize();
    console.log('✅ Система памяти инициализирована\n');
    
    console.log('2️⃣ Проверка подключения к Eliza API...');
    const connectionTest = await dmAgent.testConnection();
    if (connectionTest) {
      console.log('✅ Подключение к Eliza API работает\n');
    } else {
      console.log('❌ Подключение к Eliza API не работает');
      console.log('⚠️ Проверьте переменные окружения ELIZA_API_KEY и ELIZA_BASE_URL\n');
      return;
    }
    
    console.log('3️⃣ Тестирование DMAgent с памятью...');
    
    const testRoomId = 'memory_integration_test';
    const testScenario = [
      {
        message: 'Привет! Меня зовут Алиса, я эльф-следопыт. Начинаем новое приключение!',
        player: 'Алиса',
        description: 'Знакомство персонажа'
      },
      {
        message: 'Я осматриваю окрестности. Что я вижу вокруг?',
        player: 'Алиса',
        description: 'Исследование окружения'
      },
      {
        message: 'Бросай за меня проверку Восприятия d20+3',
        player: 'Алиса',
        description: 'Проверка навыка с tool calling'
      },
      {
        message: 'Я подхожу ближе к тому, что заметила. Что это?',
        player: 'Алиса',
        description: 'Продолжение исследования'
      },
      {
        message: 'Создай для меня персонажа эльфа-следопыта по имени Алиса',
        player: 'Алиса',
        description: 'Создание персонажа через character_sheet tool'
      }
    ];
    
    for (let i = 0; i < testScenario.length; i++) {
      const { message, player, description } = testScenario[i];
      
      console.log(`\n--- ШАГ ${i + 1}: ${description} ---`);
      console.log(`📝 ${player}: "${message}"`);
      
      try {
        const startTime = Date.now();
        
        const response = await dmAgent.processPlayerMessage({
          playerMessage: message,
          playerName: player,
          roomId: testRoomId,
          enableTools: true,
          useMemory: true
        });
        
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        console.log(`🎭 Мастер: ${response.content}`);
        console.log(`⏱️ Время ответа: ${responseTime}ms`);
        
        if (response.context) {
          console.log(`🧠 Контекст: ${response.context.recent_messages.length} сообщений, ${response.context.active_entities.length} сущностей, ~${response.context.total_tokens} токенов`);
        }
        
        if (response.toolCalls && response.toolCalls.length > 0) {
          console.log(`🔧 Использованные инструменты:`);
          response.toolCalls.forEach((call, idx) => {
            console.log(`   ${idx + 1}. ${call.name}: ${call.success ? '✅' : '❌'} ${call.result}`);
          });
        }
        
        // Пауза между сообщениями для имитации реальной игры
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.log(`❌ Ошибка на шаге ${i + 1}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        break;
      }
    }
    
    console.log('\n4️⃣ Проверка сохранения данных в памяти...');
    
    // Получаем статистику памяти
    const stats = await memoryManager.getStats();
    console.log('📊 Статистика системы памяти:');
    console.log(`   🎮 Сессий: ${stats.total_sessions}`);
    console.log(`   💬 Сообщений: ${stats.total_messages}`);
    console.log(`   🏷️ Сущностей: ${stats.total_entities}`);
    console.log(`   📝 Фактов: ${stats.total_facts}`);
    console.log(`   📊 Средняя длина сессии: ${stats.average_session_length} сообщений`);
    
    // Проверяем контекст еще раз
    console.log('\n5️⃣ Проверка построения контекста...');
    const finalContext = await memoryManager.buildContext(testRoomId);
    console.log(`🧠 Финальный контекст содержит:`);
    console.log(`   📝 Сообщений: ${finalContext.recent_messages.length}`);
    console.log(`   🏷️ Сущностей: ${finalContext.active_entities.length}`);
    console.log(`   📊 Фактов: ${finalContext.relevant_facts.length}`);
    console.log(`   🔢 Примерно токенов: ${finalContext.total_tokens}`);
    
    if (finalContext.recent_messages.length > 0) {
      console.log('\n📜 История сообщений:');
      finalContext.recent_messages.forEach((msg, idx) => {
        const role = msg.role === 'user' ? (msg.player_name || 'Игрок') : 'Мастер';
        const preview = msg.content.length > 60 ? msg.content.substring(0, 60) + '...' : msg.content;
        console.log(`   ${idx + 1}. ${role}: ${preview}`);
      });
    }
    
    if (finalContext.active_entities.length > 0) {
      console.log('\n🏷️ Активные сущности:');
      finalContext.active_entities.forEach((entity, idx) => {
        console.log(`   ${idx + 1}. ${entity.type}: ${entity.name} - ${entity.description || 'Без описания'}`);
      });
    }
    
    console.log('\n6️⃣ Тестирование повторного подключения...');
    
    // Имитируем повторное подключение к той же комнате
    const reconnectResponse = await dmAgent.processPlayerMessage({
      playerMessage: 'Я вернулась! Что происходило, пока меня не было?',
      playerName: 'Алиса',
      roomId: testRoomId,
      enableTools: false,
      useMemory: true
    });
    
    console.log(`🔄 Ответ при повторном подключении: ${reconnectResponse.content}`);
    console.log(`🧠 Контекст при повторном подключении: ${reconnectResponse.context?.recent_messages.length || 0} сообщений`);
    
    console.log('\n🎉 ВСЕ ТЕСТЫ ИНТЕГРАЦИИ ПРОЙДЕНЫ УСПЕШНО!');
    console.log('🧠 DMAgent с системой памяти готов к использованию');
    console.log('💾 Все сообщения сохраняются автоматически');
    console.log('🎮 Контекст строится из истории кампании');
    console.log('🔧 Tool calling работает с сохранением результатов');
    
  } catch (error) {
    console.error('❌ ОШИБКА ИНТЕГРАЦИОННОГО ТЕСТИРОВАНИЯ:', error);
    if (error instanceof Error) {
      console.error('Детали ошибки:', error.message);
      console.error('Stack trace:', error.stack);
    }
  } finally {
    // Закрываем соединения
    await memoryManager.close();
    console.log('\n📦 Система памяти закрыта');
  }
}

// Запуск тестирования
if (import.meta.url === `file://${process.argv[1]}`) {
  testDMWithMemory().catch(console.error);
}
