const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
const ROBLOX_USERNAME = /^[A-Za-z0-9_]{3,20}$/;

export interface RegistrationForm {
  serverNickname: string;
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
  serverNicknameValue: string,
  nameValue: string,
  robloxValue: string,
  gangValue: string,
): RegistrationForm {
  const serverNickname = normalize(serverNicknameValue);
  const name = normalize(nameValue);
  const robloxUsername = normalize(robloxValue);
  const gang = normalize(gangValue) || '-';

  if (serverNickname.length < 1 || serverNickname.length > 32) {
    throw new ValidationError(
      'ชื่อที่ใช้ในเซิร์ฟเวอร์ Discord ต้องมีความยาว 1–32 ตัวอักษร',
    );
  }

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

  return { serverNickname, name, robloxUsername, gang };
}
