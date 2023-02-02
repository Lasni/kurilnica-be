const conversationTypeDefs = `#graphql
  scalar Date
  type Mutation {
    createConversation(participantIds: [String]): CreateConversationResponse
  }

  type CreateConversationResponse {
    success: Boolean
    error: String
    conversationId: String
  }

  type Mutation {
    markConversationAsRead(userId: String!, conversationId: String!): MarkConversationAsReadResponse 
  }

  type MarkConversationAsReadResponse {
    success: Boolean
    error: String
  }

  type Mutation {
    deleteConversation(conversationId: String!): DeleteConversationResponse
  }

  type Mutation {
    leaveConversation(conversationId: String!, conversationParticipantsIds: [String]!): LeaveConversationResponse
  }

  type Mutation {
    updateConversation(conversationId: String!, participantIds: [String]!): UpdateConversationResponse
  }

  type UpdateConversationResponse {
    success: Boolean
    error: String
    conversationId: String
  }

  type LeaveConversationResponse {
    success: Boolean
    error: String
  }

  type DeleteConversationResponse {
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
  # type ConversationCreatedSubscriptionPayload {
  #   conversation: Conversation
  # }

  type Subscription {
    conversationUpdated: ConversationUpdatedSubscriptionPayload
  }
  type ConversationUpdatedSubscriptionPayload {
    conversation: Conversation
    removedUserIds: [String]
  }

  type Subscription {
    conversationDeleted: ConversationDeletedSubscriptionPayload
  }
  type ConversationDeletedSubscriptionPayload {
    id: String
  }
`;

export default conversationTypeDefs;
