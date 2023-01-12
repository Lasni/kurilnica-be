import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { ConversationEnum } from "../../enums/graphqlEnums";
import { MarkConversationAsReadMutationOutput } from "../../../../frontend/src/interfaces/graphqlInterfaces";
import { userIsConversationParticipant } from "../../util/helpers.js";
import {
  ConversationPopulated,
  GraphQLContextInterface,
  MarkConversationAsReadInterface,
} from "../../interfaces/graphqlInterfaces";

const conversationResolvers = {
  Query: {
    conversations: async (
      parent: any,
      args: any,
      contextValue: GraphQLContextInterface,
      info: any
    ): Promise<Array<ConversationPopulated>> => {
      const { session, prisma } = contextValue;
      if (!session?.user) {
        throw new GraphQLError(`Not authorized`);
      }
      const {
        user: { id: userId },
      } = session;

      try {
        const conversations = await prisma.conversation.findMany({
          where: {
            participants: {
              some: {
                userId: {
                  equals: userId,
                },
              },
            },
          },
          include: conversationPopulated,
        });
        return conversations;
      } catch (error: any) {
        throw new GraphQLError(`Error: ${error?.message}`);
      }
    },
  },
  Mutation: {
    createConversation: async (
      parent: any,
      args: { participantIds: Array<string> },
      contextValue: GraphQLContextInterface,
      info: any
    ): Promise<{ conversationId: string }> => {
      const { participantIds } = args;
      const { prisma, session, pubsub } = contextValue;
      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }
      const { id: userId } = session.user;

      try {
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantIds?.map((id) => ({
                  userId: id,
                  hasSeenLatestMessage: id === userId, // makes sense that the creator of conversation has seen the message
                })),
              },
            },
          },
          include: conversationPopulated, // stuff that we want returned on our conversation object
        });

        // emmit CONVERSATION_CREATED event using pubsub
        pubsub.publish(ConversationEnum.CONVERSATION_CREATED, {
          conversationCreated: conversation,
        });

        return {
          conversationId: conversation.id,
        };
      } catch (error) {
        throw new GraphQLError(`Error creating conversation: ${error}`);
      }
    },

    markConversationAsRead: async (
      _: any,
      args: { userId: string; conversationId: string },
      contextValue: GraphQLContextInterface
    ): Promise<boolean> => {
      const { session, prisma } = contextValue;
      const { userId, conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError("Not authorized.");
      }

      try {
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          },
        });
        // Should always exist, but being safe
        if (!participant) {
          throw new GraphQLError("Participant entity not found");
        }

        await prisma.conversationParticipant.update({
          where: {
            id: participant.id,
          },
          data: {
            hasSeenLatestMessage: true,
          },
        });
        return true;
        // return {
        //   success: true,
        //   error: "",
        // };
      } catch (error: any) {
        console.log("markConversationAsReadError: ", error);
        throw new GraphQLError(error?.message);
      }
    },
  },
  Subscription: {
    conversationCreated: {
      subscribe: withFilter(
        (
          parent: any,
          args: any,
          contextValue: GraphQLContextInterface,
          info: any
        ) => {
          const { pubsub } = contextValue;
          return pubsub.asyncIterator([ConversationEnum.CONVERSATION_CREATED]);
        },
        (
          payload: ConversationCreatedSubscriptionPayloadInterface,
          variables,
          context: GraphQLContextInterface
        ) => {
          const { session } = context;
          const {
            conversationCreated: { participants },
          } = payload;

          // cast to boolean with !! (try Boolean cast)
          // const userIsParticipant = Boolean(
          //   participants.find((p) => p.userId === session.user.id)
          // );
          const userIsParticipant = userIsConversationParticipant(
            participants,
            session.user.id
          );

          return userIsParticipant;
        }
      ),
    },
  },
};

export interface ConversationCreatedSubscriptionPayloadInterface {
  conversationCreated: ConversationPopulated;
}

export const participantPopulated =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
      },
    },
  });

// export const senderValidated = Prisma.validator<Prisma.MessageInclude>()({
//   sender: {
//     select: {
//       id: true,
//       username: true,
//     },
//   },
// });

export const conversationPopulated =
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantPopulated,
    },
    latestMessage: {
      include: {
        sender: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    },
  });

export default conversationResolvers;
