const conversationTypeDefs = `#graphql
  scalar Date
  type Mutation {
    createConversation(participantIds: [String]): CreateConversationResponse
  }

  type CreateConversationResponse {
    conversationId: String
  }

  type Mutation {
    markConversationAsRead(userId: String!, conversationId: String!): MarkConversationAsReadResponse 
  }

  type MarkConversationAsReadResponse {
    success: Boolean
    error: String
  }

  type Query {
    conversations: [Conversation]
  }

  type Conversation {
    id: String
    latestMessage: Message
    participants: [Participant]
    createdAt: Date
    updatedAt: Date

  }

  type Participant {
    id: String
    user: User
    hasSeenLatestMessage: Boolean
  }

  type Subscription {
    conversationCreated: Conversation
  }

  
`;

export default conversationTypeDefs;
