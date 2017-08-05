import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
    MdCardModule,
    MdButtonModule,
    MdIconModule,
    MdInputModule,
    MdDialogModule,
    MdSelectModule,
    MdOptionModule,
    MdProgressSpinnerModule,
    MdToolbarModule
} from '@angular/material';

import { AppComponent } from './app.component';

import { ApolloClient, toIdValue, createBatchingNetworkInterface } from 'apollo-client';
import { ApolloModule } from 'apollo-angular';
import { CommentComponent } from './comment/comment.component';
import { AddTopicDialogComponent } from './add-topic-dialog/add-topic-dialog.component';
import { RoomComponent } from './room/room.component';
import { SubscriptionClient, addGraphQLSubscriptions } from 'subscriptions-transport-ws';
import { LoadingComponent } from './loading/loading.component'

// Copied from apollo client source since it's not exposed
function defaultDataIdFromObject (result: any): string | null {
    if (result.__typename) {
        if (result.id !== undefined) {
            return `${result.__typename}:${result.id}`;
        }
        if (result._id !== undefined) {
            return `${result.__typename}:${result._id}`;
        }
    }
    return null;
}
const batchingNetworkInterface = createBatchingNetworkInterface({
    uri: '/graphql',
    batchInterval: 10,
    batchMax: 10,
});
const wsClient = new SubscriptionClient('ws://localhost:3010/subscriptions', {
    reconnect: true
});
wsClient.onDisconnected(() => {
    console.log('disconnected');
});
wsClient.onReconnected(() => {
    console.log('reconnect');
});
wsClient.onConnected(() => {
    console.log('on connect');
})

const networkInterfaceWithSubscriptions = addGraphQLSubscriptions(
    batchingNetworkInterface,
    wsClient
);

const client = new ApolloClient({
    networkInterface: networkInterfaceWithSubscriptions,
    customResolvers: {
        Query: {
            comment: (_, args) => toIdValue(defaultDataIdFromObject({ __typename: 'Comment', id: args.commentId }))
        }
    },
    dataIdFromObject: defaultDataIdFromObject
});

export function provideClient(): ApolloClient {
    return client;
}

@NgModule({
    declarations: [
        AppComponent,
        CommentComponent,
        AddTopicDialogComponent,
        RoomComponent,
        LoadingComponent
    ],
    imports: [
        BrowserModule,
        HttpModule,
        FormsModule,
        ReactiveFormsModule,
        ApolloModule.forRoot(provideClient),
        BrowserAnimationsModule,
        MdCardModule,
        MdButtonModule,
        MdIconModule,
        MdInputModule,
        MdDialogModule,
        MdSelectModule,
        MdOptionModule,
        MdProgressSpinnerModule,
        MdToolbarModule
    ],
    entryComponents: [
        AddTopicDialogComponent
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
