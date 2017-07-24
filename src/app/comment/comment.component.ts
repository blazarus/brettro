import { Component, OnInit, Input } from '@angular/core';
import { commentFragment } from '../app.component';
import {
    CommentQuery,
    CommentFieldsFragment,
    TopicFieldsFragment
} from '../../generated/query-types';
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

@Component({
    selector: 'app-comment',
    templateUrl: './comment.component.html',
    styleUrls: ['./comment.component.css']
})
export class CommentComponent implements OnInit {

    isEditing = false;
    @Input() comment: CommentFieldsFragment;

    editValue = '';

    constructor(private apollo: Apollo) {}

    ngOnInit() {
        // TODO just to show that a custom resolver should allow this to come from the cache
        this.apollo.watchQuery<CommentQuery>({
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

    public deleteComment(): void {
        this.apollo.mutate({
            mutation: deleteComment,
            variables: { commentId: this.comment.id }
        });
    }

}
