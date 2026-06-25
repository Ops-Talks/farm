export function hash(
  data: string | Buffer,
  saltOrRounds: string | number,
): string {
  return `$2b$${saltOrRounds}$${String(data)}_hashed`;
}

export function compare(data: string | Buffer, encrypted: string): boolean {
  const saltPrefix = "$2b$";
  if (typeof encrypted !== "string" || !encrypted.startsWith(saltPrefix))
    return false;
  const salt = encrypted.slice(saltPrefix.length).split("$")[0];
  if (!salt) return false;
  return encrypted === hash(data, salt);
}

export function compareSync(data: string | Buffer, encrypted: string): boolean {
  return compare(data, encrypted);
}
