import { loadEnvConfig } from "@next/env";
import path from "path";
import http from "http";
// .env lives at the monorepo root (two levels up from apps/web)
const projectRoot = path.resolve(process.cwd(), "../../");
loadEnvConfig(projectRoot);

async function start() {
  const { JobQueueService } = await import("@/lib/job-queue");
  const { VpsProvisioningService } = await import("@/lib/vps-provisioning");
  const { reinstallK3sCluster } = await import("@/lib/k3s-reinstall");
  const { prisma } = await import("@/lib/prisma");

  // --- Health Check Server ---
  const port = process.env.WORKER_PORT || 8080;
  http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'masdika-worker' }));
    } else {
      res.writeHead(404);
      res.end();
    }
  }).listen(port, () => {
    console.log(`Worker health check listening on port ${port}`);
  });
  // ---------------------------

  // 🛡️ Graceful Shutdown handling for zero-disruption CI/CD deployments
  let isShuttingDown = false;
  let isCurrentlyProcessing = false;

  const handleShutdown = (signal: string) => {
    console.log(`[Worker] Received ${signal}. Preparing graceful shutdown...`);
    isShuttingDown = true;
    if (!isCurrentlyProcessing) {
      console.log(`[Worker] Idle. Exiting immediately on ${signal}.`);
      process.exit(0);
    } else {
      console.log(`[Worker] Waiting for in-flight job to finish before exiting...`);
    }
  };

  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  process.on("SIGINT", () => handleShutdown("SIGINT"));

  // Auto-recover any jobs left in PROCESSING by previous container crash / restart
  await JobQueueService.recoverStaleJobs(5).then(count => {
    if (count > 0) {
      console.log(`> [Worker] Auto-recovered ${count} stuck background job(s) after restart`);
    }
  }).catch(err => {
    console.warn("> [Worker] Stale job recovery check note:", err?.message || err);
  });

  console.log("Worker started. Waiting for jobs...");

  while (true) {
    if (isShuttingDown) {
      console.log("[Worker] Shutdown signaled. Exiting job loop cleanly.");
      break;
    }

    try {
      const job = await JobQueueService.processNextJob();

      if (!job) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      isCurrentlyProcessing = true;
      console.log(`Processing job ${job.id} of type ${job.type}`);
      const payload = JSON.parse(job.payload);

      try {
        if (job.type === 'PROVISION_VPS') {
          const { vpsId, options, userId, hourlyRate, k3sClusterId, action } = payload;

          try {
            await VpsProvisioningService.provisionVps(vpsId, options);
           
          } catch (err: any) {
            console.error(`VPS Provisioning failed for VPS ID ${vpsId}:`, err);
            try {
              await prisma.vpsService.update({ where: { id: vpsId }, data: { status: "FAILED" } });
              await prisma.user.update({ where: { id: userId }, data: { balance: { increment: hourlyRate } } });
              await prisma.invoice.updateMany({ where: { vpsServiceId: vpsId, status: "PAID" }, data: { status: "CANCELLED" } });
              if (k3sClusterId && action !== "add_node") {
                await prisma.kubernetesCluster.update({ where: { id: k3sClusterId }, data: { status: "FAILED" } });
              }
              console.log(`Rolled back PAYG billing for failed VPS ID ${vpsId}. Refunded ${hourlyRate}.`);
            } catch (rollbackErr) {
              console.error(`Critical: Failed to rollback PAYG billing for VPS ID ${vpsId}:`, rollbackErr);
            }
            throw err;
          }
        } else if (job.type === 'REINSTALL_K3S') {
          await reinstallK3sCluster(payload);
        } else {
          throw new Error(`Unknown job type: ${job.type}`);
        }

        await JobQueueService.completeJob(job.id);
        console.log(`Job ${job.id} completed successfully`);

       
      } catch (error: any) {
        console.error(`Job ${job.id} failed:`, error);
        await JobQueueService.failJob(job.id, error.message || "Unknown error");
      } finally {
        isCurrentlyProcessing = false;
        if (isShuttingDown) {
          console.log(`[Worker] Finished in-flight job #${job.id}. Exiting process cleanly.`);
          process.exit(0);
        }
      }

    } catch (err) {
      isCurrentlyProcessing = false;
      console.error("Worker error:", err);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

start();
