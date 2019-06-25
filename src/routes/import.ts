/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes
 * @description Import
 */

import { AddGroupRoute } from './account/add-group';
import { AdminEditRoute } from './account/admin-edit';
import { ChangePasswordRoute } from './account/change-password';
import { AccountDeactivateRoute } from './account/deactivate';
import { FetchAccountRoute } from './account/fetch';
import { RegisterRoute } from './account/register';
import { RemoveGroupRoute } from './account/remove-group';
import { SelfEditRoute } from './account/self-edit';
import { SingleAccountRoute } from './account/single';
import { CreateApplicationRoute } from './application/create';
import { FetchApplicationRoute } from './application/fetch';
import { SingleApplicationRoute } from './application/single';
import { UpdateApplicationRoute } from './application/update';
import { CreateGroupRoute } from './group/create';
import { FetchGroupRoute } from './group/fetch';
import { OrganizationCreateRoute } from './organization/create';
import { OrganizationDeactivateRoute } from './organization/deactivate';
import { OrganizationFetchRoute } from './organization/fetch';
import { OrganizationInplodeRoute } from './organization/inplode';
import { OrganizationRegisterRoute } from './organization/register';
import { GlobalPreferenceRoute } from './preference/global';
import { InfosPreferenceRoute } from './preference/infos';
import { ReadPreferenceRoute } from './preference/read';

export const MintRoutes = [

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
    new RemoveGroupRoute(),
    new FetchAccountRoute(),
    new RegisterRoute(),
    new SelfEditRoute(),
    new ChangePasswordRoute(),
    new AdminEditRoute(),
    new SingleAccountRoute(),
    new AccountDeactivateRoute(),

    // Preference
    new GlobalPreferenceRoute(),
    new ReadPreferenceRoute(),
    new InfosPreferenceRoute(),

    // Organization
    new OrganizationCreateRoute(),
    new OrganizationInplodeRoute(),
    new OrganizationFetchRoute(),
    new OrganizationRegisterRoute(),
    new OrganizationDeactivateRoute(),
];
