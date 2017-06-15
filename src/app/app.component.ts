import { Component, OnInit } from '@angular/core';

import { Apollo, ApolloQueryObservable } from 'apollo-angular';
import gql from 'graphql-tag';

import { find } from 'lodash';

import { Observable } from 'rxjs/observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';

const query = gql`
query Comments {
    topics {
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

const addComment = gql`
mutation addComment($topicId: Int!) {
    addComment(topicId: $topicId) {
        id
        exposed
        value
    }
}
`;

class Topic {
    id: number;
    name: string;
    comments: [Comment];
}
export class Comment {
    id: number;
    exposed: boolean;
    value: string;
}
interface QueryResponse {
  topics: [Topic];
  loading: boolean;
}
interface AddCommentMutationResponse {
    data: {
        addComment: Comment
    };
}

@Component({
    selector: 'app-root',
    styles: [`
        .topic-column {
            width: 300px;
            float: left;
            padding: 10px;
        }
    `],
    templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit {
    title = 'Brettro';
    data: Observable<[Topic]>;
    error: boolean;

    constructor(private apollo: Apollo) {}

    public ngOnInit() {
        this.data = this.apollo.watchQuery<QueryResponse>({ query })
            .map(({data}) => data.topics);
    }

    public trackTopic(index: number, topic: Topic): number {
        return topic.id;
    }

    public trackComment(index: number, comment: Comment): number {
        return comment.id;
    }

    public addComment(topicId: number): void {
        this.apollo.mutate({
            mutation: addComment,
            variables: { topicId },
            updateQueries: {
                Comments(prev, { mutationResult }): object {
                    const res = <AddCommentMutationResponse> mutationResult;
                    const prevRes = <QueryResponse> prev;

                    if (!res.data) { return prev };

                    const topic: Topic = find(prevRes.topics, (top) => top.id === topicId);
                    topic.comments.push(res.data.addComment);

                    return prev;
                }
            }
        });
    }
};
