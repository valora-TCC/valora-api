import { ledgerNamesMatch, pickReusableCarteira } from './ledger-identity';

describe('ledgerNamesMatch', () => {
  it('ignores case, accents and extra spaces', () => {
    expect(ledgerNamesMatch('Conta corrente', 'Conta Corrente')).toBe(true);
    expect(ledgerNamesMatch('Alimentacao', 'Alimentação')).toBe(true);
    expect(ledgerNamesMatch('  Poupança  ', 'Poupanca')).toBe(true);
    expect(ledgerNamesMatch('Nubank', 'Conta Corrente')).toBe(false);
  });
});

describe('pickReusableCarteira', () => {
  const manual = {
    id: 'manual-1',
    idUsuario: 'user-a',
    nome: 'Conta corrente',
    ativo: true,
    idContaExterna: null,
  };
  const linked = {
    id: 'of-1',
    idUsuario: 'user-a',
    nome: 'Conta Corrente',
    ativo: false,
    idContaExterna: 'acc-1',
  };

  it('reuses a same-name wallet instead of creating another', () => {
    expect(pickReusableCarteira([manual], 'user-a', 'Conta Corrente', 'acc-1')?.id).toBe(
      'manual-1',
    );
  });

  it('reuses the row already linked to the external account', () => {
    expect(pickReusableCarteira([linked], 'user-a', 'Conta Corrente', 'acc-1')?.id).toBe('of-1');
  });

  it('prefers the user wallet with the same name over a leftover OF row', () => {
    expect(pickReusableCarteira([manual, linked], 'user-a', 'Conta Corrente', 'acc-1')?.id).toBe(
      'manual-1',
    );
  });

  it('does not steal a wallet linked to another account', () => {
    const otherAccount = { ...linked, id: 'of-2', idContaExterna: 'acc-other', ativo: true };
    expect(pickReusableCarteira([otherAccount], 'user-a', 'Conta Corrente', 'acc-1')).toBeNull();
  });
});
