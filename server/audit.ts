import "server-only";
import { prisma } from "@/lib/prisma";

export async function logAdminAction(params: {
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      adminId: params.adminId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details,
    },
  });
}
