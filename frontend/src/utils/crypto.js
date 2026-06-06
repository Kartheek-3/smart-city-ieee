// Client-side symmetric encryption/decryption helper
// Protects sensitive fields (messages, phone, emergency contacts) in Firestore storage.
import CryptoJS from 'crypto-js';

const SECRET_KEY = "SmartCitySecureKey_2026";

// XOR Fallback for backward compatibility with legacy fields
const decryptXOR = (cipherText) => {
  const isHex = /^[0-9a-fA-F]+$/.test(cipherText);
  if (!isHex || cipherText.length % 4 !== 0) {
    return cipherText; // Legacy plain text
  }
  try {
    const codePoints = [];
    for (let i = 0; i < cipherText.length; i += 4) {
      const hex = cipherText.substring(i, i + 4);
      codePoints.push(parseInt(hex, 16));
    }
    return codePoints.map((cp, index) => {
      const keyChar = SECRET_KEY.charCodeAt(index % SECRET_KEY.length);
      return String.fromCharCode(cp ^ keyChar);
    }).join('');
  } catch (e) {
    return cipherText;
  }
};

export const encryptText = (text) => {
  if (!text) return "";
  try {
    return CryptoJS.AES.encrypt(text.trim(), SECRET_KEY).toString();
  } catch (e) {
    console.error("Encryption failed:", e);
    return text;
  }
};

export const decryptText = (cipherText) => {
  if (!cipherText) return "";
  try {
    // Attempt standard AES-256 decryption
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (decrypted) {
      return decrypted;
    }
  } catch (e) {
    // Proceed to fallback
  }

  // Fallback to legacy XOR decryption or raw string
  return decryptXOR(cipherText);
};
