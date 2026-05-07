-- Tat trigger nhap kho cu de backend xu ly nhap kho bang transaction.
-- Chay script nay tren database clinicmanagement neu trang Nhap thuoc bao:
-- "Database con trigger nhap kho..."

SELECT
  TRIGGER_NAME,
  EVENT_OBJECT_TABLE,
  ACTION_TIMING,
  EVENT_MANIPULATION
FROM INFORMATION_SCHEMA.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND EVENT_MANIPULATION = 'INSERT'
  AND LOWER(EVENT_OBJECT_TABLE) = 'chitietphieunhap'
  AND LOWER(ACTION_STATEMENT) LIKE '%lothuoc%';

DROP PROCEDURE IF EXISTS drop_legacy_import_triggers;

DELIMITER $$

CREATE PROCEDURE drop_legacy_import_triggers()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE trigger_name_value VARCHAR(255);
  DECLARE trigger_cursor CURSOR FOR
    SELECT TRIGGER_NAME
    FROM INFORMATION_SCHEMA.TRIGGERS
    WHERE TRIGGER_SCHEMA = DATABASE()
      AND EVENT_MANIPULATION = 'INSERT'
      AND LOWER(EVENT_OBJECT_TABLE) = 'chitietphieunhap'
      AND LOWER(ACTION_STATEMENT) LIKE '%lothuoc%';
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN trigger_cursor;

  read_loop: LOOP
    FETCH trigger_cursor INTO trigger_name_value;
    IF done = 1 THEN
      LEAVE read_loop;
    END IF;

    SET @drop_trigger_sql = CONCAT(
      'DROP TRIGGER IF EXISTS `',
      REPLACE(trigger_name_value, '`', '``'),
      '`'
    );
    PREPARE drop_trigger_stmt FROM @drop_trigger_sql;
    EXECUTE drop_trigger_stmt;
    DEALLOCATE PREPARE drop_trigger_stmt;
  END LOOP;

  CLOSE trigger_cursor;
END$$

DELIMITER ;

CALL drop_legacy_import_triggers();

DROP PROCEDURE IF EXISTS drop_legacy_import_triggers;

