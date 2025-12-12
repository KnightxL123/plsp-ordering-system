const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function seedAdminUser() {
  const email = "admin@plsp.edu";

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: "Admin User",
      role: "ADMIN",
    },
  });
}

async function seedStudentUser() {
  const email = "student1@plsp.edu";

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        fullName: "Student One",
        role: "STUDENT",
        studentId: "S0000001",
        gradeLevel: "1st Year",
        section: "A",
      },
    });
    return;
  }

  const passwordHash = await bcrypt.hash("student123", 10);

  await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: "Student One",
      role: "STUDENT",
      studentId: "S0000001",
      gradeLevel: "1st Year",
      section: "A",
    },
  });
}

async function seedCategories() {
  const categoryNames = [
    "School Uniform",
    "PE Uniform",
    "Books",
    "Merch",
    "Lace",
    "School Supplies",
  ];

  const result = {};

  for (const name of categoryNames) {
    let category = await prisma.productCategory.findFirst({
      where: { name },
    });

    if (!category) {
      category = await prisma.productCategory.create({
        data: { name },
      });
    }

    result[name] = category;
  }

  return result;
}

async function seedProducts(categories) {
  const productsCount = await prisma.product.count();

  if (productsCount > 0) {
    return;
  }

  await prisma.product.createMany({
    data: [
      {
        name: "PLSP School Uniform (Male)",
        description: "Standard male school uniform",
        basePrice: 800.0,
        categoryId: categories["School Uniform"].id,
        isActive: true,
      },
      {
        name: "PLSP School Uniform (Female)",
        description: "Standard female school uniform",
        basePrice: 800.0,
        categoryId: categories["School Uniform"].id,
        isActive: true,
      },
      {
        name: "PLSP PE Shirt",
        description: "Official PE shirt",
        basePrice: 400.0,
        categoryId: categories["PE Uniform"].id,
        isActive: true,
      },
      {
        name: "PLSP PE Pants",
        description: "Official PE pants",
        basePrice: 450.0,
        categoryId: categories["PE Uniform"].id,
        isActive: true,
      },
      {
        name: "PLSP School Lace",
        description: "School ID lace",
        basePrice: 100.0,
        categoryId: categories["Lace"].id,
        isActive: true,
      },
      {
        name: "PLSP Hoodie",
        description: "Official school hoodie",
        basePrice: 1200.0,
        categoryId: categories["Merch"].id,
        isActive: true,
      },
      {
        name: "Notebook",
        description: "PLSP branded notebook",
        basePrice: 60.0,
        categoryId: categories["School Supplies"].id,
        isActive: true,
      },
      {
        name: "Ballpen",
        description: "PLSP branded ballpen",
        basePrice: 20.0,
        categoryId: categories["School Supplies"].id,
        isActive: true,
      },
      {
        name: "Handbook",
        description: "Student handbook / book",
        basePrice: 150.0,
        categoryId: categories["Books"].id,
        isActive: true,
      },
    ],
  });
}

async function main() {
  console.log("Seeding database with default admin user, categories and products...");

  await seedAdminUser();
  await seedStudentUser();
  const categories = await seedCategories();
  await seedProducts(categories);

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
