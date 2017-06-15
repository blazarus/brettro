import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MdCardModule, MdButtonModule, MdIconModule, MdInputModule } from '@angular/material';

import { AppComponent } from './app.component';

import { ApolloClient } from 'apollo-client';
import { ApolloModule } from 'apollo-angular';
import { CommentComponent } from './comment/comment.component';

const client = new ApolloClient();

export function provideClient(): ApolloClient {
    return client;
}

@NgModule({
    declarations: [
        AppComponent,
        CommentComponent,
    ],
    imports: [
        BrowserModule,
        HttpModule,
        FormsModule,
        ApolloModule.forRoot(provideClient),
        BrowserAnimationsModule,
        MdCardModule,
        MdButtonModule,
        MdIconModule,
        MdInputModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
