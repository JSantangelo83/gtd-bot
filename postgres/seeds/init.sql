DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS lists CASCADE;
DROP TABLE IF EXISTS chats CASCADE;

CREATE TABLE chats (
    id BIGSERIAL PRIMARY KEY,
    telegram_chat_id BIGINT UNIQUE,
    name TEXT NOT NULL
);

CREATE TABLE lists (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT
);

CREATE TABLE tasks (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    chat_id BIGINT NOT NULL,
    list_id BIGINT,
    CONSTRAINT fk_tasks_chat FOREIGN KEY (chat_id)
        REFERENCES chats (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_tasks_list FOREIGN KEY (list_id)
        REFERENCES lists (id)
        ON DELETE SET NULL
);

INSERT INTO chats (telegram_chat_id, name) VALUES (7258342357, 'Joakin');