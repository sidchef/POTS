require('dotenv').config();

console.log('DATABASE_URL:', process.env.DATABASE_URL);



const { PrismaClient } = require('@prisma/client');


const prisma = new PrismaClient();

async function main(){
    const roles = [
        {
            name: 'BUISNESS_TEAM',
            description: 'Buisness team member'
        },
        {
            name: 'PRODUCT_LEAD',
            description: 'Product Lead'
        },
        {
            name: 'HEAD_FUNCTIONAL',
            description: 'Head of Functional Team'
        },
        {
            name: 'HEAD_TECHNOLOGY',
            description: 'Head of Technology Team'
        },
        {
            name: 'TEAM_MEMBER',
            description: 'Internal Project Team Member'
        },
        {
            name: 'TSP_TEAM_LEAD',
            description: 'TSP Team Lead'
        },
        {
            name: 'TSP_TEAM_MEMBER',
            description: 'TSP Team Member'
        },
        {
            name: 'TSP_QA',
            description: 'TSP Quality Assurance'
        },
        {
            name: 'TSP_SECURITY_LEAD',
            description: 'TSP Security Lead'
        },
        {
            name: 'SUPER_ADMIN',
            description: 'Super Admin'
        },    
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: {name: role.name},
            update: {},
            create: role,
        })
    }

    console.log("Roles seeded successfully.");

}


  // 2. Create Permissions
  const permissions = await Promise.all([
    prisma.permission.create({
      data: { name: 'CREATE_BRM', description: 'Create BRM' },
    }),
    prisma.permission.create({
      data: { name: 'BRM_DASHBOARD', description: 'Access to BRM Dashboard' },
    }),
    prisma.permission.create({
      data: { name: 'BRM_DETAILS', description: 'View BRM Details' },
    }),
    prisma.permission.create({
      data: { name: 'COMMITTEE_REVIEW', description: 'The approval page for voting' },
    }),
    prisma.permission.create({
      data: { name: 'TASK_BOARD', description: 'View Different tasks' },
    }),
    prisma.permission.create({
      data: { name: 'CREATE_TASK', description: 'Create Task' },
    }),
    prisma.permission.create({
      data: { name: 'ASSIGN_TASK', description: 'Assign Task' },
    }),
    prisma.permission.create({
      data: { name: 'RUN_QA', description: 'Run QA Tests' },
    }),
    prisma.permission.create({
      data: { name: 'RUN_SECURITY_SCAN', description: 'Run Security Scan' },
    }),
  ]);

  console.log('✓ Permissions created:', permissions.length);

main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
    })
    .finally(async () => {
    await prisma.$disconnect();
    });


