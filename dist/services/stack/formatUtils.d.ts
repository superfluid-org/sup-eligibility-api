interface StackEvent {
    eventType: string;
    associatedAccount: string;
    eventTimestamp: string;
    points: number;
    eventData: {
        uniqueId: string;
        blockNumber: string;
        contractEventFunctionId: number;
    };
    ensName: string | null;
    farcasterUsername: string | null;
    lensHandle: string | null;
    farcasterPfpUrl: string | null;
}
interface FormattedIdentity {
    address: string;
    ensName: string | null;
    farcasterUsername: string | null;
    lensHandle: string | null;
    farcasterPfpUrl: string | null;
}
interface FormattedEvent {
    eventType: string;
    timestamp: string;
    points: number;
}
interface EventTypeAggregate {
    eventType: string;
    totalPoints: number;
    count: number;
    firstTimestamp: string;
    lastTimestamp: string;
}
export interface FormattedStackEvents {
    identity: FormattedIdentity;
    events: FormattedEvent[];
    aggregates: EventTypeAggregate[];
}
export declare function formatEvents(events: StackEvent[], pointSystemId?: number): FormattedStackEvents;
export declare const getEventTypeDisplay: (eventType: string, pointSystemId?: number) => string;
export {};
