-- 01_init_schema.sql
-- Creates base schema for chat/lists/tasks/raw_msgs

-- Drop tables if they already exist (for testing or re-seeding)
DROP TABLE IF EXISTS raw_msgs CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS lists CASCADE;
DROP TABLE IF EXISTS chat_ids CASCADE;

-- ============================================================
-- Table: chat_ids
-- ============================================================
CREATE TABLE chat_ids (
    chat_id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    CONSTRAINT chat_ids_chat_id_unique UNIQUE (chat_id)
);

-- ============================================================
-- Table: lists
-- ============================================================
CREATE TABLE lists (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT
);

-- ============================================================
-- Table: tasks
-- ============================================================
CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    chat_id BIGINT NOT NULL,
    list_id BIGINT,
    CONSTRAINT fk_tasks_chat FOREIGN KEY (chat_id)
        REFERENCES chat_ids (chat_id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tasks_list FOREIGN KEY (list_id)
        REFERENCES lists (id)
        ON DELETE SET NULL
);