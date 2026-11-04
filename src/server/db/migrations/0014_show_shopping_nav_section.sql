-- Fase 20: la sección "Compra" es nueva. Los perfiles que ya personalizaron
-- las secciones visibles la tendrían oculta; se añade una única vez al final
-- de su lista (después pueden ocultarla y esta migración no se repite).
UPDATE `settings`
SET `value` = json_insert(`value`, '$.visibleNavSections[#]', 'shopping')
WHERE `key` = 'app'
  AND json_type(`value`, '$.visibleNavSections') = 'array'
  AND NOT EXISTS (
    SELECT 1 FROM json_each(`settings`.`value`, '$.visibleNavSections') WHERE json_each.value = 'shopping'
  );
