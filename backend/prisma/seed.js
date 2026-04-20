const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create hospital
  const hospital = await prisma.hospital.create({
    data: {
      name: 'City General Hospital',
      address: 'Delhi',
    },
  });
  console.log('Created hospital:', hospital.name);

  // Create doctors
  const doctor1 = await prisma.doctor.create({
    data: {
      name: 'Dr. Rajesh Kumar',
      specialization: 'General Medicine',
      hospitalId: hospital.id,
      avgConsultMin: 5,
      available: true,
    },
  });
  console.log('Created doctor:', doctor1.name);

  const doctor2 = await prisma.doctor.create({
    data: {
      name: 'Dr. Priya Sharma',
      specialization: 'Pediatrics',
      hospitalId: hospital.id,
      avgConsultMin: 7,
      available: true,
    },
  });
  console.log('Created doctor:', doctor2.name);

  // Hash passwords
  const adminPassword = await bcrypt.hash('admin123', 10);
  const doctorPassword = await bcrypt.hash('doctor123', 10);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      phone: '9999999999',
      name: 'Admin',
      password: adminPassword,
      role: 'admin',
    },
  });
  console.log('Created admin user:', adminUser.name);

  // Create doctor user
  const doctorUser = await prisma.user.create({
    data: {
      phone: '8888888888',
      name: 'Dr. Rajesh',
      password: doctorPassword,
      role: 'doctor',
    },
  });
  console.log('Created doctor user:', doctorUser.name);

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
