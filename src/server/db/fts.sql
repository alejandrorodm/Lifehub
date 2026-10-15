-- Índice de búsqueda global (FTS5). Se aplica manualmente tras las migraciones
-- de drizzle-kit porque las tablas virtuales no son modelables como una tabla
-- relacional normal. Todas las sentencias son idempotentes.

CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
  entity_type,
  entity_id UNINDEXED,
  title,
  body,
  tokenize = 'unicode61'
);

-- tasks -----------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_tasks_insert AFTER INSERT ON tasks BEGIN
  INSERT INTO search_index (entity_type, entity_id, title, body)
  VALUES ('task', new.id, new.title, coalesce(new.description, ''));
END;

CREATE TRIGGER IF NOT EXISTS search_tasks_update AFTER UPDATE ON tasks BEGIN
  DELETE FROM search_index WHERE entity_type = 'task' AND entity_id = old.id;
  INSERT INTO search_index (entity_type, entity_id, title, body)
  SELECT 'task', new.id, new.title, coalesce(new.description, '')
  WHERE new.deleted_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS search_tasks_delete AFTER DELETE ON tasks BEGIN
  DELETE FROM search_index WHERE entity_type = 'task' AND entity_id = old.id;
END;

-- notes -------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_notes_insert AFTER INSERT ON notes BEGIN
  INSERT INTO search_index (entity_type, entity_id, title, body)
  VALUES ('note', new.id, new.title, coalesce(new.content_text, ''));
END;

CREATE TRIGGER IF NOT EXISTS search_notes_update AFTER UPDATE ON notes BEGIN
  DELETE FROM search_index WHERE entity_type = 'note' AND entity_id = old.id;
  INSERT INTO search_index (entity_type, entity_id, title, body)
  SELECT 'note', new.id, new.title, coalesce(new.content_text, '')
  WHERE new.deleted_at IS NULL AND new.archived_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS search_notes_delete AFTER DELETE ON notes BEGIN
  DELETE FROM search_index WHERE entity_type = 'note' AND entity_id = old.id;
END;

-- projects -----------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_projects_insert AFTER INSERT ON projects BEGIN
  INSERT INTO search_index (entity_type, entity_id, title, body)
  VALUES ('project', new.id, new.name, coalesce(new.description, ''));
END;

CREATE TRIGGER IF NOT EXISTS search_projects_update AFTER UPDATE ON projects BEGIN
  DELETE FROM search_index WHERE entity_type = 'project' AND entity_id = old.id;
  INSERT INTO search_index (entity_type, entity_id, title, body)
  SELECT 'project', new.id, new.name, coalesce(new.description, '')
  WHERE new.deleted_at IS NULL AND new.archived_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS search_projects_delete AFTER DELETE ON projects BEGIN
  DELETE FROM search_index WHERE entity_type = 'project' AND entity_id = old.id;
END;

-- events -----------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS search_events_insert AFTER INSERT ON events BEGIN
  INSERT INTO search_index (entity_type, entity_id, title, body)
  VALUES ('event', new.id, new.title, coalesce(new.description, '') || ' ' || coalesce(new.location, ''));
END;

CREATE TRIGGER IF NOT EXISTS search_events_update AFTER UPDATE ON events BEGIN
  DELETE FROM search_index WHERE entity_type = 'event' AND entity_id = old.id;
  INSERT INTO search_index (entity_type, entity_id, title, body)
  SELECT 'event', new.id, new.title, coalesce(new.description, '') || ' ' || coalesce(new.location, '')
  WHERE new.deleted_at IS NULL;
END;

CREATE TRIGGER IF NOT EXISTS search_events_delete AFTER DELETE ON events BEGIN
  DELETE FROM search_index WHERE entity_type = 'event' AND entity_id = old.id;
END;
