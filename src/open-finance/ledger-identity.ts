/** Compare carteira/categoria names ignoring case, accents and extra spaces. */
export function normalizeLedgerName(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function ledgerNamesMatch(a: string, b: string): boolean {
  return normalizeLedgerName(a) === normalizeLedgerName(b);
}

export type CarteiraIdentity = {
  id: string;
  idUsuario: string;
  nome: string;
  ativo: boolean;
  idContaExterna: string | null;
};

/**
 * Reuse an existing wallet instead of creating a second row with the same name.
 * Prefers a same-name wallet, then the row already linked to this external account.
 */
export function pickReusableCarteira(
  carteiras: CarteiraIdentity[],
  userId: string,
  nome: string,
  idContaExterna: string,
): CarteiraIdentity | null {
  const owned = carteiras.filter((c) => c.idUsuario === userId);
  const byExternal = owned.find((c) => c.idContaExterna === idContaExterna) ?? null;

  const sameName = owned.filter(
    (c) =>
      ledgerNamesMatch(c.nome, nome) &&
      (!c.idContaExterna || c.idContaExterna === idContaExterna),
  );
  const byName = sameName.find((c) => c.ativo) ?? sameName[0] ?? null;

  if (byName && byExternal && byName.id !== byExternal.id) {
    return byName;
  }
  return byName ?? byExternal;
}
