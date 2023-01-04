import { Prisma } from "@prisma/client";
import { GraphQLError } from "graphql";
import { withFilter } from "graphql-subscriptions";
import { MessageEnum } from "../../enums/graphqlEnums";
import {
  GraphQLContextInterface,
  MessagePopulated,
  SendMessageArguments,
} from "../../interfaces/graphqlInterfaces";
const messageResolvers = {
  /**
   * Queries
   */
  Query: {},

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

      if (senderId !== userId) {
        throw new GraphQLError("Not authorized");
      }

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
                  id: senderId,
                },
                data: {
                  hasSeenLatestMessage: true,
                },
              },
              // for everybody else, set their hasSeenLatestMessage to false
              updateMany: {
                where: {
                  NOT: {
                    id: senderId,
                  },
                },
                data: {
                  hasSeenLatestMessage: false,
                },
              },
            },
          },
        });
        // emmit MESSAGE_SENT and CONVERSATION_UPDATED events and subscriptions, so that targets can receive them
        pubsub.publish("MESSAGE_SENT", { messageSent: newMessage });
        // pubsub.publish("CONVERSATION_UPDATED", {
        //   conversationUpdated: updatedConversation,
        // });
        // return {
        //   success: true,
        // };
        return true;
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
        (
          parent: any,
          args: any,
          contextValue: GraphQLContextInterface,
          info: any
        ) => {
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
