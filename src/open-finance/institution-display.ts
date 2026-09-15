/** Realistic bank label shown in the app (seeded / sandbox data stays local). */
export const DISPLAY_BANK_NAME = 'Nubank';

/** Maps Belvo sandbox / mock institution ids to a realistic display name. */
export function displayInstitutionName(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (key === 'mockbank' || key.includes('mockbank') || key === 'ofmockbank_br_retail') {
    return DISPLAY_BANK_NAME;
  }
  return raw.trim() || DISPLAY_BANK_NAME;
}
