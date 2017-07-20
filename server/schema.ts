import { makeExecutableSchema } from 'graphql-tools';
import { find, filter, findIndex } from 'lodash';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();
const schema = [`
type Comment {
    id: Int!
    exposed: Boolean!
    value: String
    votes: Int
    topic: Topic!
}

type Topic {
    id: Int!
    name: String!
    comments: [Comment]
    room: Room!
}

type Room {
    id: Int!
    title: String
    topics: [Topic]
}

type Query {
    comment(commentId: Int!): Comment
    comments: [Comment]
    topics: [Topic]
    room(roomId: Int!): Room
    rooms: [Room]
}

type Mutation {
    addComment(topicId: Int!): Comment
    updateComment(commentId: Int!, value: String): Comment
    deleteComment(commentId: Int!): Topic
    addTopic(roomId: Int!, name: String): Topic
    deleteTopic(topicId: Int!): Room
    addRoom(title: String): Room
    updateRoom(roomId: Int!, title: String!): Room
}

type Subscription {
    Room(filter: SubscriptionFilter): RoomSubscriptionPayload
    Topic(filter: SubscriptionFilter): TopicSubscriptionPayload
    Comment: CommentSubscriptionPayload
}

input SubscriptionFilter {
  mutation_in: [_ModelMutationType!]
}

interface SubscriptionPayload {
    mutation: _ModelMutationType!
}

type RoomSubscriptionPayload implements SubscriptionPayload {
    mutation: _ModelMutationType!
    node: Room
}

type TopicSubscriptionPayload implements SubscriptionPayload {
    mutation: _ModelMutationType!
    node: Topic
}

type CommentSubscriptionPayload implements SubscriptionPayload {
    mutation: _ModelMutationType!
    node: Comment
}

enum _ModelMutationType {
    CREATED
    UPDATED
    DELETED
}

# root schema
schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
}
`];

class Room {
    id: number;
    title: string;
}

class Comment {
    id: number;
    exposed: boolean;
    value: string;
    votes: number;
    topicId: number;
}

class Topic {
    id: number;
    name: string;
    roomId: number;
}

// Fake data
const rooms: Room[] = [{
    id: 1,
    title: 'test room'
}, {
    id: 2,
    title: 'second room'
}];
const comments: Comment[] = [{
    id: 1,
    exposed: false,
    value: 'hello',
    votes: 0,
    topicId: 1
}];
const topics: Topic[] = [{
    id: 1,
    name: 'What went well',
    roomId: 1
}, {
    id: 2,
    name: 'What didn\'t go well',
    roomId: 1
}, {
    id: 3,
    name: 'What can we improve',
    roomId: 1
}, {
    id: 4,
    name: 'Kudos/thanks',
    roomId: 1
}];

function generateId(collection: Array<any>): number {
    return collection.length ? Math.max(...collection.map((item) => item.id)) + 1 : 1;
}

const resolvers = {
    Query: {
        comment(root, { commentId }: { commentId: number }): Comment {
            return find(comments, (com) => com.id === commentId);
        },
        comments(): Comment[] {
            return comments;
        },
        topics(): Topic[] {
            return topics;
        },
        room(root, { roomId }: { roomId: number }): Room {
            return find(rooms, (room) => room.id === roomId);
        },
        rooms(): Room[] {
            return rooms;
        }
    },

    Mutation: {
        addComment(root, { topicId }: { topicId: number }, context): Comment {
            const newId = generateId(comments);
            const newComment = {
                id: newId,
                exposed: false,
                value: '',
                topicId,
                votes: 0
            };
            comments.push(newComment);
            pubsub.publish('Comment', {Comment: {mutation: 'CREATED', node: newComment}});
            return newComment;
        },
        updateComment(root, { commentId, value }: { commentId: number, value: string }, context): Comment {
            const comment = find(comments, (com) => com.id === commentId);
            if (!comment) {
                throw new Error(`Could not find comment with id ${commentId}`);
            }
            comment.value = value || '';

            return comment;
        },
        deleteComment(root, { commentId }: { commentId: number }, context): Topic {
            const commentIdx = findIndex(comments, (com) => com.id === commentId);
            const topicId = comments[commentIdx].topicId;
            const topic = find(topics, (top) => top.id === topicId);

            comments.splice(commentIdx, 1);

            return topic;
        },
        addTopic(root, { roomId, name }: { roomId: number, name: string }): Topic {
            const newId = generateId(topics);
            const newTopic = {
                id: newId,
                name,
                roomId
            };
            topics.push(newTopic);

            return newTopic;
        },
        deleteTopic(root, { topicId }: { topicId: number }): Room {
            // XXX we should really also be deleting any comments that were in this topic
            const topicIdx = findIndex(topics, (topic) => topic.id === topicId);
            const roomId = topics[topicIdx].roomId;
            const room = find(rooms, (rm) => rm.id === roomId);

            topics.splice(topicIdx, 1);

            return room;
        },
        addRoom(root, { title }: { title?: string }): Room {
            const newId = generateId(rooms);
            const newRoom = {
                id: newId,
                title
            };
            rooms.push(newRoom);

            return newRoom;
        },
        updateRoom(root, { roomId, title }: { roomId: number, title: string }): Room {
            const room = find(rooms, (rm) => rm.id === roomId);
            if (!room) {
                throw new Error(`Could not find comment with id ${roomId}`);
            }
            room.title = title || '';

            return room;
        }
    },

    Subscription: {
        Room: {
            subscribe: () => pubsub.asyncIterator('Room')
        },
        Topic: {
            subscribe: () => pubsub.asyncIterator('Topic')
        },
        Comment: {
            subscribe: () => pubsub.asyncIterator('Comment')
        }
    },

    Comment: {
        topic(comment: Comment): Topic {
            return find(topics, (topic) => topic.id === comment.topicId);
        }
    },
    Topic: {
        comments(topic: Topic): Comment[] {
            return filter(comments, (comment) => comment.topicId === topic.id);
        },
        room(topic: Topic): Room {
            return find(rooms, (room) => room.id === topic.roomId);
        }
    },
    Room: {
        topics(room: Room): Topic[] {
            return filter(topics, (topic) => topic.roomId === room.id);
        }
    }
};

const executableSchema = makeExecutableSchema({
    typeDefs: schema,
    resolvers,
});

export default executableSchema;
