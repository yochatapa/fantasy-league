export function generateRandomCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export async function isCodeUnique(code, checkFunction) {
    return await checkFunction(code);
}

export async function generateUniqueCode(checkFunction, length = 6) {
    let code;
    let unique = false;

    while (!unique) {
        code = generateRandomCode(length);
        unique = await isCodeUnique(code, checkFunction);
    }

    return code;
}
