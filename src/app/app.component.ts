import 'reflect-metadata';
import { Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Apollo } from 'apollo-angular';
import { ApolloQueryResult } from 'apollo-client';
import gql from 'graphql-tag';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/publishReplay';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import {
    AllRoomsQuery
} from '../generated/query-types';
import { autoDispose } from '../auto-dispose';

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
    styleUrls: ['./app.component.css'],
    templateUrl: 'app.component.html'
})
export class AppComponent implements OnInit {
    title = 'Brettro';
    selectedRoomId = new BehaviorSubject<number>(-1);
    queryResult: Observable<ApolloQueryResult<AllRoomsQuery>>;
    roomsObs: Observable<{id: number, title: string}[]>;
    selectedRmCtrl = new FormControl();
    @autoDispose
    private roomsQuerySub: Subscription;
    @autoDispose
    private selectedRoomSub: Subscription;

    constructor(private apollo: Apollo) {
    }

    public ngOnInit() {
        const result = this.apollo.watchQuery<AllRoomsQuery>({
            query: allRoomsQuery
        });
        this.queryResult = result.publishReplay(1).refCount();

        this.roomsObs = this.queryResult.map(({data: {rooms}}) => rooms);
        this.selectedRoomSub = this.selectedRmCtrl.valueChanges.subscribe(this.selectedRoomId);

        // Use first so later updates to the query can't change the selected room
        this.roomsQuerySub = this.roomsObs.first().subscribe((rooms) => {
            // assume there is at least one room for now
            this.selectedRmCtrl.setValue(rooms[0].id);
        });
    }

};
