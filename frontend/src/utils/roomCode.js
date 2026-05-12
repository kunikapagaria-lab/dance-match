const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(len = 4) {
  let code = '';
  for (let i = 0; i < len; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

export function isValidCode(code) {
  if (!code || code.length !== 4) return false;
  return [...code].every(c => CHARS.includes(c));
}
