interface PointSystem {
    id: number;
    name: string;
    gdaPoolAddress: string;
    flowrate: bigint;
    totalUnits: number;
}
export declare function getStackApiKey(pointSystemId: number): string;
declare const config: {
    port: string | number;
    nodeEnv: string;
    apiBaseUrl: string;
    baseRpcUrl: string;
    slackWebhookUrl: string;
    stackApiBaseUrl: string;
    GDAForwarder: string;
    lockerFactoryAddress: string;
    LOCKER_GRAPH_URL: string;
    pointSystems: PointSystem[];
    POINT_THRESHOLD: number;
    POINTS_TO_ASSIGN: number;
    COMMUNITY_ACTIVATION_ID: number;
    THRESHOLD_TIME_PERIOD: number;
    THRESHOLD_MAX_USERS: number;
    STACK_EVENT_ADD_POINTS_URL: string;
    adminApiKey: string;
    defaultRateLimit: {
        requestsPerMinute: number;
        requestsPerHour: number;
    };
};
export default config;
