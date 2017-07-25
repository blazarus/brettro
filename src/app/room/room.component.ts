import { Component, OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef } from '@angular/core';
import { commentFragment } from '../app.component';
import {
    AddCommentMutation,
    AddCommentMutationVariables,
    AddTopicMutation,
    AddTopicMutationVariables,
    DeleteTopicMutationVariables,
    RoomQuery,
    RoomFieldsFragment,
    TopicFieldsFragment,
    CommentFieldsFragment,
    CommentSubscriptionSubscription,
    TopicSubscriptionSubscription,
    _ModelMutationType
} from '../../generated/query-types';
import { Apollo, ApolloQueryObservable } from 'apollo-angular';
import gql from 'graphql-tag';
import { find, findIndex } from 'lodash';
import { Observable } from 'rxjs/Observable';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { MdDialog } from '@angular/material';
import { AddTopicDialogComponent } from '../add-topic-dialog/add-topic-dialog.component';
import update from 'immutability-helper';

export const topicFragment = gql`
fragment topicFields on Topic {
    id
    name
    comments {
        ...commentFields
    }
}
${commentFragment}
`;

const roomFragment = gql`
fragment roomFields on Room {
    id
    title
    topics {
        ...topicFields
    }
}
${topicFragment}
`;

const roomQuery = gql`
query Room($roomId: Int!) {
    room(roomId: $roomId) {
        ...roomFields
    }
}
${roomFragment}
`;

const addCommentMutation = gql`
mutation addComment($topicId: Int!) {
    addComment(topicId: $topicId) {
        ...commentFields
    }
}
${commentFragment}
`;

const addTopicMutation = gql`
mutation addTopic($roomId: Int!, $name: String!) {
    addTopic(roomId: $roomId, name: $name) {
        ...topicFields
    }
}
${topicFragment}
`;

const commentSubscription = gql`
subscription commentSubscription {
    Comment {
        mutation
        node {
            ...commentFields
        }
    }
}
${commentFragment}
`;

const topicSubscription = gql`
subscription topicSubscription {
    Topic {
        mutation
        node {
            ...topicFields
        }
    }
}
${topicFragment}
`;

const deleteTopicMutation = gql`
mutation deleteTopic($topicId: Int!) {
    deleteTopic(topicId: $topicId) {
        id # room id - we don't actually care about this, but are required to query something
    }
}
`;

@Component({
    selector: 'app-room',
    templateUrl: './room.component.html',
    styleUrls: ['./room.component.css']
})
export class RoomComponent implements OnInit, OnChanges {

    @Input() private roomId: number;
    private roomIdSubject: BehaviorSubject<number>;
    roomObs: Observable<RoomFieldsFragment>;
    roomQuery: ApolloQueryObservable<RoomQuery>;

    constructor(private apollo: Apollo, private dialog: MdDialog, private cdr: ChangeDetectorRef) {}

    ngOnInit() {
        this.roomIdSubject = new BehaviorSubject(this.roomId);
        this.roomQuery = this.apollo.watchQuery<RoomQuery>({
            query: roomQuery,
            variables: { roomId: this.roomIdSubject },
            notifyOnNetworkStatusChange: true
        });

        this.setupCommentSubscription();
        this.setupTopicSubscription();

        this.roomObs = this.roomQuery.map(({data: {room}}) => room);
        this.roomObs.subscribe((room) => {
            // For some reason I need this for the update Comment subscription to actually get reflected in the UI immediately.
            // Seems like something in apollo must be happening asyncronously and not triggering change detection
            setTimeout(() => {
                this.cdr.detectChanges();
            }, 0);
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.roomId && !changes.roomId.firstChange) {
            this.roomIdSubject.next(changes.roomId.currentValue);
        }
    }

    private setupCommentSubscription() {
        this.apollo.subscribe({
            query: commentSubscription
        }).subscribe(({Comment: {node, mutation}}: CommentSubscriptionSubscription) => {
            this.roomQuery.updateQuery((prev: RoomQuery): RoomQuery => {
                const topicId = node.topic.id;
                const topicIdx = findIndex(prev.room.topics, (top: TopicFieldsFragment) => top.id === topicId);
                // Apollo-client does a deep freeze of the previous state, so we have to create new instances.
                // immutability-helper makes this slightly easier, but is still kind of nasty and not type safe
                if (mutation === 'CREATED') {
                    return update(prev, { room: {topics: {[topicIdx]: {comments: {$push: [node]}}}}});
                } else if (mutation === 'UPDATED') {
                    const commentIdx = findIndex(prev.room.topics[topicIdx].comments, (cmt) => cmt.id === node.id);
                    if (commentIdx < 0) {
                        return prev;
                    }
                    return update(prev, { room: {topics: {[topicIdx]: {comments: {
                        [commentIdx]: { $set: node }
                    }}}}});
                } else {
                    const commentIdx = findIndex(prev.room.topics[topicIdx].comments, (cmt) => cmt.id === node.id);
                    if (commentIdx < 0) {
                        return prev;
                    }
                    return update(prev, { room: {topics: {[topicIdx]: {comments: {
                        $splice: [[commentIdx, 1]]
                    }}}}});
                }

            });
        });
    }

    private setupTopicSubscription() {
        this.apollo.subscribe({
            query: topicSubscription
        }).subscribe((data: TopicSubscriptionSubscription) => {
            const {Topic: {node, mutation}} = data;
            this.roomQuery.updateQuery((prev: RoomQuery): RoomQuery => {
                // Apollo-client does a deep freeze of the previous state, so we have to create new instances.
                // immutability-helper makes this slightly easier, but is still kind of nasty and not type safe
                if (mutation === 'CREATED') {
                    return update(prev, { room: {topics: {$push: [node]}}});
                } else if (mutation === 'UPDATED') {
                    throw new Error('Update subscriptions are not supported for Topics');
                } else {
                    const topicIdx = findIndex(prev.room.topics, (tpc) => tpc.id === node.id);
                    if (topicIdx < 0) {
                        return prev;
                    }
                    return update(prev, { room: {topics: {
                        $splice: [[topicIdx, 1]]
                    }}});
                }

            });
        });
    }

    public trackTopic(index: number, topic: TopicFieldsFragment): number {
        return topic.id;
    }

    public trackComment(index: number, comment: CommentFieldsFragment): number {
        return comment.id;
    }

    public addTopic(): void {
        const dialogRef = this.dialog.open(AddTopicDialogComponent);
        dialogRef.afterClosed().subscribe((name: string) => {
            if (!name) {
                return;
            }

            const variables: AddTopicMutationVariables = { roomId: this.roomId, name };
            this.apollo.mutate({
                mutation: addTopicMutation,
                variables
            });
        });

    }

    public addComment(topicId: number): void {
        const variables: AddCommentMutationVariables = {topicId};
        this.apollo.mutate({
            mutation: addCommentMutation,
            variables
        });
    }

    public deleteTopic(topicId: number): void {
        const variables: DeleteTopicMutationVariables = { topicId };
        this.apollo.mutate({
            mutation: deleteTopicMutation,
            variables
        })
    }

}
