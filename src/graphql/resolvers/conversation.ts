import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { ConversationEnum } from "../../enums/graphqlEnums";
import {
  ConversationPopulated,
  GraphQLContextInterface,
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
          include: conversationValidated,
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
          include: conversationValidated, // stuff that we want returned on our conversation object
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
  },
  Subscription: {
    conversationCreated: {
      subscribe: (
        parent: any,
        args: any,
        contextValue: GraphQLContextInterface,
        info: any
      ) => {
        const { pubsub } = contextValue;
        return pubsub.asyncIterator([ConversationEnum.CONVERSATION_CREATED]);
      },
    },
  },
};

export const participantValidated =
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

export const conversationValidated =
  Prisma.validator<Prisma.ConversationInclude>()({
    participants: {
      include: participantValidated,
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
