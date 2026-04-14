-- Enable RLS
ALTER TABLE gate_pass ENABLE ROW LEVEL SECURITY;

-- Prajurit: hanya bisa akses data sendiri
CREATE POLICY "Prajurit dapat melihat dan insert gate pass sendiri"
  ON gate_pass
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Prajurit dapat insert gate pass"
  ON gate_pass
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Komandan: hanya bisa approve unitnya (asumsi ada kolom unit_id di tabel users)
CREATE POLICY "Komandan dapat approve/reject gate pass unitnya"
  ON gate_pass
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'komandan'
      AND u.unit_id = (SELECT unit_id FROM users WHERE users.id = gate_pass.user_id)
    )
  );

-- Guard: hanya bisa update status (out/returned) via QR scan
CREATE POLICY "Guard hanya bisa update status via QR"
  ON gate_pass
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'guard'
    )
  ) WITH CHECK (
    status IN ('out', 'returned', 'overdue')
  );
