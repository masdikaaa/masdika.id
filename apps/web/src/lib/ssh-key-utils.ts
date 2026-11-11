import crypto from "crypto";

export interface ParsedSshKey {
  isValid: boolean;
  keyType?: string;
  fingerprint?: string;
  error?: string;
}

export function parseAndValidateSshKey(rawKey: string): ParsedSshKey {
  if (!rawKey || typeof rawKey !== "string") {
    return { isValid: false, error: "SSH Key cannot be empty" };
  }

  const trimmed = rawKey.trim();
  if (trimmed.length > 4096) {
    return { isValid: false, error: "SSH Key is too long (max 4096 characters)" };
  }

  // Remove all newlines or carriage returns
  if (/[\r\n]/.test(trimmed)) {
    return { isValid: false, error: "SSH Public Key must be a single line" };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length < 2) {
    return { isValid: false, error: "Invalid SSH public key format (expected: <type> <base64-key> [comment])" };
  }

  const [type, b64] = parts;
  const validTypes = [
    "ssh-rsa",
    "ssh-ed25519",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521",
    "ssh-dss",
    "sk-ssh-ed25519@openssh.com",
    "sk-ecdsa-sha2-nistp256@openssh.com"
  ];

  if (!validTypes.includes(type)) {
    return { isValid: false, error: `Unsupported key type '${type}'. Supported types: ssh-ed25519, ssh-rsa, ecdsa` };
  }

  try {
    const buf = Buffer.from(b64, "base64");
    if (buf.length < 16) {
      return { isValid: false, error: "Invalid base64 payload in SSH key" };
    }
    // Generate SHA256 fingerprint (OpenSSH standard: SHA256:base64)
    const hash = crypto.createHash("sha256").update(buf).digest("base64").replace(/=+$/, "");
    const fingerprint = `SHA256:${hash}`;

    return {
      isValid: true,
      keyType: type,
      fingerprint
    };
  } catch {
    return { isValid: false, error: "Failed to parse public key bytes" };
  }
}

