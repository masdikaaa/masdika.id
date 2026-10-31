import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";
import { deleteFromRustFS } from "@/lib/rustfs";

export async function GET(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const typeFilter = searchParams.get("type"); // image, video, audio, document, archive, other
    const visibilityFilter = searchParams.get("visibility"); // public, private

    // Base query: All files uploaded by customers (userId not null and not admin)
    const customerFiles = await prisma.secureMedia.findMany({
      where: {
        userId: { not: null },
        user: {
          role: { not: "ADMIN" },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Compute distinct customers list and summary metrics
    const customerMap = new Map<number, { id: number; name: string; email: string; avatar?: string | null; fileCount: number; totalBytes: number }>();
    let totalStorageBytes = 0;
    let publicCount = 0;
    let privateCount = 0;

    const mappedFiles = customerFiles.map((file) => {
      const fileSize = Number(file.size);
      totalStorageBytes += fileSize;
      if (file.isPublic) publicCount++;
      else privateCount++;

      let resolvedCustomerName = "Customer";
      let resolvedCustomerEmail = "customer@domain.com";

      if (file.user) {
        if (file.user.name) {
          try {
            resolvedCustomerName = decryptDeterministic(file.user.name) || file.user.name;
          } catch {
            resolvedCustomerName = file.user.name;
          }
        }
        if (file.user.email) {
          try {
            resolvedCustomerEmail = decryptDeterministic(file.user.email) || file.user.email;
          } catch {
            resolvedCustomerEmail = file.user.email;
          }
        }

        const cid = file.user.id;
        if (!customerMap.has(cid)) {
          customerMap.set(cid, {
            id: cid,
            name: resolvedCustomerName,
            email: resolvedCustomerEmail,
            avatar: file.user.image,
            fileCount: 0,
            totalBytes: 0,
          });
        }
        const custEntry = customerMap.get(cid)!;
        custEntry.fileCount++;
        custEntry.totalBytes += fileSize;
      }

      return {
        ...file,
        size: fileSize,
        customerName: resolvedCustomerName,
        customerEmail: resolvedCustomerEmail,
        customerAvatar: file.user?.image || null,
      };
    });

    // Apply filters in memory
    let filtered = mappedFiles;

    if (customerId && customerId !== "all") {
      const cidNum = parseInt(customerId, 10);
      filtered = filtered.filter((f) => f.userId === cidNum);
    }

    if (visibilityFilter === "public") {
      filtered = filtered.filter((f) => f.isPublic);
    } else if (visibilityFilter === "private") {
      filtered = filtered.filter((f) => !f.isPublic);
    }

    if (typeFilter && typeFilter !== "all") {
      filtered = filtered.filter((f) => {
        const mime = (f.mimeType || "").toLowerCase();
        if (typeFilter === "image") return mime.startsWith("image/");
        if (typeFilter === "video") return mime.startsWith("video/");
        if (typeFilter === "audio") return mime.startsWith("audio/");
        if (typeFilter === "document") {
          return (
            mime === "application/pdf" ||
            mime.includes("word") ||
            mime.includes("sheet") ||
            mime.includes("presentation") ||
            mime.startsWith("text/")
          );
        }
        if (typeFilter === "archive") {
          return (
            mime.includes("zip") ||
            mime.includes("tar") ||
            mime.includes("gzip") ||
            mime.includes("rar") ||
            mime.includes("7z")
          );
        }
        return true;
      });
    }

    const customersList = Array.from(customerMap.values()).sort((a, b) => b.fileCount - a.fileCount);

    return NextResponse.json({
      files: filtered,
      stats: {
        totalFiles: customerFiles.length,
        totalStorageBytes,
        totalCustomers: customerMap.size,
        publicFiles: publicCount,
        privateFiles: privateCount,
      },
      customersList,
    });
  } catch (error) {
    console.error("Admin customer CDN list error:", error);
    return NextResponse.json({ error: "Failed to list customer CDN files" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const mediaId = parseInt(id, 10);
    const media = await prisma.secureMedia.findUnique({
      where: { id: mediaId },
      include: { user: true },
    });

    if (!media) return NextResponse.json({ error: "Media not found" }, { status: 404 });

    // Ensure it is a customer file
    if (media.userId === null || media.user?.role === "ADMIN") {
      return NextResponse.json({ error: "Cannot delete admin files from customer monitoring" }, { status: 400 });
    }

    // Delete related ratings & comments first
    await prisma.mediaRating.deleteMany({ where: { mediaId } });
    await prisma.mediaComment.deleteMany({ where: { mediaId } });

    // Delete from RustFS & filesystem if not a directory
    if (!media.isFolder) {
      deleteFromRustFS(media.filename).catch(() => {});
      const candidateDirs = [
        path.join(process.cwd(), "storage", "secure-media"),
        path.join(process.cwd(), "apps", "web", "storage", "secure-media")
      ];
      for (const dir of candidateDirs) {
        const filePath = path.join(dir, media.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (err) {
            console.warn("Could not delete file from disk:", err);
          }
        }
      }
    }

    // Delete record from DB
    await prisma.secureMedia.delete({ where: { id: mediaId } });

    return NextResponse.json({ success: true, message: "Customer media deleted successfully" });
  } catch (error) {
    console.error("Admin delete customer media error:", error);
    return NextResponse.json({ error: "Failed to delete media" }, { status: 500 });
  }
}
