/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Util
 * @description Conf
 */

import { TimeBuilder } from "@sudoo/magic";
import * as Fs from 'fs';
import * as Path from 'path';

export const pageLimit: number = 20;
export const hostPort: number = 9000;
export const staticMaxAge: number = TimeBuilder.from({
    hour: 10,
}).inMilliseconds();

export type BrontosaurusConfig = {

    readonly database: string;
};

export const readConfigSync = (): BrontosaurusConfig => {

    try {

        const configPath: string = Path.join(__dirname, '..', '..', 'brontosaurus.conf');
        return JSON.parse(Fs.readFileSync(configPath, 'utf8'));
    } catch (err) {

        console.log('Config file not exist');
        process.exit();
    }

    throw new Error('Never');
};

export const readConfigEnvironment = (): BrontosaurusConfig => {

    const database: string | undefined = process.env.BRONTOSAURUS_DB || process.env.BRONTOSAURUS_DATABASE;

    if (database) {
        return {
            database,
        };
    }

    console.log('Environment variable not found');
    process.exit();

    throw new Error('Never');
};

export const getEnvGettingText = (): string => {

    return `<script>if(!window.env){window.env={}};window.env.PORTAL_PATH="${process.env.PORTAL_PATH}"</script>`;
};

export const isDevelopment = (): boolean => process.env.NODE_ENV === 'development';
