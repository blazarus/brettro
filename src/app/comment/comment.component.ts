import { Component, OnInit, Input } from '@angular/core';
import { Comment } from '../app.component';
import { Apollo, ApolloQueryObservable } from 'apollo-angular';
import gql from 'graphql-tag';

const fetchComment = gql`
query Comment($commentId: Int!) {
    comment(commentId: $commentId) {
        id
        exposed
        value
    }
}
`;
const updateComment = gql`
mutation updateComment($commentId: Int!, $value: String) {
    updateComment(commentId: $commentId, value: $value) {
        id
        exposed
        value
    }
}
`;
const deleteComment = gql`
mutation deleteComment($commentId: Int!) {
    deleteComment(commentId: $commentId) {
        id
        name
        comments {
            id
            exposed
            value
        }
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
    @Input() comment: Comment;

    editValue = '';

    constructor(private apollo: Apollo) {}

    ngOnInit() {}

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
            variables: { commentId: this.comment.id }
        });
    }

}
