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
    inviteUserToConversation(userId: String): InviteUserResponse
  }

  type InviteUserResponse {
    success: Boolean
    error: String
  }

  type Subscription {
    userInvitedToConversation(invitingUserId: String, invitedUserId: String): Boolean
  }
`;

export default userTypeDefs;
