import { Component, OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef } from '@angular/core';
import { commentFragment } from '../app.component';
import {
    addCommentMutation,
    addCommentMutationVariables,
    addTopicMutation,
    addTopicMutationVariables,
    deleteTopicMutationVariables,
    RoomQuery,
    roomFieldsFragment,
    topicFieldsFragment,
    commentFieldsFragment,
    commentSubscriptionSubscription,
    topicSubscriptionSubscription,
    _ModelMutationType
} from '../../generated/query-types';
import { Apollo, ApolloQueryObservable } from 'apollo-angular';
import { ApolloQueryResult } from 'apollo-client';
import gql from 'graphql-tag';
import { find, findIndex } from 'lodash';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { MdDialog } from '@angular/material';
import { AddTopicDialogComponent } from '../add-topic-dialog/add-topic-dialog.component';
import update from 'immutability-helper';
import { autoDispose } from '../../auto-dispose';

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
export class RoomComponent implements OnInit {

    @Input() private roomId: BehaviorSubject<number>;

    roomObs: Observable<roomFieldsFragment>;
    roomQuery: ApolloQueryObservable<RoomQuery>;
    @autoDispose
    private roomSub: Subscription;
    @autoDispose
    private commentSubscriptionSub: Subscription;
    @autoDispose
    private topicSubscriptionSub: Subscription;

    constructor(private apollo: Apollo, private dialog: MdDialog, private cdr: ChangeDetectorRef) {}

    ngOnInit() {
        this.roomQuery = this.apollo.watchQuery<RoomQuery>({
            query: roomQuery,
            variables: { roomId: this.roomId },
            notifyOnNetworkStatusChange: true
        });

        this.setupCommentSubscription();
        this.setupTopicSubscription();

        this.roomObs = this.roomQuery.map(({data: {room}}) => room);
        this.roomSub = this.roomObs.subscribe((room) => {
            // For some reason I need this for the update Comment subscription to actually get reflected in the UI immediately.
            // Seems like something in apollo must be happening asyncronously and not triggering change detection
            setTimeout(() => {
                this.cdr.detectChanges();
            }, 0);
        });
    }

    private setupCommentSubscription() {
        this.commentSubscriptionSub = this.apollo.subscribe({
            query: commentSubscription
        }).subscribe(({Comment: {node, mutation}}: commentSubscriptionSubscription) => {
            this.roomQuery.updateQuery((prev: RoomQuery): RoomQuery => {
                const topicId = node.topic.id;
                const topicIdx = findIndex(prev.room.topics, (top: topicFieldsFragment) => top.id === topicId);
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
        this.topicSubscriptionSub = this.apollo.subscribe({
            query: topicSubscription
        }).subscribe((data: topicSubscriptionSubscription) => {
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

    public trackTopic(index: number, topic: topicFieldsFragment): number {
        return topic.id;
    }

    public trackComment(index: number, comment: commentFieldsFragment): number {
        return comment.id;
    }

    public addTopic(): void {
        const dialogRef = this.dialog.open(AddTopicDialogComponent);
        dialogRef.afterClosed().subscribe((name: string) => {
            if (!name) {
                return;
            }

            this.roomId.subscribe((roomId: number) => {
                this.apollo.mutate({
                    mutation: addTopicMutation,
                    variables: <addTopicMutationVariables>{ roomId, name }
                });
            })

        });

    }

    public addComment(topicId: number): void {
        const variables: addCommentMutationVariables = {topicId};
        this.apollo.mutate({
            mutation: addCommentMutation,
            variables
        });
    }

    public deleteTopic(topicId: number): void {
        const variables: deleteTopicMutationVariables = { topicId };
        this.apollo.mutate({
            mutation: deleteTopicMutation,
            variables
        })
    }

}
