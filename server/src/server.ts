import Fastify from 'fastify';
import cors from '@fastify/cors';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query'],
});

async function bootstrap() {
   const fastify = Fastify({
        logger: true, 
   });

   await fastify.register(cors, {
    origin: true,
    // origin: "www.dominio..."
   })

   fastify.get('/pools/count', async () => {
        // const pools = await prisma.pool.findMany({
        //     where: {
        //         code: {
        //             startsWith: 'B'
        //         }
        //     }
        // });  
        const count = await prisma.pool.count();   

        return {count};
    });
    
    await fastify.listen({port: 3333, /*host: '0.0.0.0'*/});
};

bootstrap();