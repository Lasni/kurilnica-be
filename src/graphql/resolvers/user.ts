import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";

import { UserEnum } from "../../enums/graphqlEnums";
import {
  InviteUsersMutationArgs,
  InviteUsersMutationResponse,
  UserInvitedToConversationSubscriptionPayload,
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
    inviteUsersToConversation: async function (
      _: any,
      args: InviteUsersMutationArgs,
      context: GraphQLContext
    ): Promise<InviteUsersMutationResponse> {
      const { usersIds: invitedUsersIds, conversationId } = args;
      const { prisma, session, pubsub } = context;
      // console.log("invitedUsersIds: ", invitedUsersIds);
      // console.log("conversationId: ", conversationId);

      if (!session?.user) {
        return {
          error: "Not authorized",
        };
      }
      const { id: invitingUserId } = session.user;

      pubsub.publish(UserEnum.USER_INVITED_TO_CONVERSATION, {
        userInvitedToConversation: {
          invitedUsersIds,
          invitingUserId,
          invitingUserUsername: session.user.username,
          conversationId: conversationId,
        },
      });
      return {
        success: true,
        error: "",
        usersIds: invitedUsersIds,
        conversationId: conversationId,
      };
    },
    // respondToConversationInvitation: async function (
    //   _: any,
    //   args: RespondToConversationInvitationMutationArgs,
    //   context: GraphQLContext
    // ): RespondToConversationInvitationMutationResponse {
    //   const {accept} = args

    // }
  },
  Subscription: {
    userInvitedToConversation: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;

          return pubsub.asyncIterator([UserEnum.USER_INVITED_TO_CONVERSATION]);
        },
        (
          payload: UserInvitedToConversationSubscriptionPayload,
          variables: any,
          context: GraphQLContext
        ) => {
          const { session } = context;

          // console.log("payload: ", payload);

          return payload.userInvitedToConversation.invitedUsersIds.includes(
            session.user.id
          );
        }
      ),
    },
  },
};

export default userResolvers;
