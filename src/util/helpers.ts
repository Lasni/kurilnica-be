import { ParticipantPopulated } from "../interfaces/graphqlInterfaces";

export function userIsConversationParticipant(
  participants: Array<ParticipantPopulated>,
  userId: string
): boolean {
  return Boolean(
    participants.find((participant) => participant.userId === userId)
  );
}
