/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint
 * @description Index
 */

import { connect } from '@brontosaurus/db';
import { SudooExpress, SudooExpressApplication } from '@sudoo/express';
import { LOG_LEVEL, SudooLog } from '@sudoo/log';
import * as Mongoose from "mongoose";
import * as Path from 'path';
import { FlatRoutes } from './flat/import';
import { createReplacementHandler } from './handlers/public';
import { MintRoutes } from './routes/import';
import { BrontosaurusConfig, getEnvGettingText, isDevelopment, readConfigEnvironment } from './util/conf';

const setting: SudooExpressApplication = SudooExpressApplication.create('Brontosaurus-Mint', '1');

if (isDevelopment()) {
    setting.allowCrossOrigin();
    SudooLog.global.level(LOG_LEVEL.VERBOSE);
} else {
    SudooLog.global.level(LOG_LEVEL.INFO);
}

const app: SudooExpress = SudooExpress.create(setting);

const config: BrontosaurusConfig = readConfigEnvironment();

const db: Mongoose.Connection = connect(config.database);

db.on('error', console.log.bind(console, 'connection error:'));

// Static
app.express.get(['/', '/index.html'], createReplacementHandler('<!-- Insertion Point -->', getEnvGettingText()));
app.static(Path.join(__dirname, '..', 'public', 'red'));

// Health
app.health('/health');

// Mint
app.routeList(MintRoutes);
app.routeList(FlatRoutes);

app.host(9000);
SudooLog.global.info('Hosting at port 9000');
