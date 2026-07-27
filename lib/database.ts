import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export interface LabelRecord {
  id: number;
  name: string;
  store: string;
  barcode: string;
  barcodeType: string;
  widthCm: number;
  heightCm: number;
  textFields: string; // JSON array of {text, x, y, fontSize, color}
  imageUri: string | null;
  createdAt: string;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('etiquetas.db');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      store TEXT NOT NULL DEFAULT '',
      barcode TEXT NOT NULL,
      barcodeType TEXT NOT NULL DEFAULT 'CODE128',
      widthCm REAL NOT NULL DEFAULT 5.0,
      heightCm REAL NOT NULL DEFAULT 3.0,
      textFields TEXT NOT NULL DEFAULT '[]',
      imageUri TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // Seed data if empty
  const count = await database.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM labels'
  );
  if (count && count.cnt === 0) {
    await database.runAsync(
      `INSERT INTO labels (name, store, barcode, barcodeType, widthCm, heightCm, textFields, createdAt) VALUES
       ('Arroz Premium 1kg', 'Supermaxi', '7861025800123', 'EAN13', 6.0, 4.0, '[{"text":"Arroz Premium","x":10,"y":15,"fontSize":14,"color":"#1a1a2e"},{"text":"$2.49","x":10,"y":55,"fontSize":22,"color":"#e94560"},{"text":"Peso Neto: 1kg","x":10,"y":38,"fontSize":10,"color":"#555"}]', '2026-07-25 14:30:00'),
       ('Aceite Girasol 1L', 'Supermaxi', '7861025800456', 'EAN13', 5.0, 7.0, '[{"text":"Aceite de Girasol","x":10,"y":15,"fontSize":14,"color":"#1a1a2e"},{"text":"$4.99","x":10,"y":55,"fontSize":22,"color":"#e94560"},{"text":"1 Litro","x":10,"y":38,"fontSize":10,"color":"#555"}]', '2026-07-25 15:00:00'),
       ('Leche Entera UHT', 'Tia', '7861025800789', 'EAN13', 5.5, 8.5, '[{"text":"Leche UHT Entera","x":10,"y":15,"fontSize":14,"color":"#1a1a2e"},{"text":"$1.25","x":10,"y":55,"fontSize":22,"color":"#e94560"},{"text":"1 Litro","x":10,"y":38,"fontSize":10,"color":"#555"}]', '2026-07-26 09:15:00'),
       ('Atún en Agua', 'Tia', '7861025800901', 'EAN13', 3.5, 2.5, '[{"text":"Atún en Agua","x":10,"y":10,"fontSize":11,"color":"#1a1a2e"},{"text":"$0.99","x":10,"y":45,"fontSize":20,"color":"#e94560"}]', '2026-07-26 10:00:00'),
       ('Detergente Líquido 2L', 'Supermaxi', '7861025801100', 'CODE128', 7.0, 10.0, '[{"text":"Detergente Líquido","x":10,"y":15,"fontSize":14,"color":"#1a1a2e"},{"text":"$6.99","x":10,"y":55,"fontSize":22,"color":"#e94560"},{"text":"2 Litros","x":10,"y":38,"fontSize":10,"color":"#555"}]', '2026-07-26 14:00:00'),
       ('Papel Higiénico 12u', 'Aki', '0000123456789', 'UPC-A', 8.0, 5.0, '[{"text":"Papel Higiénico 12 Rollos","x":10,"y":15,"fontSize":12,"color":"#1a1a2e"},{"text":"$3.49","x":10,"y":50,"fontSize":22,"color":"#e94560"}]', '2026-07-27 08:30:00'),
       ('Café Molido 250g', 'Supermaxi', '7861025801209', 'EAN13', 4.0, 6.0, '[{"text":"Café Molido Tradicional","x":10,"y":15,"fontSize":13,"color":"#1a1a2e"},{"text":"$3.75","x":10,"y":55,"fontSize":22,"color":"#e94560"},{"text":"250g","x":10,"y":38,"fontSize":10,"color":"#555"}]', '2026-07-27 11:00:00'),
       ('Galletas María', 'Tia', '7861025801400', 'EAN13', 6.0, 3.5, '[{"text":"Galletas María","x":10,"y":15,"fontSize":14,"color":"#1a1a2e"},{"text":"$0.75","x":10,"y":55,"fontSize":22,"color":"#e94560"},{"text":"200g","x":10,"y":38,"fontSize":10,"color":"#555"}]', '2026-07-27 12:00:00');`
    );
  }
}

export async function getAllLabels(): Promise<LabelRecord[]> {
  const database = await getDatabase();
  return database.getAllAsync<LabelRecord>(
    'SELECT * FROM labels ORDER BY createdAt DESC'
  );
}

export async function getLabelById(id: number): Promise<LabelRecord | null> {
  const database = await getDatabase();
  return database.getFirstAsync<LabelRecord>(
    'SELECT * FROM labels WHERE id = ?',
    [id]
  );
}

export async function searchLabels(query: string): Promise<LabelRecord[]> {
  const database = await getDatabase();
  return database.getAllAsync<LabelRecord>(
    'SELECT * FROM labels WHERE name LIKE ? OR store LIKE ? OR barcode LIKE ? ORDER BY createdAt DESC',
    [`%${query}%`, `%${query}%`, `%${query}%`]
  );
}

export async function filterLabelsByStore(store: string): Promise<LabelRecord[]> {
  const database = await getDatabase();
  if (!store) return getAllLabels();
  return database.getAllAsync<LabelRecord>(
    'SELECT * FROM labels WHERE store = ? ORDER BY createdAt DESC',
    [store]
  );
}

export async function createLabel(
  data: Omit<LabelRecord, 'id' | 'createdAt'>
): Promise<number> {
  const database = await getDatabase();
  const result = await database.runAsync(
    `INSERT INTO labels (name, store, barcode, barcodeType, widthCm, heightCm, textFields, imageUri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.name, data.store, data.barcode, data.barcodeType, data.widthCm, data.heightCm, data.textFields, data.imageUri]
  );
  return result.lastInsertRowId;
}

export async function updateLabel(
  id: number,
  data: Partial<Omit<LabelRecord, 'id' | 'createdAt'>>
): Promise<void> {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.store !== undefined) { fields.push('store = ?'); values.push(data.store); }
  if (data.barcode !== undefined) { fields.push('barcode = ?'); values.push(data.barcode); }
  if (data.barcodeType !== undefined) { fields.push('barcodeType = ?'); values.push(data.barcodeType); }
  if (data.widthCm !== undefined) { fields.push('widthCm = ?'); values.push(data.widthCm); }
  if (data.heightCm !== undefined) { fields.push('heightCm = ?'); values.push(data.heightCm); }
  if (data.textFields !== undefined) { fields.push('textFields = ?'); values.push(data.textFields); }
  if (data.imageUri !== undefined) { fields.push('imageUri = ?'); values.push(data.imageUri); }

  if (fields.length === 0) return;

  values.push(id);
  await database.runAsync(
    `UPDATE labels SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
}

export async function deleteLabel(id: number): Promise<void> {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM labels WHERE id = ?', [id]);
}

export async function getStores(): Promise<string[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{ store: string }>(
    'SELECT DISTINCT store FROM labels ORDER BY store'
  );
  return rows.map((r) => r.store).filter(Boolean);
}
