import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const SEEDED_USERS = [
    {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Gabriel Rivera',
        email: 'gabriel@ajaia.test'
    },
    {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'Maria Santos',
        email: 'maria@ajaia.test'
    },
    {
        id: '33333333-3333-3333-3333-333333333333',
        name: 'Alex Cruz',
        email: 'alex@ajaia.test'
    }
];

function resolveDbPath() {
    if (process.env.AJAIA_DB_PATH) {
        return path.resolve(process.env.AJAIA_DB_PATH);
    }

    if (process.env.VERCEL) {
        return path.join('/tmp', 'ajaia-docs.db');
    }

    return path.resolve(process.cwd(), 'ajaia-docs.db');
}

const DB_PATH = resolveDbPath();
const SCHEMA_PATH = path.resolve(process.cwd(), 'schema.sql');

function ensureDbDirectory() {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function applySchema(db: Database.Database) {
    if (!fs.existsSync(SCHEMA_PATH)) {
        throw new Error(`schema.sql not found at ${SCHEMA_PATH}`);
    }

    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schemaSql);
}

function seedUsersIfNeeded(db: Database.Database) {
    const hasUsersTable = db.prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = 'users'
    `).get();

    if (!hasUsersTable) return;

    const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (row.count > 0) return;

    const insertUser = db.prepare('INSERT OR REPLACE INTO users (id, name, email) VALUES (?, ?, ?)');
    const transaction = db.transaction(() => {
        for (const user of SEEDED_USERS) {
            insertUser.run(user.id, user.name, user.email);
        }
    });

    transaction();
}

declare global {
    var sqliteDbInstance: Database.Database | undefined;
}

ensureDbDirectory();
const db = globalThis.sqliteDbInstance ?? new Database(DB_PATH);

if (process.env.NODE_ENV !== 'production') {
    globalThis.sqliteDbInstance = db;
}

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('busy_timeout = 5000');

applySchema(db);
seedUsersIfNeeded(db);

try {
    db.prepare(`
        ALTER TABLE document_versions
        ADD COLUMN scope TEXT CHECK(scope IN ('personal', 'everyone')) NOT NULL DEFAULT 'everyone'
    `).run();
    console.log('Migrated: Added scope column to document_versions table.');
} catch (error: any) {
    if (!error.message.includes('duplicate column name')) {
        console.warn('Migration warning for document_versions scope column:', error.message);
    }
}

try {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS document_presence (
            document_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            cursor_anchor INTEGER NOT NULL DEFAULT 0,
            cursor_head INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY (document_id, user_id),
            FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `).run();
    console.log('Migrated: Created document_presence table if not exists.');
} catch (error: any) {
    console.warn('Migration warning for document_presence table:', error.message);
}

export default db;
export { DB_PATH };
