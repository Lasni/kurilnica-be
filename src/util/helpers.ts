import { ConversationParticipantPopulated } from "../interfaces/graphqlInterfaces";

export function userIsConversationParticipant(
  participants: Array<ConversationParticipantPopulated>,
  userId: string
): boolean {
  return Boolean(
    participants.find((participant) => participant.userId === userId)
  );
}
