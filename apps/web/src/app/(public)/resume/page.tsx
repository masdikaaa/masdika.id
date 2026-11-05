import { prisma } from "@/lib/prisma";
import { ResumeContent } from "./ResumeContent";
import { ensureResumeDataSyncedToDb } from "@/lib/resume-data-sync";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  await ensureResumeDataSyncedToDb();

  const [experiences, educations, cvSetting] = await Promise.all([
    prisma.experience.findMany({ orderBy: { order: "asc" } }),
    prisma.education.findMany({ orderBy: { order: "asc" } }),
    prisma.setting.findUnique({ where: { key: "cv_url" } })
  ]);

  const cvUrl = cvSetting?.value || null;

  return (
    <ResumeContent
      experiences={experiences}
      educations={educations}
      cvUrl={cvUrl}
    />
  );
}
