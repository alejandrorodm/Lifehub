-- Índice de búsqueda global (FTS5). Se aplica manualmente tras las migraciones
-- de drizzle-kit porque las tablas virtuales no son modelables como una tabla
-- relacional normal.
--
-- Desde la fase 13 (perfiles) el índice lleva `user_id`: sin él, la búsqueda
-- de un perfil devolvería resultados del otro. Una tabla virtual FTS5 no se
-- puede "ALTER" para añadir una columna, así que en vez de sentencias
-- aditivas idempotentes (como antes), este script reconstruye el índice
-- entero en cada arranque a partir de las tablas de origen — con los
-- volúmenes de datos de una app personal esto es barato, y evita tener que
-- llevar un flag de "migración ya aplicada" aparte solo para esto.

DROP TRIGGER IF EXISTS search_tasks_insert;
DROP TRIGGER IF EXISTS search_tasks_update;
DROP TRIGGER IF EXISTS search_tasks_delete;
DROP TRIGGER IF EXISTS search_notes_insert;
DROP TRIGGER IF EXISTS search_notes_update;
DROP TRIGGER IF EXISTS search_notes_delete;
DROP TRIGGER IF EXISTS search_projects_insert;
DROP TRIGGER IF EXISTS search_projects_update;
DROP TRIGGER IF EXISTS search_projects_delete;
DROP TRIGGER IF EXISTS search_events_insert;
DROP TRIGGER IF EXISTS search_events_update;
DROP TRIGGER IF EXISTS search_events_delete;
DROP TABLE IF EXISTS search_index;

CREATE VIRTUAL TABLE search_index USING fts5(
  entity_type,
  entity_id UNINDEXED,
  user_id UNINDEXED,
  title,
  body,
  tokenize = 'unicode61'
);

INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
SELECT 'task', id, user_id, title, coalesce(description, '') FROM tasks WHERE deleted_at IS NULL;

INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
SELECT 'note', id, user_id, title, coalesce(content_text, '')
FROM notes WHERE deleted_at IS NULL AND archived_at IS NULL;

INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
SELECT 'project', id, user_id, name, coalesce(description, '')
FROM projects WHERE deleted_at IS NULL AND archived_at IS NULL;

INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
SELECT 'event', id, user_id, title, coalesce(description, '') || ' ' || coalesce(location, '')
FROM events WHERE deleted_at IS NULL;

-- tasks -----------------------------------------------------------------
CREATE TRIGGER search_tasks_insert AFTER INSERT ON tasks BEGIN
  INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
  VALUES ('task', new.id, new.user_id, new.title, coalesce(new.description, ''));
END;

CREATE TRIGGER search_tasks_update AFTER UPDATE ON tasks BEGIN
  DELETE FROM search_index WHERE entity_type = 'task' AND entity_id = old.id;
  INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
  SELECT 'task', new.id, new.user_id, new.title, coalesce(new.description, '')
  WHERE new.deleted_at IS NULL;
END;

CREATE TRIGGER search_tasks_delete AFTER DELETE ON tasks BEGIN
  DELETE FROM search_index WHERE entity_type = 'task' AND entity_id = old.id;
END;

-- notes -------------------------------------------------------------------
CREATE TRIGGER search_notes_insert AFTER INSERT ON notes BEGIN
  INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
  VALUES ('note', new.id, new.user_id, new.title, coalesce(new.content_text, ''));
END;

CREATE TRIGGER search_notes_update AFTER UPDATE ON notes BEGIN
  DELETE FROM search_index WHERE entity_type = 'note' AND entity_id = old.id;
  INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
  SELECT 'note', new.id, new.user_id, new.title, coalesce(new.content_text, '')
  WHERE new.deleted_at IS NULL AND new.archived_at IS NULL;
END;

CREATE TRIGGER search_notes_delete AFTER DELETE ON notes BEGIN
  DELETE FROM search_index WHERE entity_type = 'note' AND entity_id = old.id;
END;

-- projects -----------------------------------------------------------------
CREATE TRIGGER search_projects_insert AFTER INSERT ON projects BEGIN
  INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
  VALUES ('project', new.id, new.user_id, new.name, coalesce(new.description, ''));
END;

CREATE TRIGGER search_projects_update AFTER UPDATE ON projects BEGIN
  DELETE FROM search_index WHERE entity_type = 'project' AND entity_id = old.id;
  INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
  SELECT 'project', new.id, new.user_id, new.name, coalesce(new.description, '')
  WHERE new.deleted_at IS NULL AND new.archived_at IS NULL;
END;

CREATE TRIGGER search_projects_delete AFTER DELETE ON projects BEGIN
  DELETE FROM search_index WHERE entity_type = 'project' AND entity_id = old.id;
END;

-- events -----------------------------------------------------------------
CREATE TRIGGER search_events_insert AFTER INSERT ON events BEGIN
  INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
  VALUES ('event', new.id, new.user_id, new.title, coalesce(new.description, '') || ' ' || coalesce(new.location, ''));
END;

CREATE TRIGGER search_events_update AFTER UPDATE ON events BEGIN
  DELETE FROM search_index WHERE entity_type = 'event' AND entity_id = old.id;
  INSERT INTO search_index (entity_type, entity_id, user_id, title, body)
  SELECT 'event', new.id, new.user_id, new.title, coalesce(new.description, '') || ' ' || coalesce(new.location, '')
  WHERE new.deleted_at IS NULL;
END;

CREATE TRIGGER search_events_delete AFTER DELETE ON events BEGIN
  DELETE FROM search_index WHERE entity_type = 'event' AND entity_id = old.id;
END;
