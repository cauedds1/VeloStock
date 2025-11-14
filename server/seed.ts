import { db } from "./db";
import { users, vehicles, vehicleImages, vehicleHistory, vehicleCosts } from "@shared/schema";
import { readFileSync } from "fs";
import { resolve } from "path";

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  const userResult = await db.insert(users).values({
    username: "admin",
    password: "admin123",
    role: "DONO",
  }).returning();
  
  const systemUser = userResult[0];
  console.log("✅ Usuário criado:", systemUser.username);

  const vehicleData = [
    {
      brand: "BMW",
      model: "320i",
      year: 2020,
      color: "Preto",
      plate: "ABC1234",
      location: "Pronto para Venda" as const,
      kmOdometer: 35000,
      fuelType: "Gasolina",
      features: ["Couro", "Teto Solar", "Câmera de Ré", "Sensores"],
      notes: "Veículo em excelente estado",
    },
    {
      brand: "Volkswagen",
      model: "Gol",
      year: 2019,
      color: "Branco",
      plate: "DEF5678",
      location: "Mecânica" as const,
      kmOdometer: 52000,
      fuelType: "Flex",
      features: ["Ar Condicionado", "Direção Hidráulica"],
      notes: "Aguardando troca de óleo",
    },
    {
      brand: "Toyota",
      model: "Corolla",
      year: 2021,
      color: "Prata",
      plate: "GHI9012",
      location: "Lavagem" as const,
      kmOdometer: 28000,
      fuelType: "Híbrido",
      features: ["Automático", "Multimídia", "Bancos de Couro", "Câmera 360"],
      notes: null,
    },
    {
      brand: "Chevrolet",
      model: "Onix",
      year: 2022,
      color: "Vermelho",
      plate: "JKL3456",
      location: "Entrada" as const,
      kmOdometer: 15000,
      fuelType: "Flex",
      features: ["Central Multimídia", "Ar Digital"],
      notes: "Recém chegado",
    },
  ];

  const imageUrls = [
    "/attached_assets/generated_images/Black_luxury_sedan_photo_2909825e.png",
    "/attached_assets/generated_images/White_hatchback_car_photo_caae9092.png",
    "/attached_assets/generated_images/Silver_sedan_car_photo_91f8b333.png",
    "/attached_assets/generated_images/Red_SUV_car_photo_8306af39.png",
  ];

  for (let i = 0; i < vehicleData.length; i++) {
    const vehicleResult = await db.insert(vehicles).values(vehicleData[i]).returning();
    const vehicle = vehicleResult[0];
    console.log(`✅ Veículo criado: ${vehicle.brand} ${vehicle.model}`);

    await db.insert(vehicleImages).values({
      vehicleId: vehicle.id,
      imageUrl: imageUrls[i],
      order: 0,
    });

    await db.insert(vehicleHistory).values({
      vehicleId: vehicle.id,
      fromStatus: null,
      toStatus: vehicle.location as any,
      fromPhysicalLocation: null,
      toPhysicalLocation: null,
      userId: systemUser.id,
      notes: "Veículo cadastrado no sistema",
    });

    if (i === 0) {
      await db.insert(vehicleCosts).values([
        {
          vehicleId: vehicle.id,
          category: "Mecânica",
          description: "Revisão completa",
          value: 150000,
          date: new Date("2024-11-01"),
        },
        {
          vehicleId: vehicle.id,
          category: "Estética",
          description: "Polimento e cristalização",
          value: 80000,
          date: new Date("2024-11-05"),
        },
      ]);
    } else if (i === 1) {
      await db.insert(vehicleCosts).values({
        vehicleId: vehicle.id,
        category: "Mecânica",
        description: "Troca de óleo e filtros",
        value: 45000,
        date: new Date("2024-11-08"),
      });
    }
  }

  console.log("🎉 Seed concluído com sucesso!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("❌ Erro ao executar seed:", error);
  process.exit(1);
});
