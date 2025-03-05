const express = require("express");
import { ApolloServer } from "apollo-server-express";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { createServer } from "http";
import connectDB from "./config/database";
import typeDefs from "./graphql/typeDefs";
import resolvers from "./graphql/resolvers";

const app = express();
connectDB();

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const server = new ApolloServer({
  schema,
  context: ({ req }) => {
    // Get the JWT token from request headers
    const token = req.headers.authorization || "";
    return { token };
  },
});

async function startServer() {
  await server.start();
  server.applyMiddleware({ app });

  const httpServer = createServer(app);
  httpServer.listen(4000, () => {
    console.log("Server running at http://localhost:4000/graphql");
  });
}

startServer();
