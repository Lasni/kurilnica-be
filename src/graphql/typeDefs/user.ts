import { GraphQLID, GraphQLInputObjectType, GraphQLScalarType } from "graphql";

// v.4 doesn't depend on gql anymore
// const EditingConversationInput = new GraphQLInputObjectType({
//   name: 'EditingConversationInput',
//   fields: () => ({
//     id:          { type: GraphQLID },
//     latestMessage: { type: LatestMessage },
//     participants:    { type: Date },
//     updatedAt: {type: Date}
//   })
// });

// id: String
//     latestMessage: LatestMessage
//     participants: [Participant]
//     updatedAt: Date

const userTypeDefs = `#graphql
  scalar Date
  
  type Query {
    searchUsers(username: String, usernamesInCurrentConvo: [String]): [SearchedUser]
  }

  

  type User {
    id: String
    name: String
    username: String
    email: String
    emailVerified: Boolean
    image: String
  }

  type SearchedUser {
    id: String
    username: String
  }

  type Mutation {
    createUsername(username: String): CreateUsernameResponse
  }

  type CreateUsernameResponse {
    success: Boolean
    error: String
  }

  

  type Mutation {
    inviteUserToConversation(userId: String conversationId: String): InviteUserToConversationResponse
  }

  type InviteUserToConversationResponse {
    success: Boolean
    error: String
    userId: String
    conversationId: String
  }

 

  # input EditingConversation {
  #   id: String
  #   latestMessage: LatestMessage
  #   # participants: [Participant]
  #   updatedAt: Date
  # }

  # input LatestMessage {
  #   body: String
  #   createdAt: Date
  #   id: String
  #   # sender: Sender
  # }

  # input Participant {
  #   user: User
  #   hasSeenLatestMessage: Boolean
  # }
  # type User {
  #   id: String
  #   username: String
  # }
  
  # input Sender {
  #   id: String
  #   username: String
  # }

  type Subscription {
    userInvitedToConversation(invitingUserId: String, invitedUserId: String, conversationId: String): UserInvitedToConversationSubscriptionResponse
  }

  type UserInvitedToConversationSubscriptionResponse {
    invitedUserId: String
    invitingUserId: String
    invitingUserUsername: String
    conversationId: String
    # success: Boolean
    # error: String
    # userId: String
  }
`;

export default userTypeDefs;
