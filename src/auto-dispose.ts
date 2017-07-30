import { OnDestroy } from '@angular/core';
import { isFunction } from 'lodash';

const disposalList: symbol = Symbol('disposalList');

export function autoDispose(target: object, propertyKey: string): void {
    if (!target[disposalList]) {
        // Set up disposal list and modify wrap the original ngOnDestroy (if it exists) to call dispose
        target[disposalList] = [];
        const origOnDestroy = (<OnDestroy>target).ngOnDestroy;
        // XXX Not sure if this is the "correct" way to do this in typescript
        (<OnDestroy>target).ngOnDestroy = function() {
            console.log('here');
            disposeContext(this);
            if (isFunction(origOnDestroy)) {
                origOnDestroy.call(this);
            }
        }
    }

    target[disposalList].push(propertyKey);
}

function disposeContext(target: object) {
    for (const prop of target[disposalList]) {
        const val = target[prop];
        if (val && isFunction(val.unsubscribe)) {
            val.unsubscribe();
        }
    }
}