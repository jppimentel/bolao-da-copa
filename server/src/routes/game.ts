import { FastifyInstance } from "fastify";
import {prisma} from "../lib/prisma";
import {z} from "zod";
import { authenticate } from "../plugins/authenticate";


export async function gameRoutes(fastify: FastifyInstance){
  fastify.get('/pools/:id/games', {
    onRequest: [authenticate],
  }, async (request) => {
    const getPoolParams = z.object({
      id: z.string(),
    });

    const {id} = getPoolParams.parse(request.params);

    const games = await prisma.game.findMany({
      orderBy: {
        date: "desc"
      },
      include: {
        guesses: {
          where: {
            participant: {
              userId: request.user.sub,
              poolId: id
            }
          }
        }
      }
    });

    return {games: games.map(game => {
      return{
        ...game,
        guess: game.guesses.length > 0 ? game.guesses[0] : null,
        guesses: undefined
      }
    })};
  });

  fastify.post('/pools/:poolId/games/:gameId/guesses', {
    onRequest: [authenticate]
  }, async (request, reply) => {
    const createGuessParams = z.object({
      poolId: z.string(),
      gameId: z.string()
    });

    const createGuessBody = z.object({
      firstTeamPoints: z.number(),
      secondTeamPoints: z.number()
    });

    const {poolId, gameId} = createGuessParams.parse(request.params);
    const {firstTeamPoints, secondTeamPoints} = createGuessBody.parse(request.body);

    const participant = await prisma.participant.findUnique({
      where: {
        userId_poolId: {
          poolId,
          userId: request.user.sub
        }
      }
    });

    if(!participant){
      return reply.status(400).send({
        message: "Você não pode criar um palpite nesse bolão"
      });
    }

    const guess = await prisma.guess.findUnique({
      where: {
        participantId_gameId: {
          participantId: participant.id,
          gameId
        } 
      }
    });

    if(guess){
      return reply.status(400).send({
        message: "Você já enviou um palpit para esse bolão"
      });
    }

    const game = await prisma.game.findUnique({
      where: {
        id: gameId
      }
    });

    if(!game){
      return reply.status(400).send({
        message: "Jogo não encontrado"
      });
    }

    if(game.date < new Date()){
      return reply.status(400).send({
        message: "Você não pode enviar um palpite após a data do jogo"
      });
    }

    await prisma.guess.create({
      data: {
        gameId,
        participantId: participant.id,
        firstTeamPoints,
        secondTeamPoints
      }
    });


    return reply.status(201).send();
  })
}
