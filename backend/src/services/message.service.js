import { createNotification } from './notification.service.js';

function formatParticipant(user) {
  if (!user) return null;
  const name =
    user.studentProfile ? `${user.studentProfile.firstName} ${user.studentProfile.lastName}` :
    user.recruiterProfile ? `${user.recruiterProfile.firstName} ${user.recruiterProfile.lastName}` :
    user.mentorProfile ? `${user.mentorProfile.firstName} ${user.mentorProfile.lastName}` :
    user.counselorProfile ? `Counselor (${user.counselorProfile.department})` :
    user.email.split('@')[0];

  const role =
    user.role?.name ||
    (user.studentProfile ? 'student' : user.recruiterProfile ? 'recruiter' : 'user');

  return {
    id: user.id,
    email: user.email,
    name,
    role
  };
}

export async function listConversations({ db, userId, page = 1, limit = 50 }) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  const conversations = await db.conversation.findMany({
    where: {
      OR: [
        { participant1Id: userId },
        { participant2Id: userId }
      ]
    },
    include: {
      participant1: {
        include: {
          role: true,
          studentProfile: true,
          counselorProfile: true,
          recruiterProfile: true,
          mentorProfile: true
        }
      },
      participant2: {
        include: {
          role: true,
          studentProfile: true,
          counselorProfile: true,
          recruiterProfile: true,
          mentorProfile: true
        }
      },
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 1
      }
    },
    skip,
    take,
    orderBy: { updatedAt: 'desc' }
  });

  const conversationIds = conversations.map((conv) => conv.id);
  const unreadCounts = new Map();

  // Single aggregated query to avoid N+1 query bottleneck
  if (conversationIds.length > 0) {
    if (typeof db.message?.groupBy === 'function') {
      try {
        const grouped = await db.message.groupBy({
          by: ['conversationId'],
          where: {
            conversationId: { in: conversationIds },
            senderId: { not: userId },
            isRead: false
          },
          _count: { id: true }
        });
        for (const item of grouped) {
          unreadCounts.set(item.conversationId, item._count?.id ?? item._count ?? 0);
        }
      } catch (err) {
        await Promise.all(
          conversations.map(async (conv) => {
            const count = await db.message.count({
              where: {
                conversationId: conv.id,
                senderId: { not: userId },
                isRead: false
              }
            });
            unreadCounts.set(conv.id, count);
          })
        );
      }
    } else {
      await Promise.all(
        conversations.map(async (conv) => {
          const count = await db.message.count({
            where: {
              conversationId: conv.id,
              senderId: { not: userId },
              isRead: false
            }
          });
          unreadCounts.set(conv.id, count);
        })
      );
    }
  }

  const formatted = conversations.map((conv) => {
    const otherUser = conv.participant1Id === userId ? conv.participant2 : conv.participant1;
    const unreadCount = unreadCounts.get(conv.id) ?? 0;

    return {
      id: conv.id,
      participant: formatParticipant(otherUser),
      lastMessage: conv.messages[0] ? {
        id: conv.messages[0].id,
        content: conv.messages[0].content,
        sentAt: conv.messages[0].sentAt,
        senderId: conv.messages[0].senderId,
        isRead: conv.messages[0].isRead
      } : null,
      unreadCount,
      updatedAt: conv.updatedAt
    };
  });

  return formatted;
}

export async function getOrCreateConversation({ db, userId, recipientId }) {
  if (userId === recipientId) {
    const error = new Error('Cannot start conversation with yourself');
    error.status = 400;
    error.code = 'INVALID_RECIPIENT';
    throw error;
  }

  const recipient = await db.user.findUnique({ where: { id: recipientId } });
  if (!recipient || !recipient.isActive) {
    const error = new Error('Recipient user not found');
    error.status = 404;
    error.code = 'RECIPIENT_NOT_FOUND';
    throw error;
  }

  let conversation = await db.conversation.findFirst({
    where: {
      OR: [
        { participant1Id: userId, participant2Id: recipientId },
        { participant1Id: recipientId, participant2Id: userId }
      ]
    },
    include: {
      participant1: { include: { role: true, studentProfile: true, counselorProfile: true, recruiterProfile: true, mentorProfile: true } },
      participant2: { include: { role: true, studentProfile: true, counselorProfile: true, recruiterProfile: true, mentorProfile: true } }
    }
  });

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        participant1Id: userId,
        participant2Id: recipientId
      },
      include: {
        participant1: { include: { role: true, studentProfile: true, counselorProfile: true, recruiterProfile: true, mentorProfile: true } },
        participant2: { include: { role: true, studentProfile: true, counselorProfile: true, recruiterProfile: true, mentorProfile: true } }
      }
    });
  }

  const otherUser = conversation.participant1Id === userId ? conversation.participant2 : conversation.participant1;
  return {
    id: conversation.id,
    participant: formatParticipant(otherUser),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt
  };
}

export async function getConversationMessages({ db, conversationId, userId, page = 1, limit = 50 }) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId }
  });

  if (!conversation) {
    const error = new Error('Conversation not found');
    error.status = 404;
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  }

  if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
    const error = new Error('You are not authorized to view this conversation');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
  const take = Math.max(1, Math.min(100, limit));

  const [total, messages] = await Promise.all([
    db.message.count({ where: { conversationId } }),
    db.message.findMany({
      where: { conversationId },
      orderBy: { sentAt: 'asc' },
      skip,
      take,
      include: {
        sender: {
          select: { id: true, email: true }
        }
      }
    })
  ]);

  return {
    messages,
    pagination: {
      total,
      page: Number(page),
      limit: Number(take),
      totalPages: Math.ceil(total / take)
    }
  };
}

export async function sendMessage({ db, conversationId, senderId, content }) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participant1: true,
      participant2: true
    }
  });

  if (!conversation) {
    const error = new Error('Conversation not found');
    error.status = 404;
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  }

  if (conversation.participant1Id !== senderId && conversation.participant2Id !== senderId) {
    const error = new Error('You are not authorized to send messages in this conversation');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  const recipientId = conversation.participant1Id === senderId
    ? conversation.participant2Id
    : conversation.participant1Id;

  const [message] = await Promise.all([
    db.message.create({
      data: {
        conversationId,
        senderId,
        content,
        isRead: false
      }
    }),
    db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })
  ]);

  await createNotification({
    db,
    userId: recipientId,
    type: 'NEW_DIRECT_MESSAGE',
    title: 'New Message',
    message: content.length > 60 ? `${content.slice(0, 57)}...` : content,
    referenceType: 'Conversation',
    referenceId: conversationId
  });

  return message;
}

export async function markConversationAsRead({ db, conversationId, userId }) {
  const conversation = await db.conversation.findUnique({
    where: { id: conversationId }
  });

  if (!conversation) {
    const error = new Error('Conversation not found');
    error.status = 404;
    error.code = 'CONVERSATION_NOT_FOUND';
    throw error;
  }

  if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
    const error = new Error('You are not a participant in this conversation');
    error.status = 403;
    error.code = 'FORBIDDEN';
    throw error;
  }

  await db.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      isRead: false
    },
    data: { isRead: true }
  });

  return { success: true };
}
