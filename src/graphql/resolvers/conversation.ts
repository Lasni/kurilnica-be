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
      // console.log("participantIds:", participantIds);
      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }
      const { id: userId } = session.user;

      try {
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              createMany: {
                data: participantIds.map((id) => ({
                  userId: id,
                  hasSeenLatestMessage: id === userId, // makes sense that the creator of conversation has this as true
                })),
              },
            },
          },
          include: conversationPopulated,
        });
        return {
          conversationId: conversation.id,
        };
      } catch (error) {
        throw new GraphQLError("Error creating conversation");
      }
    },
  },
  // Subscription: {}
};

export const participantPopulated =
  Prisma.validator<Prisma.ConversationParticipantInclude>()({
    user: {
      select: {
        id: true,
        username: true,
      },
    },
  });

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
