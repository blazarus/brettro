import { OnDestroy } from '@angular/core';
import { isFunction } from 'lodash';

const disposalList = Symbol('disposalList');

// We expect this decorator to be used on a component class which may or may not define it's own ngOnDestroy method
interface ComponentClass {
    ngOnDestroy?: () => void
}

export function autoDispose(target: ComponentClass, propertyKey: string): void {
    if (!target[disposalList]) {
        // Set up disposal list and modify wrap the original ngOnDestroy (if it exists) to call dispose
        target[disposalList] = [];
        const origOnDestroy = target.ngOnDestroy;

        target.ngOnDestroy = function() {
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

