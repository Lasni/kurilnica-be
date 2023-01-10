import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { MessageEnum } from "../../enums/graphqlEnums";
import {
  GraphQLContextInterface,
  MessagePopulated,
  SendMessageArguments,
  SendMessageResponseInterface,
} from "../../interfaces/graphqlInterfaces";
import { userIsConversationParticipant } from "../../util/helpers.js";
import { conversationPopulated } from "./conversation.js";

const messageResolvers = {
  /**
   * Queries
   */
  Query: {
    messages: async function (
      parent: any,
      args: { conversationId: string },
      context: GraphQLContextInterface,
      info: any
    ): Promise<Array<MessagePopulated>> {
      const { session, prisma } = context;
      const { conversationId } = args;

      if (!session?.user) {
        throw new GraphQLError("Not authorized");
      }
      const {
        user: { id: userId },
      } = session;

      // verify that a conversation exists and that user is a conversation participant
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        include: conversationPopulated,
      });
      if (!conversation) {
        throw new GraphQLError("Conversation not found");
      }

      const allowedToView = userIsConversationParticipant(
        conversation.participants,
        userId
      );

      if (!allowedToView) {
        throw new GraphQLError("Not authorized");
      }

      try {
        const messages = await prisma.message.findMany({
          where: {
            conversationId,
          },
          include: messagePopulated,
          orderBy: {
            createdAt: "desc",
          },
        });
        return messages;
      } catch (error) {
        console.log("messages error: ", error);
        throw new GraphQLError("Error retrieving messages");
      }
      return [];
    },
  },

  /**
   * Mutations
   */
  Mutation: {
    sendMessage: async function (
      parent: any,
      args: SendMessageArguments,
      context: GraphQLContextInterface,
      info: any
    ): Promise<Boolean> {
      const { session, prisma, pubsub } = context;

      if (!session.user) {
        throw new GraphQLError("Not authorized");
      }

      const { id: userId } = session.user;
      const { id: messageId, senderId, conversationId, body } = args;

      // if (senderId !== userId) {
      //   throw new GraphQLError("Not authorized");
      // }

      try {
        // create a new message entity
        const newMessage = await prisma.message.create({
          data: {
            id: messageId,
            senderId,
            conversationId,
            body,
          },
          include: messagePopulated,
        });

        // find conversation participant entity
        const participant = await prisma.conversationParticipant.findFirst({
          where: {
            userId,
            conversationId,
          },
        });

        // should always exist
        if (!participant) {
          throw new GraphQLError("Participant does not exist");
        }

        const { id: participantId } = participant;

        // update conversation entity
        const updatedConversation = await prisma.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            latestMessageId: newMessage.id, // latestMessageId is now newMessage's id
            participants: {
              // for the sender, set hasSeenLatestMessage to true
              update: {
                where: {
                  id: participantId,
                },
                data: {
                  hasSeenLatestMessage: true,
                },
              },
              // for everybody else, set their hasSeenLatestMessage to false
              updateMany: {
                where: {
                  NOT: {
                    userId,
                    // userId: senderId,
                  },
                },
                data: {
                  hasSeenLatestMessage: false,
                },
              },
            },
          },
          include: conversationPopulated,
        });
        // emmit MESSAGE_SENT and CONVERSATION_UPDATED events and subscriptions, so that targets can receive them
        pubsub.publish("MESSAGE_SENT", { messageSent: newMessage });
        // pubsub.publish("CONVERSATION_UPDATED", {
        //   conversationUpdated: updatedConversation,
        // });
        return true;
        // return {
        //   success: true,
        //   error: "",
        // };
      } catch (error) {
        console.log("sendMessage error: ", error);
        throw new GraphQLError("Error sending message");
      }
    },
  },

  /**
   * Subscriptions
   */
  Subscription: {
    messageSent: {
      subscribe: withFilter(
        (parent: any, args: any, contextValue: GraphQLContextInterface) => {
          const { pubsub } = contextValue;
          return pubsub.asyncIterator([MessageEnum.MESSAGE_SENT]);
        },
        (
          payload: MessageSentSubscriptionPayloadInterface,
          variables: { conversationId: string },
          context: GraphQLContextInterface
        ) => {
          return (
            payload.messageSent.conversationId === variables.conversationId
          );
        }
      ),
    },
  },
};

export const messagePopulated = Prisma.validator<Prisma.MessageInclude>()({
  sender: {
    select: {
      id: true,
      username: true,
    },
  },
});

export interface MessageSentSubscriptionPayloadInterface {
  messageSent: MessagePopulated;
}

export default messageResolvers;
