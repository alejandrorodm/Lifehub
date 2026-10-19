import { getRawConnection } from "../../db/client";
import { getCurrentUserId } from "../../lib/requestContext";
import type { SearchQuery, SearchResultDto, SearchResultType } from "@shared/schemas/search";

interface SearchIndexRow {
  entity_type: SearchResultType;
  entity_id: string;
  title: string;
  snippet: string;
}

/** Convierte el texto libre del usuario en una consulta FTS5 de coincidencia por prefijo (AND implícito). */
function toMatchQuery(q: string): string {
  const tokens = q
    .split(/\s+/)
    .map((t) => t.replace(/["*]/g, ""))
    .filter(Boolean);
  if (tokens.length === 0) return '""';
  return tokens.map((t) => `"${t}"*`).join(" ");
}

export function search(query: SearchQuery): SearchResultDto[] {
  const connection = getRawConnection();
  const matchQuery = toMatchQuery(query.q);

  const typeFilter = query.type ? "AND entity_type = @type" : "";
  const rows = connection
    .prepare(
      `SELECT entity_type, entity_id, title,
              snippet(search_index, 4, '', '', '…', 10) as snippet
       FROM search_index
       WHERE search_index MATCH @match AND user_id = @userId ${typeFilter}
       ORDER BY rank
       LIMIT 30`,
    )
    .all({ match: matchQuery, userId: getCurrentUserId(), type: query.type ?? null }) as SearchIndexRow[];

  return rows.map((row) => ({
    type: row.entity_type,
    id: row.entity_id,
    title: row.title,
    snippet: row.snippet,
  }));
}
