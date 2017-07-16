import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Apollo, ApolloQueryObservable } from 'apollo-angular';
import { ApolloError } from 'apollo-client';
import gql from 'graphql-tag';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';

const allRoomsQuery = gql`
query AllRooms {
    rooms {
        id
        title
    }
}
`;

export const commentFragment = gql`
fragment commentFields on Comment {
    id
    exposed
    value
    topic {
        id
    }
}
`;

export class Room {
    id: number;
    title: string;
    topics?: [Topic];
}
export class Topic {
    id: number;
    name: string;
    comments: [Comment];
}
export class Comment {
    id: number;
    exposed: boolean;
    value: string;
    topic: {
        id: number
    }
}
interface AllRoomsQueryResponse {
    rooms: [Room];
}

@Component({
    selector: 'app-root',
    styleUrls: [],
    templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit {
    title = 'Brettro';
    selectedRoomId: number;
    queryResult: ApolloQueryObservable<AllRoomsQueryResponse>;
    roomsObs: Observable<[Room]>;

    constructor(private apollo: Apollo) {}

    public ngOnInit() {
        this.queryResult = this.apollo.watchQuery<AllRoomsQueryResponse>({
            query: allRoomsQuery
        });
        // XXX probably need to be cleaning up in onDestroy
        this.roomsObs = this.queryResult.map(({data: {rooms}}) => rooms);
        this.roomsObs.subscribe((rooms) => {
            // assume there is at least one room for now
            this.selectedRoomId = rooms[0].id;
        });
    }

};
