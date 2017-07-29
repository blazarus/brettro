import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-add-topic-dialog',
    templateUrl: './add-topic-dialog.component.html',
    styleUrls: ['./add-topic-dialog.component.css']
})
export class AddTopicDialogComponent implements OnInit {
    public newTopicName = '';

    constructor() { }

    ngOnInit() {
    }

}