import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";

export interface AdminUserView {
  id: string;
  username: string | null;
  email: string | null;
  fullName: string;
  roles: string[];
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminUserPage {
  items: AdminUserView[];
  total: number;
}

/**
 * UsersAdminService — daftar user untuk Admin Sistem (R-38).
 * GET /admin/users: user + role aktif, tanpa PII sensitif (password_hash
 * TIDAK pernah disertakan). Scope: user:read:school (SUPERADMIN/OPERATOR).
 */
@Injectable()
export class UsersAdminService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(search?: string, pageSize = 100): Promise<AdminUserPage> {
    const where = {
      ...(search && search.trim().length > 0
        ? {
            OR: [
              { full_name: { contains: search.trim(), mode: "insensitive" as const } },
              { username: { contains: search.trim(), mode: "insensitive" as const } },
              { email: { contains: search.trim(), mode: "insensitive" as const } }
            ]
          }
        : {})
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { roles: { where: { status: "ACTIVE" }, select: { role: true } } },
        orderBy: [{ created_at: "desc" }],
        take: Math.min(Math.max(pageSize, 1), 500)
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      items: rows.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        fullName: u.full_name,
        roles: u.roles.map((r) => r.role),
        isActive: u.is_active,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at
      })),
      total
    };
  }
}
