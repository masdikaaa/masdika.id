import { NextResponse, NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import sshpk from "sshpk";
import crypto from "crypto";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";

export async function POST(req: NextRequest) {
  try {
    // Only allow logged in users to generate keys to prevent abuse
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Rate limit: Max 5 keys per day per IP
    const ip = getClientIp(req);
    const allowed = await checkRateLimit("SSH_KEY_GEN", ip, 5, 86400);
    if (!allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again tomorrow." }, { status: 429 });
    }
    
    // Parse optional hostname and username from request body
    let hostname = "vps";
    let username = "root";
    try {
      const body = await req.json();
      if (body.hostname) {
        // Security: Sanitize hostname to prevent malicious payloads in the SSH key comment
        hostname = body.hostname.trim().replace(/[^a-zA-Z0-9-.]/g, '').slice(0, 63);
        if (!hostname) hostname = "vps"; // Fallback if it becomes empty
      }
      if (body.username) {
        username = body.username.trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
        if (!username) username = "root";
      }
    } catch (e) {
      // Body might be empty or invalid JSON, ignore
    }

    // Generate RSA key pair using native crypto module (much faster than pure JS in sshpk)
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: "pkcs1",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs1",
        format: "pem",
      },
    });

    // Parse the generated PEM keys with sshpk
    const privateKeyObj = sshpk.parsePrivateKey(privateKey, 'pem');
    const publicKeyObj = sshpk.parseKey(publicKey, 'pem');

    // Convert public key to ssh-rsa format for cloud-init
    // The second argument adds a comment to the key
    const sshPublicKey = publicKeyObj.toString('ssh') + ` ${username}@${hostname}`;
    
    // The private key is returned in PEM format for the user to download (.pem)
    // We don't store the private key anywhere on the server!
    const sshPrivateKey = privateKeyObj.toString('pem');

    return NextResponse.json({ 
      publicKey: sshPublicKey, 
      privateKey: sshPrivateKey 
    });
  } catch (error) {
    console.error("SSH Key Gen Error:", error);
    return NextResponse.json({ error: "Failed to generate key pair" }, { status: 500 });
  }
}
