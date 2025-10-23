// TOTP (Time-based One-Time Password) implementation
const TOTP = {
  // Base32 decode
  base32Decode(base32) {
    const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    base32 = base32.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
    
    let bits = '';
    for (let i = 0; i < base32.length; i++) {
      const val = base32Chars.indexOf(base32[i]);
      if (val === -1) throw new Error('Invalid base32 character');
      bits += val.toString(2).padStart(5, '0');
    }
    
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
      bytes.push(parseInt(bits.substr(i, 8), 2));
    }
    
    return new Uint8Array(bytes);
  },

  // HMAC-SHA1 implementation
  async hmacSHA1(key, message) {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
    return new Uint8Array(signature);
  },

  // Generate TOTP code
  async generate(secret, timeStep = 30, digits = 6) {
    try {
      // Decode secret
      const key = this.base32Decode(secret);
      
      // Get time counter
      const now = Math.floor(Date.now() / 1000);
      const counter = Math.floor(now / timeStep);
      
      // Convert counter to 8-byte array
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setBigUint64(0, BigInt(counter), false);
      const timeBytes = new Uint8Array(buffer);
      
      // Generate HMAC
      const hmac = await this.hmacSHA1(key, timeBytes);
      
      // Dynamic truncation
      const offset = hmac[hmac.length - 1] & 0x0f;
      const code = (
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff)
      );
      
      // Generate OTP
      const otp = (code % Math.pow(10, digits)).toString().padStart(digits, '0');
      return otp;
    } catch (error) {
      console.error('Error generating TOTP:', error);
      return null;
    }
  },

  // Get remaining seconds until next code
  getRemainingSeconds(timeStep = 30) {
    const now = Math.floor(Date.now() / 1000);
    return timeStep - (now % timeStep);
  }
};
