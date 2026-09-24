export const DISPLAY_BANK_NAME = 'Nubank';

export function displayInstitutionName(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (key === 'mockbank' || key.includes('mockbank') || key === 'ofmockbank_br_retail') {
    return DISPLAY_BANK_NAME;
  }
  return raw.trim() || DISPLAY_BANK_NAME;
}
