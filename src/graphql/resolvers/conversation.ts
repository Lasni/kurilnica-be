import { GraphQLContextInterface } from "../../interfaces/graphqlInterfaces";
import { GraphQLError } from "graphql";
import { Prisma } from "@prisma/client";

const conversationResolvers = {
  // Query: {},
  Mutation: {
    createConversation: async (
      parent: any,
      args: { participantIds: Array<string> },
      contextValue: GraphQLContextInterface,
      info: any
    ): Promise<{ conversationId: string }> => {
      const { participantIds } = args;
      const { prisma, session } = contextValue;
      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }
      const { id: userId } = session.user;

      try {
        console.log("participantIds:", participantIds);
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
        return {
          conversationId: conversation.id,
        };
      } catch (error) {
        throw new GraphQLError(`Error creating conversation: ${error}`);
      }
    },
  },
  // Subscription: {}
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
