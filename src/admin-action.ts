export type AdminAction = 'interview' | 'approve' | 'reject';

export interface ParsedAdminAction {
  action: AdminAction;
  registrationId: string;
}

const ADMIN_ACTION_ID =
  /^registration:(interview|approve|reject):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function parseAdminAction(customId: string): ParsedAdminAction | null {
  const match = ADMIN_ACTION_ID.exec(customId);
  if (!match?.[1] || !match[2]) return null;

  return {
    action: match[1] as AdminAction,
    registrationId: match[2],
  };
}
