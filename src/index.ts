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
import { AddGroupRoute } from './routes/account/add-group';
import { AdminEditRoute } from './routes/account/admin-edit';
import { ChangePasswordRoute } from './routes/account/change-password';
import { FetchAccountRoute } from './routes/account/fetch';
import { RegisterRoute } from './routes/account/register';
import { SelfEditRoute } from './routes/account/self-edit';
import { SingleAccountRoute } from './routes/account/single';
import { CreateApplicationRoute } from './routes/application/create';
import { FetchApplicationRoute } from './routes/application/fetch';
import { SingleApplicationRoute } from './routes/application/single';
import { UpdateApplicationRoute } from './routes/application/update';
import { CreateGroupRoute } from './routes/group/create';
import { FetchGroupRoute } from './routes/group/fetch';
import { GlobalPreferenceRoute } from './routes/preference/global';
import { InfosPreferenceRoute } from './routes/preference/infos';
import { ReadPreferenceRoute } from './routes/preference/read';
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
