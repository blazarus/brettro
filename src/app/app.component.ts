import { Component, OnInit } from '@angular/core';
import { Apollo, ApolloQueryObservable } from 'apollo-angular';
import gql from 'graphql-tag';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/toPromise';
import {
    AllRoomsQuery,
    RoomFieldsFragment
} from '../generated/query-types';

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

@Component({
    selector: 'app-root',
    styleUrls: [],
    templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit {
    title = 'Brettro';
    selectedRoomId: number;
    queryResult: ApolloQueryObservable<AllRoomsQuery>;
    roomsObs: Observable<[RoomFieldsFragment]>;

    constructor(private apollo: Apollo) {}

    public ngOnInit() {
        this.queryResult = this.apollo.watchQuery<AllRoomsQuery>({
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
