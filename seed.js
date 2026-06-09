// seed.js
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'ajaia-docs.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

console.log('Initializing Ajaia Docs Database...');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// 1. Open database connection
const db = new Database(DB_PATH, { verbose: console.log });

// Enable foreign keys
db.pragma('foreign_keys = ON');

// 2. Read and execute schema.sql
if (fs.existsSync(SCHEMA_PATH)) {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schemaSql);
    console.log('Database schema applied successfully.');
} else {
    console.error('schema.sql not found at ' + SCHEMA_PATH);
    process.exit(1);
}

// 3. Seed users
const seedUsers = [
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

const insertUser = db.prepare('INSERT OR REPLACE INTO users (id, name, email) VALUES (?, ?, ?)');

db.transaction(() => {
    for (const user of seedUsers) {
        insertUser.run(user.id, user.name, user.email);
        console.log(`Seeded user: ${user.name} (${user.email})`);
    }
})();

console.log('Database seeding completed successfully!');
db.close();
