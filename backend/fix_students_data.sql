-- ============================================================
-- CampusPulse — Clean and Rewrite Students Table
-- ============================================================

-- 1. Delete all existing records from the students table
-- CASCADE is used to ensure related records (like attendance) are also handled if they exist.
TRUNCATE TABLE public.students CASCADE;

-- 2. Insert valid, unique student entries from the CSV data
-- We ensure each gr_number is unique as per the database constraint.
INSERT INTO public.students (id, user_id, gr_number, roll_number, division, semester, department_id, created_at, updated_at) VALUES
  -- Aarya Bhansali (Valid)
  ('fac2b3c8-e16b-4fa2-b063-b82d75de0185', 'e41693f6-9728-4118-851f-4f78ced3b4aa', 'GR6372812', '08', 'A', 1, 'd0000000-0000-0000-0000-000000000001', '2026-04-26T16:03:49.320Z', '2026-04-26T16:03:49.320Z'),
  
  -- Subroto Datta (Valid)
  ('36253eed-f1a0-44b7-9a4f-2677efa70924', '8c93ee7d-01b2-4128-aafc-393c898ed03c', '2220230605', '45', 'B', 1, 'd0000000-0000-0000-0000-000000000001', '2026-04-26T15:22:09.613Z', '2026-04-26T15:22:09.613Z'),
  
  -- Extra Unique Records from CSV (linked to default student user if user_id is missing)
  -- Data from Row 2
  ('23794f14-af5f-4764-86e4-8278d8c1b6ee', '5568ec16-42ce-47fb-bd2d-7d0b078d61f5', '234443222', '23', 'B', 1, 'd0000000-0000-0000-0000-000000000001', '2026-04-26T14:41:18.636Z', '2026-04-26T14:41:18.636Z'),
  
  -- Data from Row 7
  ('c22553eb-86e2-4d30-9f8a-11a212ab226b', '5568ec16-42ce-47fb-bd2d-7d0b078d61f5', 'q34567', '23', 'BB', 1, 'd0000000-0000-0000-0000-000000000001', '2026-04-26T14:29:23.915Z', '2026-04-26T14:29:23.915Z');

-- Note: We avoided rows 3 and 5 because they share the same gr_number '2220230605' 
-- as Subroto Datta, which violates the UNIQUE constraint in PostgreSQL.

-- 3. Verify the count
SELECT count(*) as total_students FROM public.students;
