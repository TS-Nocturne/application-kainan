import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // `prisma generate` ไม่เชื่อมฐานข้อมูล จึงใช้ placeholder ได้ก่อนสร้าง .env
    // คำสั่ง migrate จะเชื่อมต่อและยังคงล้มเหลวหากไม่ได้ใส่ URL จริง
    url:
      process.env.DATABASE_URL ??
      'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
