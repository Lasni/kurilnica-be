import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { ConversationEnum } from "../../enums/graphqlEnums";
import {
  ConversationDeletedSubscriptionPayload,
  ConversationPopulated,
  ConversationUpdatedSubscriptionPayload,
  GraphQLContext,
} from "../../interfaces/graphqlInterfaces";
import { userIsConversationParticipant } from "../../util/helpers.js";

const conversationResolvers = {
  Query: {
    conversations: async (
      parent: any,
      args: any,
      contextValue: GraphQLContext,
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
      contextValue: GraphQLContext,
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
      contextValue: GraphQLContext
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
        console.error("markConversationAsReadError: ", error);
        throw new GraphQLError(error?.message);
      }
    },
    deleteConversation: async function (
      _: any,
      args: { conversationId: string },
      context: GraphQLContext
    ): Promise<boolean> {
      const { session, prisma, pubsub } = context;
      const { conversationId } = args;

      // check that user exists
      if (!session.user) {
        throw new GraphQLError("Not authorized");
      }

      try {
        // delete conversation entity and all related entities (participants, messages)
        const [deletedConversation] = await prisma.$transaction([
          // delete conversation
          prisma.conversation.delete({
            where: {
              id: conversationId,
            },
            include: conversationPopulated,
          }),
          // delete conversation participants
          prisma.conversationParticipant.deleteMany({
            where: {
              conversationId: conversationId,
            },
          }),
          // delete conversation messages
          prisma.message.deleteMany({
            where: {
              conversationId: conversationId,
            },
          }),
        ]);

        pubsub.publish("CONVERSATION_DELETED", {
          conversationDeleted: deletedConversation,
        });
      } catch (error: any) {
        console.error("deleteConversation error: ", error);
        throw new GraphQLError("Failed to delete conversation");
      }

      return true;
    },
  },
  Subscription: {
    conversationCreated: {
      subscribe: withFilter(
        (parent: any, args: any, contextValue: GraphQLContext, info: any) => {
          const { pubsub } = contextValue;
          return pubsub.asyncIterator([ConversationEnum.CONVERSATION_CREATED]);
        },
        (
          payload: ConversationCreatedSubscriptionPayloadInterface,
          variables,
          context: GraphQLContext
        ) => {
          const { session } = context;
          const {
            conversationCreated: { participants },
          } = payload;

          // cast to boolean with !! (try Boolean cast)
          // const userIsParticipant = Boolean(
          //   participants.find((p) => p.userId === session.user.id)
          // );
          return userIsConversationParticipant(participants, session.user.id);
        }
      ),
    },

    conversationUpdated: {
      subscribe: withFilter(
        (_: any, __: any, contextValue: GraphQLContext) => {
          const { pubsub } = contextValue;
          return pubsub.asyncIterator([ConversationEnum.CONVERSATION_UPDATED]);
        },
        (
          payload: ConversationUpdatedSubscriptionPayload,
          _: any,
          context: GraphQLContext
        ) => {
          const { session } = context;
          if (!session?.user) {
            throw new GraphQLError("Not authorized");
          }

          // userId
          const {
            user: { id: userId },
          } = session;

          // participants
          const {
            conversationUpdated: {
              conversation: { participants },
            },
          } = payload;

          return userIsConversationParticipant(participants, userId);
        }
      ),
    },

    conversationDeleted: {
      subscribe: withFilter(
        (_: any, __: any, context: GraphQLContext) => {
          const { pubsub } = context;
          return pubsub.asyncIterator(["CONVERSATION_DELETED"]);
        },

        (
          payload: ConversationDeletedSubscriptionPayload,
          _: any,
          context: GraphQLContext
        ) => {
          const { session } = context;
          if (!session.user) {
            throw new GraphQLError("Not authorized");
          }

          const { id: userId } = session.user;
          const {
            conversationDeleted: { participants },
          } = payload;

          return userIsConversationParticipant(participants, userId);
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
