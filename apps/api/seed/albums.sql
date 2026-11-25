-- R Gram 初始資料（只有專輯）：production D1 用。由 seed/discography.json 生成，唔好人手改：
--   npm run seed:sql -w apps/api
-- 只可以由人喺 apps/api 行一次（agent 同 CI 一律唔行）：
--   npx wrangler d1 execute r-gram --remote --file seed/albums.sql
-- 重跑冇害：已有嘅 id 唔郁，同類別序號有人用就跳過。
-- 行完之後一定要重新生成 catalog：登入管理端後叫 POST /api/catalog/rebuild（API-061）。
-- 本機開發用 npm run seed -w apps/api（只寫本機資料）。

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'apollo-18', 'Apollo 18', 'A', 2008, 'album', 1, '金牌娛樂 (Gold Label Entertainment)', '#6e6e6e', 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'beaming', 'Beaming', 'B', 2009, 'album', 2, '金牌大風 (Gold Typhoon)', '#6e6e6e', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'connected', 'Connected', 'C', 2010, 'album', 3, '金牌大風', '#6e6e6e', 2, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'dedicated-to', 'Dedicated To…', 'D', 2011, 'album', 4, '金牌大風', '#6e6e6e', 3, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 4)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'easy', 'Easy', 'E', 2012, 'album', 5, '金牌大風', '#6e6e6e', 4, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 5)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'frank', 'Frank', 'F', 2014, 'album', 6, '寰亞唱片', '#6e6e6e', 5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 6)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'gotta-go', 'Gotta Go', 'G', 2016, 'album', 7, '寰亞音樂 (Media Asia Music Ltd.)', '#6e6e6e', 6, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'hours', 'Hours', 'H', 2018, 'album', 8, 'R Flat', '#6e6e6e', 7, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 8)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'i', 'i', 'I', 2020, 'album', 9, 'R Flat', '#6e6e6e', 8, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 9)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'juntos', 'JUNTOS', 'J', 2023, 'album', 10, 'R Flat（發行：Golden Dynamic）', '#6e6e6e', 9, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'komorebi', 'KOMOREBI', 'K', 2026, 'album', 11, 'R Flat', '#6e6e6e', 10, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'album' AND category_no = 11)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'frank-ep', '¿Frank?', 'F', 2014, 'ep', 1, '寰亞唱片', '#6e6e6e', 11, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'ep' AND category_no = 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'ni-dou', '呢度', '呢', 2016, 'ep', 2, 'R Flat', '#6e6e6e', 12, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'ep' AND category_no = 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'zoi-jat-hei', '在一起', '在', 2023, 'ep', 3, 'R Flat', '#6e6e6e', 13, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'ep' AND category_no = 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'zoeng-ngaa', '橡芽', '橡', 2012, 'best', 1, '金牌大風', '#6e6e6e', 14, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'best' AND category_no = 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'we-are-rubberband', 'We Are RubberBand', 'W', 2015, 'best', 2, '金牌大風 (Gold Typhoon) / Warner Music Hong Kong', '#6e6e6e', 15, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'best' AND category_no = 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'rubberband-concert-1', 'RubberBand Concert #1', 'R', 2009, 'live', 1, '金牌大風', '#6e6e6e', 16, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'live' AND category_no = 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'rubberband-ciao-2021-live', 'RubberBand Ciao 2021 (Live)', 'R', 2022, 'live', 2, 'R Flat (distributed by Golden Dynamic / 金牌大風)', '#6e6e6e', 17, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'live' AND category_no = 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'men-on-the-dragon-ost', '電影《逆流大叔》原聲大碟', '電', 2022, 'ost', 1, 'One Cool Music (HK) Limited', '#6e6e6e', 18, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'ost' AND category_no = 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'zung-jyu-hou-tin-hei', '終於好天氣（方皓玟 × RubberBand）', '終', 2016, 'single', 1, '', '#6e6e6e', 19, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'single' AND category_no = 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO albums (id, title, wheel_key, year, category, category_no, label, accent, sort_order, created_at, updated_at)
SELECT 'joeng-sai-gaai-dou-dung', '讓世界都懂', '讓', 2024, 'single', 2, 'R Flat', '#6e6e6e', 20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE NOT EXISTS (SELECT 1 FROM albums WHERE category = 'single' AND category_no = 2)
ON CONFLICT (id) DO NOTHING;
