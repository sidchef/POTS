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

main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
    })
    .finally(async () => {
    await prisma.$disconnect();
    });


