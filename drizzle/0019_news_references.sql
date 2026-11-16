CREATE TABLE news_entity_links(news_id TEXT NOT NULL REFERENCES news_items(id),symbol TEXT NOT NULL,created_at TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(news_id,symbol));
