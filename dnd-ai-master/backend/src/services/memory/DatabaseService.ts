import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { 
  Room, Session, Message, Scene, Entity, Fact,
  CreateRoomRequest, CreateSessionRequest, SaveMessageRequest,
  CreateEntityRequest, CreateFactRequest, OperationResult
} from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class DatabaseService {
  private db: sqlite3.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = 'data/memory.db') {
    this.dbPath = dbPath;
  }

  /**
   * Инициализация базы данных
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Ошибка подключения к SQLite:', err);
          reject(err);
        } else {
          console.log('✅ SQLite база данных подключена:', this.dbPath);
          this.runMigrations()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  /**
   * Закрытие соединения с базой данных
   */
  async close(): Promise<void> {
    if (!this.db) return;
    
    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('📦 SQLite соединение закрыто');
          resolve();
        }
      });
    });
  }

  /**
   * Выполнение миграций базы данных
   */
  private async runMigrations(): Promise<void> {
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    return this.exec(migrationSQL);
  }

  /**
   * Выполнение SQL запроса без возврата данных
   */
  private async exec(sql: string): Promise<void> {
    if (!this.db) throw new Error('База данных не инициализирована');
    
    return new Promise((resolve, reject) => {
      this.db!.exec(sql, (err) => {
        if (err) {
          console.error('Ошибка выполнения SQL:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Выполнение SQL запроса с возвратом одной строки
   */
  private async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db) throw new Error('База данных не инициализирована');
    
    return new Promise((resolve, reject) => {
      this.db!.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  /**
   * Выполнение SQL запроса с возвратом всех строк
   */
  private async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('База данных не инициализирована');
    
    return new Promise((resolve, reject) => {
      this.db!.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  /**
   * Выполнение SQL запроса на изменение данных
   */
  private async run(sql: string, params: any[] = []): Promise<sqlite3.RunResult> {
    if (!this.db) throw new Error('База данных не инициализирована');
    
    return new Promise((resolve, reject) => {
      this.db!.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  // === ОПЕРАЦИИ С КОМНАТАМИ ===

  async createRoom(request: CreateRoomRequest): Promise<OperationResult<Room>> {
    try {
      const sql = `
        INSERT INTO rooms (id, title, settings)
        VALUES (?, ?, ?)
      `;
      
      await this.run(sql, [
        request.id,
        request.title,
        JSON.stringify(request.settings || {})
      ]);

      const room = await this.getRoomById(request.id);
      return { success: true, data: room };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка создания комнаты: ${error instanceof Error ? error.message : error}` 
      };
    }
  }

  async getRoomById(id: string): Promise<Room | undefined> {
    const sql = 'SELECT * FROM rooms WHERE id = ?';
    const row = await this.get(sql, [id]);
    
    if (!row) return undefined;
    
    return {
      ...row,
      settings: JSON.parse(row.settings || '{}'),
      created_at: new Date(row.created_at)
    };
  }

  // === ОПЕРАЦИИ С СЕССИЯМИ ===

  async createSession(request: CreateSessionRequest): Promise<OperationResult<Session>> {
    try {
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const sql = `
        INSERT INTO sessions (id, room_id)
        VALUES (?, ?)
      `;
      
      await this.run(sql, [sessionId, request.room_id]);

      const session = await this.getSessionById(sessionId);
      return { success: true, data: session };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка создания сессии: ${error instanceof Error ? error.message : error}` 
      };
    }
  }

  async getSessionById(id: string): Promise<Session | undefined> {
    const sql = 'SELECT * FROM sessions WHERE id = ?';
    const row = await this.get(sql, [id]);
    
    if (!row) return undefined;
    
    return {
      ...row,
      started_at: new Date(row.started_at),
      ended_at: row.ended_at ? new Date(row.ended_at) : undefined
    };
  }

  async getActiveSession(roomId: string): Promise<Session | undefined> {
    const sql = `
      SELECT * FROM sessions 
      WHERE room_id = ? AND ended_at IS NULL 
      ORDER BY started_at DESC 
      LIMIT 1
    `;
    
    const row = await this.get(sql, [roomId]);
    
    if (!row) return undefined;
    
    return {
      ...row,
      started_at: new Date(row.started_at),
      ended_at: row.ended_at ? new Date(row.ended_at) : undefined
    };
  }

  async endSession(sessionId: string, summary?: string): Promise<OperationResult<void>> {
    try {
      const sql = `
        UPDATE sessions 
        SET ended_at = CURRENT_TIMESTAMP, summary = ?
        WHERE id = ?
      `;
      
      await this.run(sql, [summary || null, sessionId]);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка завершения сессии: ${error instanceof Error ? error.message : error}` 
      };
    }
  }

  // === ОПЕРАЦИИ С СООБЩЕНИЯМИ ===

  async saveMessage(request: SaveMessageRequest): Promise<OperationResult<Message>> {
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const sql = `
        INSERT INTO messages (id, session_id, role, content, player_name, token_count)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await this.run(sql, [
        messageId,
        request.session_id,
        request.role,
        request.content,
        request.player_name || null,
        request.token_count || null
      ]);

      const message = await this.getMessageById(messageId);
      return { success: true, data: message };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка сохранения сообщения: ${error instanceof Error ? error.message : error}` 
      };
    }
  }

  async getMessageById(id: string): Promise<Message | undefined> {
    const sql = 'SELECT * FROM messages WHERE id = ?';
    const row = await this.get(sql, [id]);
    
    if (!row) return undefined;
    
    return {
      ...row,
      timestamp: new Date(row.timestamp),
      compressed: Boolean(row.compressed)
    };
  }

  async getRecentMessages(sessionId: string, limit: number = 50): Promise<Message[]> {
    const sql = `
      SELECT * FROM messages 
      WHERE session_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `;
    
    const rows = await this.all(sql, [sessionId, limit]);
    
    return rows.map(row => ({
      ...row,
      timestamp: new Date(row.timestamp),
      compressed: Boolean(row.compressed)
    })).reverse(); // Возвращаем в хронологическом порядке
  }

  // === ОПЕРАЦИИ С СУЩНОСТЯМИ ===

  async createEntity(request: CreateEntityRequest): Promise<OperationResult<Entity>> {
    try {
      const entityId = `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const sql = `
        INSERT INTO entities (id, room_id, type, name, description, data)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await this.run(sql, [
        entityId,
        request.room_id,
        request.type,
        request.name,
        request.description || null,
        JSON.stringify(request.data || {})
      ]);

      const entity = await this.getEntityById(entityId);
      return { success: true, data: entity };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка создания сущности: ${error instanceof Error ? error.message : error}` 
      };
    }
  }

  async getEntityById(id: string): Promise<Entity | undefined> {
    const sql = 'SELECT * FROM entities WHERE id = ?';
    const row = await this.get(sql, [id]);
    
    if (!row) return undefined;
    
    return {
      ...row,
      data: JSON.parse(row.data || '{}'),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }

  async getEntitiesByRoom(roomId: string, type?: string): Promise<Entity[]> {
    let sql = 'SELECT * FROM entities WHERE room_id = ?';
    const params = [roomId];
    
    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const rows = await this.all(sql, params);
    
    return rows.map(row => ({
      ...row,
      data: JSON.parse(row.data || '{}'),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }));
  }

  // === ОПЕРАЦИИ С ФАКТАМИ ===

  async createFact(request: CreateFactRequest): Promise<OperationResult<Fact>> {
    try {
      const factId = `fact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const sql = `
        INSERT INTO facts (id, entity_id, key, value, confidence, source_message_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await this.run(sql, [
        factId,
        request.entity_id,
        request.key,
        request.value,
        request.confidence || 1.0,
        request.source_message_id || null
      ]);

      const fact = await this.getFactById(factId);
      return { success: true, data: fact };
    } catch (error) {
      return { 
        success: false, 
        error: `Ошибка создания факта: ${error instanceof Error ? error.message : error}` 
      };
    }
  }

  async getFactById(id: string): Promise<Fact | undefined> {
    const sql = 'SELECT * FROM facts WHERE id = ?';
    const row = await this.get(sql, [id]);
    
    if (!row) return undefined;
    
    return {
      ...row,
      created_at: new Date(row.created_at)
    };
  }

  async getFactsByEntity(entityId: string): Promise<Fact[]> {
    const sql = `
      SELECT * FROM facts 
      WHERE entity_id = ? 
      ORDER BY confidence DESC, created_at DESC
    `;
    
    const rows = await this.all(sql, [entityId]);
    
    return rows.map(row => ({
      ...row,
      created_at: new Date(row.created_at)
    }));
  }

  // === УТИЛИТЫ ===

  async getStats(): Promise<any> {
    const queries = [
      'SELECT COUNT(*) as total_sessions FROM sessions',
      'SELECT COUNT(*) as total_messages FROM messages',
      'SELECT COUNT(*) as total_entities FROM entities',
      'SELECT COUNT(*) as total_facts FROM facts',
      'SELECT COUNT(*) as compressed_messages FROM messages WHERE compressed = 1'
    ];

    const results = await Promise.all(
      queries.map(query => this.get(query))
    );

    return {
      total_sessions: results[0]?.total_sessions || 0,
      total_messages: results[1]?.total_messages || 0,
      total_entities: results[2]?.total_entities || 0,
      total_facts: results[3]?.total_facts || 0,
      compressed_messages: results[4]?.compressed_messages || 0
    };
  }
}
