/**
 * Antenatal / postnatal visit records for the Mama Passport.
 * Supports the handbook; does not replace it.
 */

import { db, type VisitRecord } from '../storage/db';

export async function saveVisit(visit: VisitRecord): Promise<void> {
  await db.visits.put(visit);
}

export async function listVisits(): Promise<VisitRecord[]> {
  return db.visits.orderBy('tsMs').reverse().toArray();
}

export async function deleteVisit(id: string): Promise<void> {
  await db.visits.delete(id);
}

/** Creates a visit id and timestamp defaults for harness / UI forms. */
export function newVisit(
  partial: Omit<VisitRecord, 'id' | 'tsMs'> & { id?: string; tsMs?: number },
): VisitRecord {
  return {
    id: partial.id ?? crypto.randomUUID(),
    tsMs: partial.tsMs ?? Date.now(),
    type: partial.type,
    ...(partial.facilityName !== undefined ? { facilityName: partial.facilityName } : {}),
    ...(partial.clinicSystolic !== undefined ? { clinicSystolic: partial.clinicSystolic } : {}),
    ...(partial.clinicDiastolic !== undefined ? { clinicDiastolic: partial.clinicDiastolic } : {}),
    ...(partial.urineProtein !== undefined ? { urineProtein: partial.urineProtein } : {}),
    ...(partial.notes !== undefined ? { notes: partial.notes } : {}),
    ...(partial.nextAppointmentTsMs !== undefined
      ? { nextAppointmentTsMs: partial.nextAppointmentTsMs }
      : {}),
  };
}
