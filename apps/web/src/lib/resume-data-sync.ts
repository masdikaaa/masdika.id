import { prisma } from "@/lib/prisma";

let isSyncedInMemory = false;

/**
 * Ensures that existing Experience, Education, and Certification rows in PostgreSQL
 * have their real `type`, `description`, `tags`, `code`, and `domain` fields populated
 * in the database (both on local dev and production deployments after `prisma db push`).
 */
export async function ensureResumeDataSyncedToDb(): Promise<void> {
  if (isSyncedInMemory) return;

  try {
    // 1. Sync Education records if `type`, `description`, or `tags` are still null
    const educations = await prisma.education.findMany({ orderBy: { order: "asc" } });
    for (const edu of educations) {
      if (edu.type === null && edu.description === null && edu.tags === null) {
        const lower = `${edu.degree} ${edu.school}`.toLowerCase();
        const isUniversity = lower.includes("universitas") || lower.includes("university");

        await prisma.education.update({
          where: { id: edu.id },
          data: {
            type: "Academic",
            description: isUniversity
              ? "Focused on Information Systems, distributed cloud computing, network architecture, database management, and enterprise software engineering."
              : "Intensive vocational track in Computer & Network Engineering (TKJ), covering Linux server administration, MikroTik routing, and enterprise networking.",
            tags: isUniversity
              ? "Information Systems, Distributed Systems, Database Architecture"
              : "Computer & Network Eng., MikroTik & Cisco, Linux Server",
          },
        });
      }
    }

    // 2. Sync Experience records if `type`, `description`, or `tags` are still null
    const experiences = await prisma.experience.findMany({ orderBy: { order: "asc" } });
    for (const exp of experiences) {
      if (exp.type === null && exp.description === null && exp.tags === null) {
        const lower = `${exp.role} ${exp.company}`.toLowerCase();
        const isTech =
          lower.includes("tehnician") || lower.includes("technician") || lower.includes("smk");

        await prisma.experience.update({
          where: { id: exp.id },
          data: {
            type: isTech ? "Verified Role" : "Independent Practice",
            description: isTech
              ? "Managed campus laboratory servers, local area network (LAN/WLAN) infrastructure, hardware troubleshooting, and workstation deployment."
              : "Designing and operating production K3s/Kubernetes clusters, high-performance VPS nodes, carrier-grade BGP routing, and automated CI/CD pipelines for businesses.",
            tags: isTech
              ? "LAN/WLAN Routing, Server Maintenance, Hardware Diagnostics"
              : "Kubernetes & K3s, BGP & MikroTik, Cloud Architecture",
          },
        });
      }
    }

    // Seed the Cloud & DevOps Infrastructure Engineer experience once if not yet seeded
    const seedFlag = await prisma.setting.findUnique({
      where: { key: "resume_v2_real_data_seeded" },
    });
    if (!seedFlag) {
      const hasCloudRole = experiences.some(
        (e) =>
          e.role.toLowerCase().includes("cloud") ||
          e.company.toLowerCase().includes("masdika")
      );
      if (!hasCloudRole) {
        await prisma.experience.create({
          data: {
            year: "2022 - PRESENT",
            role: "CLOUD & DEVOPS INFRASTRUCTURE ENGINEER",
            company: "Masdika Cloud & Enterprise Clients",
            type: "Independent Practice",
            description:
              "Designing and operating production K3s/Kubernetes clusters, high-performance VPS nodes, carrier-grade BGP routing, and automated CI/CD pipelines for businesses.",
            tags: "Kubernetes & K3s, BGP & MikroTik, Cloud Architecture",
            order: experiences.length,
          },
        });
      }

      if (educations.length === 0) {
        await prisma.education.createMany({
          data: [
            {
              year: "2023 - PRESENT",
              degree: "UNIVERSITY",
              school: "UNIVERSITAS TERBUKA",
              type: "Academic",
              description:
                "Focused on Information Systems, distributed cloud computing, network architecture, database management, and enterprise software engineering.",
              tags: "Information Systems, Distributed Systems, Database Architecture",
              order: 0,
            },
            {
              year: "2019-2022",
              degree: "VOCATIONAL HIGH SCHOOL",
              school: "SMKN 1 GEDANGAN",
              type: "Academic",
              description:
                "Intensive vocational track in Computer & Network Engineering (TKJ), covering Linux server administration, MikroTik routing, and enterprise networking.",
              tags: "Computer & Network Eng., MikroTik & Cisco, Linux Server",
              order: 1,
            },
          ],
        });
      }

      await prisma.setting.upsert({
        where: { key: "resume_v2_real_data_seeded" },
        update: { value: "true" },
        create: { key: "resume_v2_real_data_seeded", value: "true" },
      });
    }

    // 3. Sync Certification records if `code`, `domain`, or `description` are still null
    const certs = await prisma.certification.findMany({ orderBy: { order: "asc" } });
    for (const cert of certs) {
      if (cert.code === null && cert.domain === null && cert.description === null) {
        const text = `${cert.title} ${cert.org}`.toLowerCase();
        let code = "VERIFIED";
        let domain = "Accreditation";
        let description =
          "Industry-recognized technical certification validating hands-on cloud and infrastructure engineering proficiency.";

        if (text.includes("aws") || text.includes("amazon")) {
          code = "AWS-SAA";
          domain = "Cloud Architecture";
          description =
            "Designing distributed, fault-tolerant, and cost-optimized multi-AZ production architectures on AWS.";
        } else if (text.includes("kubernetes") || text.includes("cncf") || text.includes("cka")) {
          code = "CNCF-CKA";
          domain = "Container Orchestration";
          description =
            "Production cluster lifecycle management, CNI networking, RBAC hardening, and workload troubleshooting.";
        } else if (text.includes("google") || text.includes("gcp")) {
          code = "GCP-PCA";
          domain = "Enterprise Cloud";
          description =
            "Architecting scalable Google Cloud infrastructure, hybrid VPC interconnects, and GKE workloads.";
        } else if (text.includes("terraform") || text.includes("hashicorp")) {
          code = "HCTA-003";
          domain = "Infrastructure as Code";
          description =
            "Modular Infrastructure as Code workflows, remote state locking, and automated multi-cloud provisioning.";
        }

        await prisma.certification.update({
          where: { id: cert.id },
          data: { code, domain, description },
        });
      }
    }

    isSyncedInMemory = true;
  } catch (err) {
    console.warn("[Resume Data Sync] Note:", err);
  }
}

