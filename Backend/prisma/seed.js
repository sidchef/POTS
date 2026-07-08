import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log(" Seeding database...\n");

  // 1. Create Roles
  const roles = [
    { name: "BUSINESS_TEAM", description: "Business team member" },
    { name: "PRODUCT_LEAD", description: "Product Lead" },
    { name: "HEAD_FUNCTIONAL", description: "Head of Functional Team" },
    { name: "HEAD_TECHNOLOGY", description: "Head of Technology Team" },
    { name: "TEAM_MEMBER", description: "Internal Project Team Member" },
    { name: "TSP_TEAM_LEAD", description: "TSP Team Lead" },
    { name: "TSP_TEAM_MEMBER", description: "TSP Team Member" },
    { name: "TSP_QA", description: "TSP Quality Assurance" },
    { name: "TSP_SECURITY", description: "TSP Security Lead" },
    { name: "SUPER_ADMIN", description: "Super Admin" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log("✅ Roles seeded:", roles.length);

  // 2. Create Permissions
  const permissions = [
    { name: "CREATE_BRM", description: "Create BRM" },
    { name: "CREATE_USERS", description: "Create Users" },
    { name: "BRM_DASHBOARD", description: "Access to BRM Dashboard" },
    { name: "BRM_DETAILS", description: "View BRM Details" },
    { name: "COMMITTEE_REVIEW", description: "The approval page for voting" },
    { name: "TASK_BOARD", description: "View Different tasks" },
    { name: "CREATE_TASK", description: "Create Task" },
    { name: "ASSIGN_TASK", description: "Assign Task" },
    { name: "MANAGE_USERS", description: "Manage Users" },
    { name: "VIEW_METRICS", description: "View Metrics Dashboard" },
    { name: "SUBMIT_ARCHITECTURE", description: "Submit Architecture" },
    { name: "CREATE_USER_STORY", description: "Create User Stories" },
    { name: "MANAGE_MILESTONES", description: "Create and manage milestones" },
    { name: "UPLOAD_EVIDENCE", description: "Upload QA Evidence" },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log("✅ Permissions seeded:", permissions.length);

  // 3. Assign Permissions to Roles
  const rolePermissionMap = {
    PRODUCT_LEAD: ["CREATE_BRM", "BRM_DASHBOARD", "BRM_DETAILS","VIEW_METRICS", "TASK_BOARD"],
    BUSINESS_TEAM: ["BRM_DASHBOARD", "BRM_DETAILS"],
    HEAD_FUNCTIONAL: ["COMMITTEE_REVIEW", "BRM_DASHBOARD", "BRM_DETAILS", "VIEW_METRICS"],
    HEAD_TECHNOLOGY: ["COMMITTEE_REVIEW", "BRM_DASHBOARD", "BRM_DETAILS", "VIEW_METRICS"],
    TEAM_MEMBER: ["BRM_DASHBOARD","BRM_DETAILS", "CREATE_USER_STORY", "TASK_BOARD"],
    TSP_TEAM_LEAD: ["SUBMIT_ARCHITECTURE", "CREATE_TASK", "ASSIGN_TASK", "TASK_BOARD","BRM_DASHBOARD", "BRM_DETAILS", "VIEW_METRICS"],
    TSP_TEAM_MEMBER: ["TASK_BOARD", "MANAGE_MILESTONES", "BRM_DETAILS"],
    TSP_QA: [ "UPLOAD_EVIDENCE", "TASK_BOARD"],
    TSP_SECURITY_LEAD: ["TASK_BOARD", "VIEW_METRICS"],
    SUPER_ADMIN: ["MANAGE_USERS","CREATE_USERS"]
  };

  for (const [roleName, permNames] of Object.entries(rolePermissionMap)) {
    const role = await prisma.role.findUnique({ where: { name: roleName } });
    for (const permName of permNames) {
      const permission = await prisma.permission.findUnique({ where: { name: permName } });
      if (role && permission) {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
    }
  }
  console.log("✅ Role-Permission mappings seeded");

  // 4. Create a default Super Admin user for testing
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@pots.com" },
    update: {},
    create: {
      employeeId: "EMP-0001",
      firstName: "Super",
      lastName: "Admin",
      email: "admin@pots.com",
      passwordHash: hashedPassword,
    },
  });

  const superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
      update: {},
      create: { userId: adminUser.id, roleId: superAdminRole.id },
    });
  }
  console.log("✅ Super Admin user created (admin@pots.com / admin123)");

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
