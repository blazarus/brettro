import { Component, OnInit, Input } from '@angular/core';
import { ApolloQueryObservable } from 'apollo-angular';
import { ApolloError } from 'apollo-client';

@Component({
    selector: 'app-loading',
    templateUrl: './loading.component.html',
    styleUrls: ['./loading.component.css']
})
export class LoadingComponent implements OnInit {

    @Input() queryResult: ApolloQueryObservable<any>;
    loading = true;
    error: ApolloError;

    constructor() { }

    ngOnInit() {
        this.queryResult.subscribe({
            next: ({loading}) => {
                // Note: loading isn't updating after initial load is done, even when
                // notifyOnNetworkStatusChange is set to true in the query
                this.loading = loading;
            },
            error: (err: ApolloError) => {
                this.error = err;
            }
        });
    }

}
