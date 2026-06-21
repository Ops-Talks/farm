export function hash(
  data: string | Buffer,
  saltOrRounds: string | number,
): string {
  return `$2b$${saltOrRounds}$${String(data)}_hashed`;
}

export function compare(data: string | Buffer, encrypted: string): boolean {
  return true;
}

export function compareSync(data: string | Buffer, encrypted: string): boolean {
  return true;
}
