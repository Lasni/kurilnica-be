import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";

import { UserEnum } from "../../enums/graphqlEnums";
import {
  InviteUserMutationArgs,
  InviteUserMutationResponse,
} from "../../interfaces/graphqlInterfaces";
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
      const { username: searchedUsername, usernamesInCurrentConvo } = args;
      const { prisma, session } = context;

      if (!session?.user) {
        throw new GraphQLError("Not Authorized");
      }

      const { username: signedInUsername } = session.user;

      // console.log(
      //   "searchUsers resolver -> usernamesInCurrentConvo: ",
      //   usernamesInCurrentConvo
      // );

      const usernamesNotForSearch = [
        ...usernamesInCurrentConvo,
        signedInUsername,
      ];

      try {
        const users = await prisma.user.findMany({
          where: {
            username: {
              contains: searchedUsername,
              // not: signedInUsername,
              mode: "insensitive",
            },
            NOT: {
              username: {
                in: usernamesNotForSearch,
              },
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
    inviteUserToConversation: async function (
      _: any,
      args: InviteUserMutationArgs,
      context: GraphQLContext
    ): Promise<InviteUserMutationResponse> {
      const { userId: invitedUserId } = args;
      const { prisma, session, pubsub } = context;

      if (!session?.user) {
        return {
          error: "Not authorized",
        };
      }
      const { id: invitingUserId } = session.user;

      console.log(
        `invitingUserId: ${invitingUserId} --> invitedUserId: ${invitedUserId}`
      );
      pubsub.publish(UserEnum.USER_INVITED_TO_CONVERSATION, {
        invitedUserId,
        invitingUserId,
      });
      return { success: true, error: "" };
    },
  },
  Subscription: {
    userInvitedToConversation: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator([UserEnum.USER_INVITED_TO_CONVERSATION]);
        },
        (payload: any, variables: any, context: GraphQLContext) => {
          console.log("payload", payload);
          console.log("variables", variables);
          // console.log("context", context);
          return true;
        }
      ),
    },
  },
};

export default userResolvers;
