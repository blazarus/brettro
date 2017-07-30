import { Component, OnInit, Input } from '@angular/core';
import { ApolloQueryObservable } from 'apollo-angular';
import { ApolloError } from 'apollo-client';
import { Subscription } from 'rxjs/Subscription';
import { autoDispose } from '../../auto-dispose';

// Component to consistently display loading and error states.
// This subscribes to the passed in query observable, so in order to avoid executing the query
// twice you should probably make sure to multicast it.

@Component({
    selector: 'app-loading',
    templateUrl: './loading.component.html',
    styleUrls: ['./loading.component.css']
})
export class LoadingComponent implements OnInit {

    // XXX if this has been multicast, it will just be a normal Observable
    @Input() queryResult: ApolloQueryObservable<any>;
    loading = true;
    error: ApolloError;
    @autoDispose
    subscription: Subscription;

    constructor() { }

    public ngOnInit() {
        this.subscription = this.queryResult.subscribe({
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
