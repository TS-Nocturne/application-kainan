# KAINAN HIGH — Discord Verification Bot

บอทลงทะเบียนและอนุมัติสมาชิกสำหรับเซิร์ฟเวอร์ KAINAN HIGH พัฒนาด้วย TypeScript,
Node.js, discord.js v14, Prisma ORM และ PostgreSQL บน Supabase

## ความสามารถ

- หน้า Welcome แบบ Embed พร้อมปุ่มเปิด Modal
- Modal เก็บ Name, Roblox Username และ Gang
- บันทึกและแสดง `Join Date` จากวันที่สมาชิกเข้า Discord server
- ดึง Discord ID/Username และกำหนดสถานะให้อัตโนมัติ
- บันทึกข้อมูลผ่าน Prisma แบบ upsert ลง Supabase PostgreSQL ป้องกันใบสมัครซ้ำ
- Admin Dashboard พร้อมปุ่มเรียกสัมภาษณ์ อนุมัติ และปฏิเสธ
- ตรวจสิทธิ์แอดมินและป้องกันการกดดำเนินการซ้ำ
- กรอง input/control characters และปิด mention ที่ไม่ได้อนุญาต
- คืนสถานะอัตโนมัติหากเรียกสัมภาษณ์หรือมอบ Role ไม่สำเร็จ
- แจ้งผู้สมัครในห้องรอสัมภาษณ์และทาง DM
- มอบ Role `Citizen` อัตโนมัติเมื่ออนุมัติ
- คำสั่ง `/setup` สร้างห้อง Role และโพสต์ Welcome ให้อัตโนมัติ

## สิ่งที่ต้องมี

- Node.js 20.19 ขึ้นไป
- Discord Application/Bot
- Supabase Project
- สิทธิ์ของบอท: `Manage Channels`, `Manage Roles`, `Send Messages`,
  `Read Message History`, `View Channels`

> Role ของบอทต้องอยู่สูงกว่า Role `Citizen` ใน Server Settings จึงจะมอบ Role ได้

## ติดตั้ง

1. ติดตั้งแพ็กเกจ

   ```bash
   npm install
   ```

2. ที่ Supabase หน้า **Connect** คัดลอก **Session pooler** พอร์ต `5432`
   มาใส่ใน `DATABASE_URL` โดยใช้ URL เดียวทั้งตัวบอทและ Prisma migrations

3. คัดลอก `.env.example` เป็น `.env` และกรอกค่าที่จำเป็น

   ```bash
   Copy-Item .env.example .env
   ```

   เติม `?sslmode=require` หาก URL ยังไม่มี query parameters และห้ามเผยแพร่
   รหัสผ่านฐานข้อมูลหรือ commit ไฟล์ `.env`

   > ไม่แนะนำ Transaction pooler พอร์ต `6543` สำหรับ `prisma migrate`
   > เพราะ migration ต้องใช้การเชื่อมต่อแบบ session

4. สร้างตารางใน Supabase ด้วย Prisma migration

   ```bash
   npm run db:migrate
   ```

5. เปิด Discord Developer Portal:

   - เปิด Bot Intent: `Server Members Intent`
   - เชิญบอทด้วย scopes `bot` และ `applications.commands`
   - ให้สิทธิ์ตามรายการด้านบน

6. เริ่มบอท

   ```bash
   npm start
   ```

7. ใน Discord ใช้คำสั่ง `/setup` ด้วยบัญชี Administrator

คำสั่งจะสร้าง:

- `#📝ลงทะเบียน-kainan`
- `#🔊รอสัมภาษณ์`
- `#💻admin-dashboard` (ห้องส่วนตัว)
- Role `Citizen`

หากมี Role ทีมงานอยู่แล้ว ให้ใส่ ID ใน `ADMIN_ROLE_ID` ก่อนใช้ `/setup`
เพื่ออนุญาตให้ Role นั้นเห็นห้อง Admin Dashboard และกดปุ่มจัดการได้
ผู้ที่กดปุ่มจัดการได้มีเพียง `Administrator` และ `ADMIN_ROLE_ID` เท่านั้น

> เมื่อรัน `/setup` บอทจะตั้ง permission overwrites ของห้องระบบใหม่
> เพื่อป้องกันข้อมูลใน Admin Dashboard รั่วไปยัง Role อื่น

## การเปิดห้องอื่นหลังอนุมัติ

บอทสร้าง Role `Citizen` และมอบให้หลังอนุมัติ แต่สิทธิ์ของห้องเดิมในเซิร์ฟเวอร์
ต้องตั้งเอง: ปิด `View Channel` สำหรับ `@everyone` และเปิดให้ `Citizen`
จึงจะเห็นห้องเหล่านั้นหลังผ่านการอนุมัติ

## คำสั่งสำหรับพัฒนา

```bash
npm run dev
npm run check
npm run build
npm test
npm run db:generate
npm run db:migrate
npm run db:studio
```
