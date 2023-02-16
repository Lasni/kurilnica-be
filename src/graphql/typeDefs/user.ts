// v.4 doesn't depend on gql anymore
const userTypeDefs = `#graphql
  
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
    inviteUserToConversation(userId: String): InviteUserToConversationResponse
  }

  type InviteUserToConversationResponse {
    success: Boolean
    error: String
    userId: String
  }

  type Subscription {
    userInvitedToConversation(invitingUserId: String, invitedUserId: String): UserInvitedToConversationSubscriptionResponse
  }

  type UserInvitedToConversationSubscriptionResponse {
    success: Boolean
    error: String
    userId: String
  }
`;

export default userTypeDefs;
