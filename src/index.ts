import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { PrismaClient } from "@prisma/client";
import pkg from "body-parser";
import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import { PubSub } from "graphql-subscriptions";
import { useServer } from "graphql-ws/lib/use/ws";
import { createServer } from "http";
import { getSession } from "next-auth/react";
import { WebSocketServer } from "ws";
import resolvers from "./graphql/resolvers/index.js";
import typeDefs from "./graphql/typeDefs/index.js";
import {
  CustomSessionInterface,
  GraphQLContext,
  SubscriptionContextInterface,
} from "./interfaces/graphqlInterfaces";

//! Created branch temp01 because basic messaging was breaking after implementing 'mark conversations as read' functionality

const { json } = pkg;
dotenv.config();

interface MyContext {
  token?: String;
}

const corsOptions = {
  origin: process.env.CLIENT_ORIGIN_URL,
  credentials: true,
};

/**
 * Context parameters
 */
const prisma = new PrismaClient();

const app = express();

// This `app` is the returned value from `express()`.
const httpServer = createServer(app);

const schema = makeExecutableSchema({ typeDefs, resolvers });

const server = new ApolloServer<MyContext>({
  schema,
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

// Creating the WebSocket server
const wsServer = new WebSocketServer({
  // This is the `httpServer` we created in a previous step.
  server: httpServer,
  // Pass a different path here if app.use
  // serves expressMiddleware at a different path
  path: "/graphql/subscriptions",
});

const pubsub = new PubSub();

// Hand in the schema we just created and have the
// WebSocketServer start listening.
const serverCleanup = useServer(
  {
    schema,
    context: async (
      ctx: SubscriptionContextInterface
    ): Promise<GraphQLContext> => {
      if (ctx.connectionParams && ctx.connectionParams.session) {
        const { session } = ctx.connectionParams;

        return { session, prisma, pubsub };
      }
      return { session: null, prisma, pubsub };
    },
  },
  wsServer
);

await server.start();

app.use(
  "/graphql",
  cors<cors.CorsRequest>(corsOptions),
  json(),
  expressMiddleware(server, {
    context: async ({ req, res }): Promise<GraphQLContext> => {
      const session = (await getSession({ req })) as CustomSessionInterface;
      return {
        // token: req.headers.token,
        session,
        prisma,
        pubsub,
      };
    },
  })
);

await new Promise<void>((resolve) =>
  httpServer.listen({ port: 4000 }, resolve)
);
console.log(`🚀 Server ready at http://localhost:4000/graphql`);
