/* Web Crypto 小工具：random token、SHA-256、HMAC（state cookie 簽名）、constant-time 比較 */

const encoder = new TextEncoder();

export const base64UrlEncode = (bytes: Uint8Array): string =>
    btoa(String.fromCharCode(...bytes))
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replace(/=+$/, '');

export const base64UrlDecode = (text: string): Uint8Array => {
    const base64 = text.replaceAll('-', '+').replaceAll('_', '/');
    return Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
};

/** crypto.getRandomValues：CSPRNG，token 估唔到、亦唔可以由其他值推算 */
export const randomBase64Url = (byteLength: number): string =>
    base64UrlEncode(crypto.getRandomValues(new Uint8Array(byteLength)));

const sha256 = async (data: string): Promise<Uint8Array> =>
    new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(data)));

export const sha256Hex = async (data: string): Promise<string> =>
    [...(await sha256(data))].map((b) => b.toString(16).padStart(2, '0')).join('');

export const sha256Base64Url = async (data: string): Promise<string> =>
    base64UrlEncode(await sha256(data));

/**
 * 比較兩個同 secret 有關嘅字串（例如 OAuth state），時間唔會跟「第幾個字開始唔同」而變。
 * 先各自 SHA-256：長度一定一樣（timingSafeEqual 長度唔同會 throw），亦唔會洩露原本長度
 */
export const constantTimeEqual = async (left: string, right: string): Promise<boolean> => {
    const [leftHash, rightHash] = await Promise.all([sha256(left), sha256(right)]);
    return crypto.subtle.timingSafeEqual(leftHash, rightHash);
};

const hmacKey = (secret: string): Promise<CryptoKey> =>
    crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify'],
    );

export const hmacSign = async (secret: string, payload: string): Promise<string> =>
    base64UrlEncode(
        new Uint8Array(
            await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(payload)),
        ),
    );

/** crypto.subtle.verify 係 constant-time，唔好自己比字串 */
export const hmacVerify = async (secret: string, payload: string, signature: string) => {
    try {
        const bytes = base64UrlDecode(signature);
        return await crypto.subtle.verify(
            'HMAC',
            await hmacKey(secret),
            bytes,
            encoder.encode(payload),
        );
    } catch {
        return false;
    }
};
