import { Component, OnInit, Input } from '@angular/core';
import { commentFragment } from '../app.component';
import {
    CommentQuery,
    commentFieldsFragment,
    deleteCommentMutationVariables,
    updateCommentMutationVariables
} from '../../generated/query-types';
import { Apollo } from 'apollo-angular';
import gql from 'graphql-tag';
import { Subscription } from 'rxjs/Rx';
import { autoDispose } from '../../auto-dispose';

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
    @Input() comment: commentFieldsFragment;

    @autoDispose
    private commentQuerySub: Subscription;
    @autoDispose
    private saveCommentSub: Subscription;

    editValue = '';

    constructor(private apollo: Apollo) {}

    ngOnInit() {
        // TODO just to show that a custom resolver should allow this to come from the cache
        this.commentQuerySub = this.apollo.watchQuery<CommentQuery>({
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
        const variables: updateCommentMutationVariables = { commentId: this.comment.id, value: this.editValue };
        this.saveCommentSub = this.apollo.mutate({
            mutation: updateComment,
            variables
        })
            .subscribe(() => {
                this.isEditing = false;
            });
    }

    public deleteComment(): void {
        const variables: deleteCommentMutationVariables = { commentId: this.comment.id };
        this.apollo.mutate({
            mutation: deleteComment,
            variables
        });
    }

}
