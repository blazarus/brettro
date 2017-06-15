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
}

type Query {
    comment(commentId: Int!): Comment
    comments: [Comment]
    topics: [Topic]
}

type Mutation {
    addComment(topicId: Int!): Comment
    updateComment(commentId: Int!, value: String): Comment
    deleteComment(commentId: Int!): Topic
}

type Subscription {
    commentAdded: Comment
}

# root schema
schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
}
`];

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
}

// Fake data
const comments: Comment[] = [{
    id: 1,
    exposed: false,
    value: 'hello',
    votes: 0,
    topicId: 1
}];
const topics: Topic[] = [{
    id: 1,
    name: 'What went well'
}, {
    id: 2,
    name: 'What didn\'t go well'
}, {
    id: 3,
    name: 'What can we improve'
}, {
    id: 4,
    name: 'Kudos/thanks'
}];

function generateId(collection: Array<any>): number {
    return collection.length ? Math.max(...collection.map((item) => item.id)) + 1 : 1;
}

const resolvers = {
    Query: {
        comment(root, { commentId }): Comment {
            return find(comments, (com) => com.id === commentId);
        },
        comments(): Comment[] {
            return comments;
        },
        topics(): Topic[] {
            return topics;
        }
    },
    Mutation: {
        addComment(root, { topicId }, context): Comment {
            const newId = generateId(comments);
            const newComment = {
                id: newId,
                exposed: false,
                value: '',
                topicId,
                votes: 0
            };
            comments.push(newComment);
            pubsub.publish('comment_added', { commentAdded: newComment });
            return newComment;
        },
        updateComment(root, { commentId, value }, context): Comment {
            const comment = find(comments, (com) => com.id === commentId);
            if (!comment) {
                throw new Error(`Could not find comment with id ${commentId}`);
            }
            comment.value = value || '';

            return comment;
        },
        deleteComment(root, { commentId }, context): Topic {
            const commentIdx = findIndex(comments, (com) => com.id === commentId);
            const topicId = comments[commentIdx].topicId;
            const topic = find(topics, (top) => top.id === topicId);

            comments.splice(commentIdx, 1);

            return topic;
        }
    },
    // Subscription: {
    //     commentAdded: {
    //         subscribe: () => pubsub.asyncIterator('comment_added')
    //     }
    // },
    Comment: {
        topic(comment: Comment): Topic {
            return find(topics, (topic) => topic.id === comment.topicId);
        }
    },
    Topic: {
        comments(topic: Topic): Comment {
            return filter(comments, (comment) => comment.topicId === topic.id);
        }
    }
};

const executableSchema = makeExecutableSchema({
    typeDefs: schema,
    resolvers,
});

export default executableSchema;
