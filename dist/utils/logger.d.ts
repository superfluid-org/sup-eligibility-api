import winston from 'winston';
interface ExtendedLogger extends winston.Logger {
    slackNotify: (message: string, level?: string) => Promise<void>;
    discordNotify: (message: string, level?: string) => Promise<void>;
}
declare const _default: ExtendedLogger;
export default _default;
