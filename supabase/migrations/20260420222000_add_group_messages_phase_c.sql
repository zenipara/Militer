-- ============================================================
-- Phase C: Pesan Grup Regu/Satuan
-- Menambah RPC untuk broadcast pesan internal ke anggota aktif
-- dalam satuan yang sama (opsional filter role target).
-- ============================================================

CREATE OR REPLACE FUNCTION public.api_insert_group_message(
  p_caller_id      UUID,
  p_caller_role    TEXT,
  p_isi            TEXT,
  p_target_role    TEXT DEFAULT NULL,
  p_target_satuan  TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_caller        public.users%ROWTYPE;
  v_target_satuan TEXT;
  v_inserted      INTEGER := 0;
BEGIN
  IF NOT is_feature_enabled('messages') THEN
    RAISE EXCEPTION 'messages feature is disabled';
  END IF;

  IF p_caller_id IS NULL OR p_caller_role IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  IF p_isi IS NULL OR btrim(p_isi) = '' THEN
    RAISE EXCEPTION 'Pesan grup tidak boleh kosong';
  END IF;

  IF p_target_role IS NOT NULL AND p_target_role NOT IN ('admin', 'komandan', 'staf', 'guard', 'prajurit') THEN
    RAISE EXCEPTION 'Role target tidak valid';
  END IF;

  SELECT *
  INTO v_caller
  FROM public.users u
  WHERE u.id = p_caller_id
    AND u.role = p_caller_role
    AND u.is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_target_satuan := COALESCE(NULLIF(btrim(p_target_satuan), ''), v_caller.satuan);
  IF v_target_satuan IS NULL OR btrim(v_target_satuan) = '' THEN
    RAISE EXCEPTION 'Satuan target tidak valid';
  END IF;

  INSERT INTO public.messages (from_user, to_user, isi)
  SELECT
    p_caller_id,
    u.id,
    p_isi
  FROM public.users u
  WHERE u.is_active = TRUE
    AND u.id <> p_caller_id
    AND u.satuan = v_target_satuan
    AND (p_target_role IS NULL OR u.role = p_target_role);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.api_insert_group_message(UUID, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
