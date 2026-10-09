import { NextRequest } from "next/server";
import { prisma } from "./prisma";

export async function validateApiKey(req: NextRequest, requiredProjectSlug?: string) {
  try {
    // 1. Extract API Key from headers or search params
    let apiKey = req.headers.get("authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      const { searchParams } = new URL(req.url);
      apiKey = searchParams.get("apikey") || undefined;
    }

    if (!apiKey) {
      return { error: "API Key is required", status: 401 };
    }

    // 2. Fetch API Key and related project
    const keyData = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { project: true }
    });

    if (!keyData) {
      return { error: "Invalid API Key", status: 401 };
    }

    if (keyData.status !== 'ACTIVE') {
      return { error: "This API Key has been suspended", status: 403 };
    }

    // 3. Validate Service/Project isolation constraints
    if (requiredProjectSlug) {
      // If the key is bound to a project, it MUST match the required project
      if (keyData.projectId !== null && keyData.project?.slug !== requiredProjectSlug) {
        return {
          error: {
            message: `This API Key is not authorized for the '${requiredProjectSlug}' service.`,
            action: `It is bound to '${keyData.project?.name || 'another service'}'.`
          } as any,
          status: 403
        };
      }

      // Check service binding if project is not used
      const expectedService = requiredProjectSlug.toUpperCase().replace('-', '_');
      if (keyData.projectId === null && keyData.service && keyData.service !== expectedService) {
        return {
          error: {
            message: `This API Key is not authorized for the '${requiredProjectSlug}' service.`,
            action: `It is bound to '${keyData.service}'.`
          } as any,
          status: 403
        };
      }
    }

    // 4. Validate Subscription Quota and update usage
    const targetService = (requiredProjectSlug ? requiredProjectSlug.toUpperCase().replace('-', '_') : keyData.service) || (keyData.project?.slug.toUpperCase().replace('-', '_'));

    if (targetService) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: keyData.userId,
          status: 'ACTIVE',
          plan: { service: targetService },
          expiresAt: { gt: new Date() }
        },
        include: { plan: true },
        orderBy: { expiresAt: 'desc' }
      });

      if (!subscription) {
        return { 
          error: {
            message: `No active subscription found for service ${targetService}.`,
            action: "Please subscribe to a plan to use this API."
          } as any, 
          status: 403 
        };
      }

      // Check quota limits
      try {
        const limits = JSON.parse(subscription.plan.limits);
        const limitRequests = Number(limits.requests);
        if (!isNaN(limitRequests) && limitRequests !== -1 && subscription.usageCount >= limitRequests) {
          return { 
            error: {
              message: `API quota exceeded for service ${targetService}.`,
              action: `Limit: ${limitRequests} requests.`
            } as any, 
            status: 429 
          };
        }
      } catch (e) {
        // Ignore JSON parse errors
      }

      // Update both API Key and Subscription usage in a transaction
      await prisma.$transaction([
        prisma.apiKey.update({
          where: { id: keyData.id },
          data: {
            usageCount: { increment: 1 },
            lastUsed: new Date()
          }
        }),
        prisma.subscription.update({
          where: { id: subscription.id },
          data: { usageCount: { increment: 1 } }
        })
      ]);
    } else {
      // Just update API Key if targetService cannot be determined
      await prisma.apiKey.update({
        where: { id: keyData.id },
        data: {
          usageCount: { increment: 1 },
          lastUsed: new Date()
        }
      });
    }

    return { keyData, status: 200 };

  } catch (error) {
    console.error("API Key Validation Error:", error);
    return { error: "Internal Server Error during API Key validation", status: 500 };
  }
}
