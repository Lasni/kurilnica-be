import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import pkg from "body-parser";
import cors from "cors";
import express from "express";
import http from "http";

import { makeExecutableSchema } from "@graphql-tools/schema";
import resolvers from "./graphql/resolvers/index.js";
import typeDefs from "./graphql/typeDefs/index.js";
import * as dotenv from "dotenv";

const { json } = pkg;
dotenv.config();

interface MyContext {
  token?: String;
}
const schema = makeExecutableSchema({ typeDefs, resolvers });

const corsOptions = {
  origin: process.env.CLIENT_ORIGIN_URL,
  credentials: true,
};

const app = express();
const httpServer = http.createServer(app);
const server = new ApolloServer<MyContext>({
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});
await server.start();
app.use(
  "/graphql",
  cors<cors.CorsRequest>(corsOptions),
  json(),
  expressMiddleware(server, {
    context: async ({ req }) => ({ token: req.headers.token }),
  })
);

await new Promise<void>((resolve) =>
  httpServer.listen({ port: 4000 }, resolve)
);
console.log(`🚀 Server ready at http://localhost:4000/graphql`);
