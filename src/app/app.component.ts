import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Apollo, ApolloQueryObservable } from 'apollo-angular';
import { ApolloQueryResult } from 'apollo-client';
import gql from 'graphql-tag';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/publishReplay';
import { Observable, Subscription, BehaviorSubject } from 'rxjs/Rx';
import {
    AllRoomsQuery
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
export class AppComponent implements OnInit, OnDestroy {
    title = 'Brettro';
    selectedRoomId = new BehaviorSubject<number>(-1);
    queryResult: Observable<ApolloQueryResult<AllRoomsQuery>>;
    roomsObs: Observable<{id: number, title: string}[]>;
    selectedRmCtrl = new FormControl();
    private subscription: Subscription;

    constructor(private apollo: Apollo) {}

    public ngOnInit() {
        const result = this.apollo.watchQuery<AllRoomsQuery>({
            query: allRoomsQuery
        });
        this.queryResult = result.publishReplay(1).refCount();

        this.roomsObs = this.queryResult.map(({data: {rooms}}) => rooms);
        this.selectedRmCtrl.valueChanges.subscribe(this.selectedRoomId);

        // Use first so later updates to the query can't change the selected room
        this.subscription = this.roomsObs.first().subscribe((rooms) => {
            // assume there is at least one room for now
            this.selectedRmCtrl.setValue(rooms[0].id);
        });
    }

    public ngOnDestroy() {
        this.subscription.unsubscribe();
    }

};
