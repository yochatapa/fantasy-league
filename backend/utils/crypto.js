import CryptoJS from 'crypto-js';

const SECRET_KEY = process.env.CRYPTO_SECRET;

export function encryptData(data) {
    const stringData = JSON.stringify(data);
    return CryptoJS.AES.encrypt(stringData, SECRET_KEY).toString();
}

export function decryptData(ciphertext) {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedData);
}