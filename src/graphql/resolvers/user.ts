import { GraphQLError } from "graphql";
import {
  CreateUsernameMutationArgs,
  CreateUsernameMutationResponse,
  GraphQLContext,
  SearchUsersQueryArgs,
  SearchUsersQueryResponse,
} from "../../interfaces/graphqlInterfaces";

const userResolvers = {
  Query: {
    searchUsers: async function (
      _: any,
      args: SearchUsersQueryArgs,
      context: GraphQLContext
    ): Promise<SearchUsersQueryResponse> {
      const { username: searchedUsername } = args;
      const { prisma, session } = context;

      if (!session?.user) {
        throw new GraphQLError("Not Authorized");
      }

      const { username: signedInUsername } = session.user;

      try {
        const users = await prisma.user.findMany({
          where: {
            username: {
              contains: searchedUsername,
              not: signedInUsername,
              mode: "insensitive",
            },
          },
        });
        return users;
      } catch (error: any) {
        throw new GraphQLError(error?.message);
      }
    },
  },
  Mutation: {
    createUsername: async function (
      _: any,
      args: CreateUsernameMutationArgs,
      context: GraphQLContext
    ): Promise<CreateUsernameMutationResponse> {
      const { username } = args;
      const { prisma, session } = context;

      if (!session?.user) {
        return {
          error: "Not authorized",
        };
      }
      const { id: userId } = session.user;

      try {
        // check that username is available
        const existingUser = await prisma.user.findUnique({
          where: { username },
        });
        if (existingUser) {
          return {
            error: "Username already taken. Try another",
          };
        }

        const user = await prisma.user.update({
          where: { id: userId },
          data: { username },
        });
        if (user) {
          return { success: true };
        }

        // update user
      } catch (error: any) {
        return {
          error: error?.message,
        };
      }
    },
  },
};

export default userResolvers;
