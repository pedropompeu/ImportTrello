/**
 * schema.js — SQLite Schema (better-sqlite3)
 *
 * Tabelas:
 *   settings        — credenciais e preferências do usuário (criptografadas)
 *   boards          — boards do Trello conhecidos pelo app
 *   projects        — projetos locais (agrupam tasks antes de subir)
 *   tasks           — tasks individuais com status de envio
 *   task_checklist  — itens de checklist separados para flexibilidade
 *   task_links      — URLs/attachments vinculados a uma task
 *   templates       — templates pré-definidos e criados pelo usuário
 *   template_tasks  — tasks de um template
 *   ai_providers    — provedores de IA configurados pelo usuário
 */

const SCHEMA = `
-- ─── Configurações globais ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  encrypted  INTEGER DEFAULT 0,   -- 1 = valor está criptografado com AES
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ─── Boards do Trello ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS boards (
  id          TEXT PRIMARY KEY,    -- ID vindo do Trello
  name        TEXT NOT NULL,
  url         TEXT,
  last_synced TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TEXT DEFAULT (datetime('now'))
);

-- ─── Projetos locais ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,    -- UUID local
  name        TEXT NOT NULL,
  description TEXT,
  board_id    TEXT,                -- FK → boards.id (pode ser NULL antes de vincular)
  template_id TEXT,               -- FK → templates.id
  source_type TEXT DEFAULT 'manual', -- manual | json | csv | xlsx | ai
  status      TEXT DEFAULT 'draft',  -- draft | ready | importing | done
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE SET NULL
);

-- ─── Tasks ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id           TEXT PRIMARY KEY,   -- UUID local
  project_id   TEXT NOT NULL,
  sprint       TEXT,               -- ex: "Sprint 0"
  sprint_title TEXT,
  titulo       TEXT NOT NULL,
  tipo         TEXT DEFAULT 'Backend',   -- label tipo
  destino_col  TEXT DEFAULT 'Backlog',   -- coluna destino no board
  desc_limpa   TEXT,               -- descrição sem checklist
  due_date     TEXT,               -- ISO date opcional
  position     INTEGER DEFAULT 0,  -- ordem dentro do projeto
  status       TEXT DEFAULT 'pending', -- pending | importing | done | error
  trello_card_id TEXT,             -- preenchido após envio
  error_msg    TEXT,
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- ─── Checklist items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_checklist (
  id        TEXT PRIMARY KEY,
  task_id   TEXT NOT NULL,
  text      TEXT NOT NULL,
  position  INTEGER DEFAULT 0,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ─── Links e anexos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_links (
  id        TEXT PRIMARY KEY,
  task_id   TEXT NOT NULL,
  type      TEXT DEFAULT 'url',  -- url | file
  label     TEXT,                -- nome amigável (ex: "Figma Design")
  value     TEXT NOT NULL,       -- URL ou path do arquivo
  position  INTEGER DEFAULT 0,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- ─── Provedores de IA ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_providers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,      -- ex: "OpenAI", "Anthropic", "Gemini"
  model      TEXT NOT NULL,      -- ex: "gpt-4o", "claude-sonnet-4-20250514"
  api_key    TEXT,               -- criptografado
  base_url   TEXT,               -- para providers customizados / OpenAI-compat
  is_active  INTEGER DEFAULT 0,  -- apenas 1 pode estar ativo por vez
  created_at TEXT DEFAULT (datetime('now'))
);

-- ─── Templates ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT DEFAULT 'custom',  -- builtin | custom
  icon        TEXT DEFAULT '📋',
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS template_tasks (
  id           TEXT PRIMARY KEY,
  template_id  TEXT NOT NULL,
  sprint       TEXT,
  sprint_title TEXT,
  titulo       TEXT NOT NULL,
  tipo         TEXT DEFAULT 'Backend',
  destino_col  TEXT DEFAULT 'Backlog',
  desc_template TEXT,
  checklist    TEXT,             -- JSON array de strings
  position     INTEGER DEFAULT 0,
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
);

-- ─── Índices de performance ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_project    ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_checklist_task   ON task_checklist(task_id);
CREATE INDEX IF NOT EXISTS idx_links_task       ON task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_template_tasks   ON template_tasks(template_id);
`

module.exports = { SCHEMA }
