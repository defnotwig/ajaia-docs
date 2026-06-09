// tests/helpers/setup.ts
//
// Vitest setup file. Runs once per test file BEFORE the test module (and its
// imports of lib/db.ts) are evaluated. It points the app at a unique, isolated
// SQLite database, applies the production schema, and seeds canonical users.
//
// Because lib/db.ts reads AJAIA_DB_PATH at import time, setting it here means
// every real lib/* function under test transparently operates on this throwaway
// database instead of the development one.

import os from 'os';
import path from 'path';
import fs from 'fs';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import { SEED_USERS } from './fixtures';

const dbPath = path.join(os.tmpdir(), `ajaia-test-${process.pid}-${crypto.randomUUID()}.db`);
process.env.AJAIA_DB_PATH = dbPath;

// Build the schema + seed using an independent connection, then close it so the
// app's own connection (opened lazily by lib/db.ts) starts from a clean file.
const schemaSql = fs.readFileSync(path.resolve(process.cwd(), 'schema.sql'), 'utf8');
const seedDb = new Database(dbPath);
seedDb.pragma('foreign_keys = ON');
seedDb.exec(schemaSql);

const insertUser = seedDb.prepare('INSERT OR REPLACE INTO users (id, name, email) VALUES (?, ?, ?)');
for (const user of SEED_USERS) {
    insertUser.run(user.id, user.name, user.email);
}
seedDb.close();

// Clean up the throwaway database (and its WAL sidecars) when the worker exits.
function cleanup() {
    for (const suffix of ['', '-wal', '-shm']) {
        try {
            fs.unlinkSync(dbPath + suffix);
        } catch {
            /* already gone — ignore */
        }
    }
}
process.on('exit', cleanup);
