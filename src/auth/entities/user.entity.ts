/**
 * Represents a user in the Farm system.
 */
export class User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}
