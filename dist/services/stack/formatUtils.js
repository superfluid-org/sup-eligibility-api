"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventTypeDisplay = void 0;
exports.formatEvents = formatEvents;
function formatEvents(events, pointSystemId) {
    if (!events.length) {
        return {
            identity: {
                address: '',
                ensName: null,
                farcasterUsername: null,
                lensHandle: null,
                farcasterPfpUrl: null
            },
            events: [],
            aggregates: []
        };
    }
    // Extract identity from first event
    const firstEvent = events[0];
    const identity = {
        address: firstEvent.associatedAccount,
        ensName: firstEvent.ensName,
        farcasterUsername: firstEvent.farcasterUsername,
        lensHandle: firstEvent.lensHandle,
        farcasterPfpUrl: firstEvent.farcasterPfpUrl
    };
    // Format events
    const formattedEvents = events.map(event => ({
        eventType: (0, exports.getEventTypeDisplay)(event.eventType),
        timestamp: event.eventTimestamp,
        points: event.points
    }));
    // Create aggregates by eventType
    const aggregateMap = new Map();
    events.forEach(event => {
        const eventType = (0, exports.getEventTypeDisplay)(event.eventType, pointSystemId);
        const existing = aggregateMap.get(eventType);
        if (existing) {
            existing.totalPoints += event.points;
            existing.count += 1;
            if (event.eventTimestamp < existing.firstTimestamp) {
                existing.firstTimestamp = event.eventTimestamp;
            }
            if (event.eventTimestamp > existing.lastTimestamp) {
                existing.lastTimestamp = event.eventTimestamp;
            }
        }
        else {
            aggregateMap.set(eventType, {
                eventType,
                totalPoints: event.points,
                count: 1,
                firstTimestamp: event.eventTimestamp,
                lastTimestamp: event.eventTimestamp
            });
        }
    });
    return {
        identity,
        events: formattedEvents,
        aggregates: Array.from(aggregateMap.values())
    };
}
const eventTypeAliases = {
    'csv_upload_2025-02-21T14:17:14.178Z': "POAPs",
    "nft_mint_8453_0xD03c97b668267f5F582cFc88D7826c5440610a7e": "Minted AstroBlock Spaceship",
    'ricDataPoints': "Used Ricochet",
    "fractionDataPoints": "FRACTION holder",
    "planet-ix-open-stream": "PlanetIX user",
    "universal_allocation": "Universal Allocation",
    "csv_upload_2025-02-18T13:18:02.455Z": "Ricochet Volume"
};
const farcasterAliases = {
    "18203": "Octant",
    "309165": "Giveth",
    "315653": "Superfluid",
    "340305": "AlfaFrens",
    "396793": "SuperBoring",
    "868887": "FlowStateCoop",
    "874347": "AstroBlock",
};
const getEventTypeDisplay = (eventType, pointSystemId) => {
    if (eventType.includes('farcaster_account_')) {
        return `Followed ${farcasterAliases[eventType.split('_')[2]]} on Farcaster`;
    }
    else if (eventType.includes('nft_mint_8453_0xE09cBb896373bB244CFC2BdaF59B3603A31014D0')) {
        return `Met Superfluid at ETHDenver`;
    }
    else if (eventType.includes('0xcd4e576ba1B74692dBc158c5F399269Ec4739577')) {
        return `Minted Ecosystem Rewards Pass`;
    }
    else if (eventType.includes('daily_points')) {
        console.log("point system id: ", pointSystemId);
        if (pointSystemId === 7585) {
            return `SuperBoring Daily Volume`;
        }
        else if (pointSystemId === 7584) {
            return `AlfaFrens Daily Volume`;
        }
    }
    else if (eventType.includes('octant_points')) {
        return `Donation Volume`;
    }
    return eventTypeAliases[eventType] || eventType;
};
exports.getEventTypeDisplay = getEventTypeDisplay;
//# sourceMappingURL=formatUtils.js.map