-- ============================================================
-- KARYO OS — Seed Data Migration
-- Sample accounts for development / testing
-- All PINs are: 123456
-- ============================================================

-- Admin
SELECT public.create_user_with_pin(
  '1000001', '123456', 'Admin Karyo', 'admin', 'Batalyon 1',
  'Letnan Kolonel', 'Komandan Batalyon'
);

-- Komandan
SELECT public.create_user_with_pin(
  '2000001', '123456', 'Budi Santoso', 'komandan', 'Batalyon 1',
  'Mayor', 'Komandan Kompi A'
);

-- Prajurit
SELECT public.create_user_with_pin(
  '3000001', '123456', 'Agus Pratama', 'prajurit', 'Batalyon 1',
  'Sersan Dua', 'Anggota Regu 1'
);
SELECT public.create_user_with_pin(
  '3000002', '123456', 'Hendra Wijaya', 'prajurit', 'Batalyon 1',
  'Prajurit Kepala', 'Anggota Regu 1'
);
SELECT public.create_user_with_pin(
  '3000003', '123456', 'Eko Susanto', 'prajurit', 'Batalyon 1',
  'Prajurit Dua', 'Anggota Regu 2'
);

-- Sample announcement
INSERT INTO public.announcements (judul, isi, target_role, is_pinned)
VALUES (
  'Selamat Datang di Karyo OS',
  'Sistem operasional batalyon telah aktif. Semua personel wajib melakukan check-in setiap hari kerja sebelum pukul 07.30 WIB.',
  ARRAY['admin','komandan','prajurit'],
  true
);
