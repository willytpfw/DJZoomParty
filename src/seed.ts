import { db } from './db/db';
import { user, company, userCompany, event, eventMusic } from './db/schema';
import 'dotenv/config';

/**
 * Seed script to populate database with initial test data
 * Run with: npx tsx src/seed.ts
 */
async function seed() {
    console.log('🌱 Starting database seed...\n');

    try {
        // Create test company
        console.log('Creating company...');
        const [testCompany] = await db.insert(company).values({
            name: 'Disco Night Club',
            active: true,
            url: 'http://localhost:5173',
            urlImagen: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
            keyCompany: 'DISCO001',
        }).returning();
        console.log(`✓ Company created: ${testCompany.name} (${testCompany.keyCompany})`);

        // Create test user
        console.log('\nCreating user...');
        const [testUser] = await db.insert(user).values({
            eMail: 'test@ex',
            movil: '5512345678',
            userName: 'admin',
            administrator: true,
            active: true,
            password: 'admin123',
        }).returning();
        console.log(`✓ User created: ${testUser.userName}`);

        // Link user to company
        console.log('\nLinking user to company...');
        await db.insert(userCompany).values({
            idUser: testUser.idUser,
            idCompany: testCompany.idCompany,
        });
        console.log('✓ User linked to company');

        // Create test event
        console.log('\nCreating event...');
        const eventDate = new Date();
        eventDate.setHours(eventDate.getHours() + 4); // Event in 4 hours

        const [testEvent] = await db.insert(event).values([{
            idCompany: testCompany.idCompany,
            name: 'Grand Opening Party',
            eventDate: eventDate,
            eventToken: 'EVT001TEST1234',
            active: true,
            positionLatitud: 19.4326,
            positionLongitud: -99.1332,
        }]).returning();
        console.log(`✓ Event created: ${testEvent.eventToken}`);

        // Add sample music
        console.log('\nAdding sample music...');
        const sampleSongs = [
            { title: 'Blinding Lights - The Weeknd', url: 'https://www.youtube.com/watch?v=4NRXx6U8ABQ', number: 1 },
            { title: 'Levitating - Dua Lipa', url: 'https://www.youtube.com/watch?v=TUVcZfQe-Kw', number: 2 },
            { title: 'Save Your Tears - The Weeknd', url: 'https://www.youtube.com/watch?v=XXYlFuWEuKI', number: 3 },
        ];

        for (const song of sampleSongs) {
            await db.insert(eventMusic).values({
                idEvent: testEvent.idEvent,
                title: song.title,
                url: song.url,
                number: song.number,
                likes: Math.floor(Math.random() * 50),
            });
            console.log(`  ✓ Added: ${song.title}`);
        }

        console.log('\n✅ Database seeded successfully!\n');
        console.log('Test credentials:');
        console.log(`  Company Key: ${testCompany.keyCompany}`);
        console.log(`  Event Token: ${testEvent.eventToken}`);
        console.log(`  Username: ${testUser.userName}`);
        console.log(`  Password: ${testUser.password}`);

    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }

    process.exit(0);
}

seed();
