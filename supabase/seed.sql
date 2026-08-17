-- ============================================================================
-- MIZERO AWARDS — DEVELOPMENT / DEMO SEED DATA
-- ----------------------------------------------------------------------------
-- ⚠️  THIS IS DEMO DATA ONLY. It exists so you can try the app immediately.
--     Remove it before the real election by running:
--
--       delete from public.votes;
--       delete from public.candidates;
--       delete from public.categories;
--
--     (Run this file AFTER supabase/schema.sql, in the Supabase SQL Editor.)
-- ============================================================================

-- ---------------------------------------------------------------
-- DEMO categories
-- ---------------------------------------------------------------
insert into public.categories (name, slug, description, icon) values
  ('Miss Mizero', 'miss-mizero', 'The most elegant, kind and inspiring young lady of the year.', '👑'),
  ('Mr Mizero', 'mr-mizero', 'The gentleman who best represents the values of Mizero.', '🤵'),
  ('Best Performance of the Year', 'best-performance', 'The most memorable performance on stage this year.', '🎭'),
  ('Best Team of the Year', 'best-team', 'The team that worked, played and won together.', '🏆'),
  ('Most Loved Teacher', 'most-loved-teacher', 'The teacher students can never stop talking about.', '❤️');

-- ---------------------------------------------------------------
-- DEMO candidates (3 per category)
-- ---------------------------------------------------------------
insert into public.candidates (category_id, name, description, class_name) values
  -- 👑 Miss Mizero
  ((select id from public.categories where slug = 'miss-mizero'),
   'Aline Uwase', 'Debate club president and community volunteer.', 'Senior 6'),
  ((select id from public.categories where slug = 'miss-mizero'),
   'Chantal Ingabire', 'Head girl and netball captain.', 'Senior 5'),
  ((select id from public.categories where slug = 'miss-mizero'),
   'Diane Mukamana', 'Choir soloist with a heart for helping others.', 'Senior 4'),

  -- 🤵 Mr Mizero
  ((select id from public.categories where slug = 'mr-mizero'),
   'Eric Niyonzima', 'Head boy, always first to lend a hand.', 'Senior 6'),
  ((select id from public.categories where slug = 'mr-mizero'),
   'Fabrice Habimana', 'Football team captain and maths tutor.', 'Senior 5'),
  ((select id from public.categories where slug = 'mr-mizero'),
   'Gael Mugisha', 'School radio host with a great sense of humour.', 'Senior 4'),

  -- 🎭 Best Performance of the Year
  ((select id from public.categories where slug = 'best-performance'),
   'Traditional Dance Troupe', 'Their cultural dance won the national schools festival.', 'Senior 4 – 6'),
  ((select id from public.categories where slug = 'best-performance'),
   'School Drama Club – "The Journey"', 'An original play about courage and friendship.', 'All classes'),
  ((select id from public.categories where slug = 'best-performance'),
   'Choir – "Mizero Voices"', 'A breathtaking performance at the annual gala.', 'All classes'),

  -- 🏆 Best Team of the Year
  ((select id from public.categories where slug = 'best-team'),
   'Girls Volleyball Team', 'Undefeated season and regional champions.', 'Seniors'),
  ((select id from public.categories where slug = 'best-team'),
   'Quiz Bowl Team', 'Winners of the inter-school science quiz.', 'Mixed'),
  ((select id from public.categories where slug = 'best-team'),
   'Robotics Club', 'Built an award-winning irrigation prototype.', 'Mixed'),

  -- ❤️ Most Loved Teacher
  ((select id from public.categories where slug = 'most-loved-teacher'),
   'Mr. Jean Claude', 'Physics teacher who makes every lesson an adventure.', 'Staff'),
  ((select id from public.categories where slug = 'most-loved-teacher'),
   'Ms. Claudine', 'English teacher and tireless mentor of the debate club.', 'Staff'),
  ((select id from public.categories where slug = 'most-loved-teacher'),
   'Mr. Patrick', 'Math teacher famous for patience and bad jokes.', 'Staff');

-- ============================================================================
-- DONE ✅  You should now see 5 categories and 15 candidates in the Table
--          Editor. Next step: create your admin account (see README).
-- ============================================================================
