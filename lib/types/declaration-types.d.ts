import type { Equal } from './util-types.d.ts';

// A mechanism for third-party extendible discriminated unions: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions

interface Declaration {
  type: string
}

type ValidDeclarations<
  Declarations extends object,
  DeclarationExtras extends object
> = {
  [key in keyof Declarations as (
    Declarations[key] extends DeclarationExtras & Declaration
      ? Equal<key, Declarations[key]['type']>
      : never
  )]: string extends key ? never : Declarations[key]
}

export type AnyDeclaration<
  Declarations extends object,
  DeclarationExtras extends object,
  Valid extends ValidDeclarations<Declarations, DeclarationExtras> = ValidDeclarations<Declarations, DeclarationExtras>
> = Valid[keyof Valid];

export type AnyDeclarationType<
  Declarations extends object,
  DeclarationExtras extends object,
  Valid extends ValidDeclarations<Declarations, DeclarationExtras> = ValidDeclarations<Declarations, DeclarationExtras>
> =
  (keyof Valid) extends string ? Valid[keyof Valid]['type'] : never;

export interface ValidDeclaration<
  Declarations extends object,
  DeclarationExtras extends object,
  Type extends AnyDeclarationType<Declarations, DeclarationExtras>,
> extends Declaration {
  // Validates that its a string literal
  type: string extends Type ? never : (Type extends string ? Type : never);
}
