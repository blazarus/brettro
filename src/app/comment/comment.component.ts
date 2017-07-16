import { Component, OnInit, Input } from '@angular/core';
import { Comment, Topic, commentFragment } from '../app.component';
import { topicFragment } from '../room/room.component';
import { Apollo, ApolloQueryObservable } from 'apollo-angular';
import gql from 'graphql-tag';
import { findIndex } from 'lodash';

const fetchComment = gql`
query Comment($commentId: Int!) {
    comment(commentId: $commentId) {
        ...commentFields
    }
}
${commentFragment}
`;

const updateComment = gql`
mutation updateComment($commentId: Int!, $value: String) {
    updateComment(commentId: $commentId, value: $value) {
        ...commentFields
    }
}
${commentFragment}
`;

const deleteComment = gql`
mutation deleteComment($commentId: Int!) {
    deleteComment(commentId: $commentId) {
        id
    }
}
`;

interface CommentQueryResponse {
    comment: Comment;
    loading: boolean;
}

@Component({
    selector: 'app-comment',
    templateUrl: './comment.component.html',
    styleUrls: ['./comment.component.css']
})
export class CommentComponent implements OnInit {

    isEditing = false;
    @Input() comment: Comment;

    editValue = '';

    constructor(private apollo: Apollo) {}

    ngOnInit() {
        // TODO just to show that a custom resolver should allow this to come from the cache
        this.apollo.watchQuery<CommentQueryResponse>({
            query: fetchComment,
            variables: {
                commentId: this.comment.id
            }
        })
            .subscribe(() => {
                // Not doing anything with this right now, but could instead allow the parent to only pass the comment id and not care
                // about what data is needed in the comment itself
            });
    }

    public startEdit(): void {
        this.isEditing = true;

        // Copy the value from the backend to the edit model
        this.editValue = this.comment.value;
    }

    public cancelEdit(): void {
        this.isEditing = false;
    }

    public saveComment(): void {
        console.log('saving comment', this.editValue);
        this.apollo.mutate({
            mutation: updateComment,
            variables: { commentId: this.comment.id, value: this.editValue }
        })
            .toPromise()
            .then(() => {
                this.isEditing = false;
            });
    }

    // XXX right now we're keeping things up to date because this query refetches the entire Topic, which will not scale well
    public deleteComment(): void {
        this.apollo.mutate({
            mutation: deleteComment,
            variables: { commentId: this.comment.id },
            update: (proxy) => {
                const id = `Topic:${this.comment.topic.id}`;
                const oldRes: Topic = proxy.readFragment<Topic>({
                    fragment: topicFragment,
                    fragmentName: 'topicFields',
                    id
                });
                if (!oldRes) {
                    // Could have been deleted
                    return;
                }
                const idx = findIndex(oldRes.comments, (comment) => comment.id === this.comment.id);
                oldRes.comments.splice(idx, 1);
                proxy.writeFragment({
                    fragment: topicFragment,
                    fragmentName: 'topicFields',
                    id,
                    data: oldRes
                });
            }
        });
    }

}
