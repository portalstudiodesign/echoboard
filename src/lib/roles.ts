export const roles = ["owner", "admin", "member"] as const;
export type Role = (typeof roles)[number];

export function asRole(value: string): Role {
  return (roles as readonly string[]).includes(value) ? (value as Role) : "member";
}

/** Owners and admins manage the team; members only take part in the board. */
export function canManageTeam(role: Role): boolean {
  return role === "owner" || role === "admin";
}
