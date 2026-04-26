-- ============================================================
-- CampusPulse — Supabase Data Seed (from CSV exports)
-- ============================================================

-- 1. Departments
INSERT INTO departments (id, name, code) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Computer Science', 'CS'),
  ('d0000000-0000-0000-0000-000000000002', 'Electronics', 'EC'),
  ('d0000000-0000-0000-0000-000000000003', 'Mechanical', 'ME'),
  (uuid_generate_v4(), 'Information Technology', 'IT')
ON CONFLICT (code) DO NOTHING;

-- 2. Users
INSERT INTO users (id, email, password_hash, role, full_name, phone, is_active, last_login, created_at, updated_at) VALUES
  ('182e08eb-893a-4535-b836-a097fbb0b857', 'guard@campuspulse.edu', '$2b$12$ksb/9fnOeqTkd/lZwnVAWuC7Kb.L05qvtaemBMi9Uw4UZ7LrMHgga', 'guard', 'Guard User', NULL, TRUE, NULL, '2026-04-26T14:26:09.353Z', '2026-04-26T14:26:09.353Z'),
  ('5568ec16-42ce-47fb-bd2d-7d0b078d61f5', 'student@campuspulse.edu', '$2b$12$ksb/9fnOeqTkd/lZwnVAWuC7Kb.L05qvtaemBMi9Uw4UZ7LrMHgga', 'student', 'Student User', NULL, TRUE, NULL, '2026-04-26T14:26:09.353Z', '2026-04-26T14:26:09.353Z'),
  ('a987313a-fd52-4861-87bc-60bab7e79f39', 'admin@campuspulse.edu', '$2b$12$ksb/9fnOeqTkd/lZwnVAWuC7Kb.L05qvtaemBMi9Uw4UZ7LrMHgga', 'admin', 'Admin User', NULL, TRUE, '2026-04-26T17:47:18.064Z', '2026-04-26T14:26:09.353Z', '2026-04-26T17:47:18.064Z'),
  ('e41693f6-9728-4118-851f-4f78ced3b4aa', 'aarya.bhansali@somaiya.edu', '$2a$12$AsJRmLg6suR.jgO/QH0xn.jkj4d9m1tz4.1Cdip.WpIl/LrBfYhHu', 'student', 'Aarya Bhansali', NULL, TRUE, NULL, '2026-04-26T16:03:49.320Z', '2026-04-26T16:03:49.320Z'),
  ('8c93ee7d-01b2-4128-aafc-393c898ed03c', 'subroto.d@somaiya.edu', '$2a$12$uX3am3YclbEI7ZEDAXodeODVKgOfOa7Jkp.g9VqTIqkWFvVVixbSq', 'student', 'Subroto Datta', NULL, TRUE, NULL, '2026-04-26T15:22:09.613Z', '2026-04-26T15:22:09.613Z'),
  ('85fa0fc5-e81f-435a-a162-626aa74ad49b', 'faculty@campuspulse.edu', '$2b$12$ksb/9fnOeqTkd/lZwnVAWuC7Kb.L05qvtaemBMi9Uw4UZ7LrMHgga', 'faculty', 'Faculty User', NULL, TRUE, NULL, '2026-04-26T14:26:09.353Z', '2026-04-26T14:26:09.353Z')
ON CONFLICT (id) DO UPDATE SET
  last_login = EXCLUDED.last_login,
  updated_at = EXCLUDED.updated_at;

-- 3. Students
-- Note: Linking students with missing user_id to the 'student@campuspulse.edu' user for now, or generating dummy ones.
-- The CSV has some entries without user_id, which we skip or assign to the default student user.
INSERT INTO students (id, user_id, gr_number, roll_number, division, semester, department_id, created_at, updated_at) VALUES
  ('fac2b3c8-e16b-4fa2-b063-b82d75de0185', 'e41693f6-9728-4118-851f-4f78ced3b4aa', 'GR6372812', '08', 'A', 1, 'd0000000-0000-0000-0000-000000000001', '2026-04-26T16:03:49.320Z', '2026-04-26T16:03:49.320Z'),
  ('36253eed-f1a0-44b7-9a4f-2677efa70924', '8c93ee7d-01b2-4128-aafc-393c898ed03c', '2220230605', '45', 'B', 1, 'd0000000-0000-0000-0000-000000000001', '2026-04-26T15:22:09.613Z', '2026-04-26T15:22:09.613Z'),
  -- Entries without user_id in CSV but with studentId - linking to default student user ID '5568ec16...'
  ('23794f14-af5f-4764-86e4-8278d8c1b6ee', '5568ec16-42ce-47fb-bd2d-7d0b078d61f5', '234443222', '23', 'B', 1, 'd0000000-0000-0000-0000-000000000001', '2026-04-26T14:41:18.636Z', '2026-04-26T14:41:18.636Z'),
  ('341f96d6-cc3c-479e-813f-91850ccb55d8', '5568ec16-42ce-47fb-bd2d-7d0b078d61f5', '2220230605A', '45', 'B', 1, 'd0000000-0000-0000-0000-000000000001', '2026-04-26T14:26:57.361Z', '2026-04-26T14:26:57.361Z'),
  ('2bba1b92-bdcd-4a17-9a01-45fe7744a119', '5568ec16-42ce-47fb-bd2d-7d0b078d61f5', '2220230605B', '45', 'B', 1, 'd0000000-0000-0000-0000-000000000001', '2026-04-26T14:27:24.169Z', '2026-04-26T14:27:24.169Z'),
  ('c22553eb-86e2-4d30-9f8a-11a212ab226b', '5568ec16-42ce-47fb-bd2d-7d0b078d61f5', 'q34567', '23', 'BB', 1, 'd0000000-0000-0000-0000-000000000001', '2026-04-26T14:29:23.915Z', '2026-04-26T14:29:23.915Z')
ON CONFLICT (id) DO NOTHING;

-- 4. Faculty
-- Linking the faculty entry from CSV to the 'faculty@campuspulse.edu' user ID '85fa0fc5...'
INSERT INTO faculty (id, user_id, employee_id, department_id, designation) VALUES
  ('89f755ac-3dc0-413d-9712-60e8d3a7df88', '85fa0fc5-e81f-435a-a162-626aa74ad49b', 'EMP_IT_01', 
   (SELECT id FROM departments WHERE code = 'IT' LIMIT 1), 
   'Assistant Professor')
ON CONFLICT (id) DO NOTHING;
