
CREATE TABLE IF NOT EXISTS t_p1532187_sky_blue_initiative_.page_sections (
  id SERIAL PRIMARY KEY,
  section_key VARCHAR(50) NOT NULL UNIQUE,
  title TEXT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP DEFAULT now()
);

INSERT INTO t_p1532187_sky_blue_initiative_.page_sections (section_key, title, content) VALUES
  ('delivery', 'Доставка', '[{"title":"Курьер по городу","desc":"Доставка в день заказа при оформлении до 16:00. Бесплатно от 2 000 ₽.","icon":"Bike"},{"title":"СДЭК / Почта России","desc":"Доставка по всей России. Срок 1–7 дней в зависимости от региона.","icon":"Package"},{"title":"Самовывоз","desc":"Забери заказ в нашем магазине без ожидания. Адрес в Telegram.","icon":"MapPin"},{"title":"Оплата","desc":"Наличные, карта, СБП, перевод на карту. Оплата при получении.","icon":"CreditCard"}]'::jsonb),
  ('support', 'Поддержка', '[{"title":"Telegram-чат","desc":"Ответим в течение 15 минут с 9:00 до 23:00 ежедневно.","icon":"Send"},{"title":"Подбор устройства","desc":"Поможем выбрать вейп под ваш стиль, вкус и бюджет. Бесплатно.","icon":"Search"},{"title":"Гарантия","desc":"14 дней на возврат. Гарантийный ремонт на все pod-системы.","icon":"ShieldCheck"},{"title":"FAQ","desc":"Ответы на частые вопросы: как заправить, как обслуживать, что выбрать.","icon":"HelpCircle"}]'::jsonb)
ON CONFLICT (section_key) DO NOTHING;
