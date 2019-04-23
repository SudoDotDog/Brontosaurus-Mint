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
import { AddGroupRoute } from './routes/red/account/add-group';
import { AdminEditRoute } from './routes/red/account/admin-edit';
import { ChangePasswordRoute } from './routes/red/account/change-password';
import { FetchAccountRoute } from './routes/red/account/fetch';
import { RegisterRoute } from './routes/red/account/register';
import { SelfEditRoute } from './routes/red/account/self-edit';
import { SingleAccountRoute } from './routes/red/account/single';
import { CreateApplicationRoute } from './routes/red/application/create';
import { FetchApplicationRoute } from './routes/red/application/fetch';
import { SingleApplicationRoute } from './routes/red/application/single';
import { UpdateApplicationRoute } from './routes/red/application/update';
import { CreateGroupRoute } from './routes/red/group/create';
import { FetchGroupRoute } from './routes/red/group/fetch';
import { GlobalPreferenceRoute } from './routes/red/preference/global';
import { InfosPreferenceRoute } from './routes/red/preference/infos';
import { ReadPreferenceRoute } from './routes/red/preference/read';
import { BrontosaurusConfig, isDevelopment, readConfigEnvironment } from './util/conf';
import { registerConnor } from './util/error';

const setting: SudooExpressApplication = SudooExpressApplication.create('Brontosaurus-Mint', '1');

if (isDevelopment()) {
    setting.allowCrossOrigin();
    SudooLog.global.level(LOG_LEVEL.VERBOSE);
} else {
    SudooLog.global.level(LOG_LEVEL.INFO);
}

const app: SudooExpress = SudooExpress.create(setting);

const config: BrontosaurusConfig = readConfigEnvironment();

registerConnor();

const db: Mongoose.Connection = connect(config.database);

db.on('error', console.log.bind(console, 'connection error:'));

// Static
app.static(Path.join(__dirname, '..', 'public', 'red'));

// Red
app.routes(

    // Application
    new CreateApplicationRoute(),
    new FetchApplicationRoute(),
    new SingleApplicationRoute(),
    new UpdateApplicationRoute(),

    // Group
    new CreateGroupRoute(),
    new FetchGroupRoute(),

    // Account
    new AddGroupRoute(),
    new FetchAccountRoute(),
    new RegisterRoute(),
    new SelfEditRoute(),
    new ChangePasswordRoute(),
    new AdminEditRoute(),
    new SingleAccountRoute(),

    // Preference
    new GlobalPreferenceRoute(),
    new ReadPreferenceRoute(),
    new InfosPreferenceRoute(),
);

app.host(9000);
SudooLog.global.critical('Started at :9000');
