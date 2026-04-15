/**
 * Feature: Attendance (Absensi)
 *
 * Barrel export untuk fitur absensi.
 *
 * Penggunaan:
 *   import { useAttendance, AttendanceHeatmap } from '@/features/attendance';
 */
export { useAttendance } from '@/hooks/useAttendance';
export { default as AttendanceHeatmap } from '@/components/ui/AttendanceHeatmap';
export type { Attendance, AttendanceStatus } from '@/types';
