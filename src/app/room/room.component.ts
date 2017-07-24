import { Component, OnInit, OnChanges, SimpleChanges, Input, ChangeDetectorRef } from '@angular/core';
import { commentFragment } from '../app.component';
import {
    AddCommentMutation,
    AddTopicMutation,
    RoomQuery,
    RoomFieldsFragment,
    TopicFieldsFragment,
    CommentFieldsFragment,
    MySubSubscription,
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

// interface RoomQuery {
//     room: Room;
//     loading: boolean;
// }
// interface AddCommentMutationResponse {
//     data: {
//         addComment: Comment
//     };
// }
// interface AddTopicMutationResult {
//     data: {
//         addTopic: Topic
//     }
// }
// interface DeleteTopicMutationResponse {
//     data: {}
// }

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

const addCommentSubscription = gql`
subscription mySub {
    Comment {
        mutation
        node {
            ...commentFields
        }
    }
}
${commentFragment}
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
        this.apollo.subscribe({
            query: addCommentSubscription
        })
            .subscribe(({Comment: {node, mutation}}: MySubSubscription) => {
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

            const roomId = this.roomId;
            this.apollo.mutate({
                mutation: addTopicMutation,
                variables: { roomId, name },
                update(proxy, { data: { addTopic }}: { data: AddTopicMutation }) {
                    const id = `Room:${roomId}`;
                    const oldRes: RoomFieldsFragment = proxy.readFragment<RoomFieldsFragment>({
                        fragment: roomFragment,
                        fragmentName: 'roomFields',
                        id
                    });
                    if (!oldRes) {
                        // Could have been deleted
                        return;
                    }
                    oldRes.topics.push(addTopic);
                    proxy.writeFragment({
                        fragment: roomFragment,
                        fragmentName: 'roomFields',
                        id,
                        data: oldRes
                    });
                }
            });
        });

    }

    public addComment(topicId: number): void {
        this.apollo.mutate({
            mutation: addCommentMutation,
            variables: { topicId }
        });
    }

    public deleteTopic(topicId: number): void {
        const roomId = this.roomId;
        this.apollo.mutate({
            mutation: deleteTopicMutation,
            variables: { topicId },
            update(proxy) {
                const id = `Room:${roomId}`;
                const oldRes: RoomFieldsFragment = proxy.readFragment<RoomFieldsFragment>({
                    fragment: roomFragment,
                    fragmentName: 'roomFields',
                    id
                });
                if (!oldRes) {
                    // Could have been deleted
                    return;
                }
                const idx = findIndex(oldRes.topics, (topic) => topic.id === topicId);
                oldRes.topics.splice(idx, 1);
                proxy.writeFragment({
                    fragment: roomFragment,
                    fragmentName: 'roomFields',
                    id,
                    data: oldRes
                });
            }
        })
    }

}
