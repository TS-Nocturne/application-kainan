const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
const ROBLOX_USERNAME = /^[A-Za-z0-9_]{3,20}$/;

export interface RegistrationForm {
  name: string;
  robloxUsername: string;
  gang: string;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function normalize(value: string): string {
  return value
    .replace(CONTROL_CHARACTERS, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function validateRegistrationForm(
  nameValue: string,
  robloxValue: string,
  gangValue: string,
): RegistrationForm {
  const name = normalize(nameValue);
  const robloxUsername = normalize(robloxValue);
  const gang = normalize(gangValue) || '-';

  if (name.length < 1 || name.length > 100) {
    throw new ValidationError('ชื่อ IC ต้องมีความยาว 1–100 ตัวอักษร');
  }

  if (!ROBLOX_USERNAME.test(robloxUsername)) {
    throw new ValidationError(
      'Roblox Username ต้องมี 3–20 ตัว และใช้ได้เฉพาะ A–Z, 0–9 หรือ _',
    );
  }

  if (gang.length > 100) {
    throw new ValidationError('ชื่อสังกัดต้องไม่เกิน 100 ตัวอักษร');
  }

  return { name, robloxUsername, gang };
}
