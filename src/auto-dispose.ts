import { isFunction } from 'lodash';
import { Subscription } from 'rxjs/Subscription';

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

declare module 'rxjs/Subscription' {
    // tslint:disable-next-line: no-shadowed-variable
    interface Subscription {
        autoDispose: (target: ComponentClass) => Subscription
    }
}

const autoDisposeSubs = Symbol('autoDisposeSubs');
Subscription.prototype.autoDispose = function(target: ComponentClass) {
    if (!target[autoDisposeSubs]) {
        // set up ngOnDestroy
        target[autoDisposeSubs] = []; // XXX can I make this typesafe somehow?
        const origOnDestroy = target.ngOnDestroy;

        target.ngOnDestroy = function() {
            disposeAllSubs(target);
            if (isFunction(origOnDestroy)) {
                origOnDestroy.call(this);
            }
        }
    }
    target[autoDisposeSubs].push(this);
    return this;
}

function disposeAllSubs(target: object) {
    for (const sub of target[autoDisposeSubs]) {
        sub.unsubscribe();
    }
}