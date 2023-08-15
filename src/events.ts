import { EventDispatcher } from 'EventDispatcher';

const eventTypes = ['reload'];
export const eventDispatcher = new EventDispatcher({ validEventTypes: eventTypes });
