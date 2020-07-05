/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint
 * @description Index
 */

import { connect } from '@brontosaurus/db';
import { SudooExpress, SudooExpressApplication } from '@sudoo/express';
import { LOG_LEVEL, SudooLog } from '@sudoo/log';
import * as Path from 'path';
import { FlatRoutes } from './flat/import';
import { createReplacementHandler } from './handlers/public';
import { MintRoutes } from './routes/import';
import { BrontosaurusConfig, getEnvGettingText, hostPort, isDevelopment, readConfigEnvironment, staticMaxAge } from './util/conf';
import { getVersion } from './util/version';

const setting: SudooExpressApplication = SudooExpressApplication.create(
    'Brontosaurus-Mint',
    getVersion(),
);

if (isDevelopment()) {
    setting.allowCrossOrigin();
    SudooLog.global.level(LOG_LEVEL.VERBOSE);
    SudooLog.global.showTime();
} else {
    SudooLog.global.level(LOG_LEVEL.INFO);
}

setting.useBodyParser();
const app: SudooExpress = SudooExpress.create(setting);

const config: BrontosaurusConfig = readConfigEnvironment();

connect(config.database, {
    connected: true,
    disconnected: true,
    error: true,
    reconnected: true,
    reconnectedFailed: true,
});

// Static
app.express.get(['/', '/index.html'], createReplacementHandler('<!-- Insertion Point -->', getEnvGettingText()));

app.expressStatic(Path.join(__dirname, '..', 'public', 'red'), {
    immutable: true,
    maxAge: staticMaxAge,
});

// Health
app.health('/health');

// Mint
app.routeList(MintRoutes);
app.routeList(FlatRoutes);

app.host(hostPort);
SudooLog.global.info('Hosting at port 9000');
