const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  try {
    console.log('seeding started!')
    await db.category.createMany({
      data: [
        {
          name: "Famouse People",
        },
        {
          name: "Movies & TV",
        },
        {
          name: "Musicians",
        },
        {
          name: "Games",
        },
        {
          name: "Animals",
        },
        {
          name: "Philosophy",
        },
        {
          name: "Anime",
        },
      ],
    });
  } catch (error) {
    console.log("Error seeding default categories", error);
  } finally {
    await db.$disconnect();
    console.log('seeding completed!')
  }
}

main();
