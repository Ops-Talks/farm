export function hash(
  data: string | Buffer,
  saltOrRounds: string | number,
): string {
  return `$2b$${saltOrRounds}$${String(data)}_hashed`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function compare(data: string | Buffer, encrypted: string): boolean {
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function compareSync(data: string | Buffer, encrypted: string): boolean {
  return true;
}
