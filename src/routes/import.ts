/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes
 * @description Import
 */

import { AddGroupRoute } from './account/add-group';
import { AdminEditRoute } from './account/admin-edit';
import { ChangePasswordRoute } from './account/change-password';
import { AccountDeactivateRoute } from './account/deactivate';
import { EnableTwoFARoute } from './account/enable-two-fa';
import { FetchAccountRoute } from './account/fetch';
import { AccountLimboRoute } from './account/limbo';
import { RegisterRoute } from './account/register';
import { RemoveGroupRoute } from './account/remove-group';
import { RemoveTwoFARoute } from './account/remove-two-fa';
import { ResetAttemptRoute } from './account/reset-attempt';
import { SelfEditRoute } from './account/self-edit';
import { SingleAccountRoute } from './account/single';
import { CreateApplicationRoute } from './application/create';
import { FetchApplicationRoute } from './application/fetch';
import { RefreshGreenApplicationRoute } from './application/refresh-green';
import { SingleApplicationRoute } from './application/single';
import { UpdateApplicationRoute } from './application/update';
import { AllDecoratorRoute } from './decorator/all';
import { CreateDecoratorRoute } from './decorator/create';
import { FetchDecoratorRoute } from './decorator/fetch';
import { SingleDecoratorRoute } from './decorator/single';
import { UpdateDecoratorRoute } from './decorator/update';
import { AllGroupRoute } from './group/all';
import { CreateGroupRoute } from './group/create';
import { FetchGroupRoute } from './group/fetch';
import { SingleGroupRoute } from './group/single';
import { UpdateGroupRoute } from './group/update';
import { OrganizationCreateRoute } from './organization/create';
import { OrganizationDeactivateRoute } from './organization/deactivate';
import { OrganizationFetchRoute } from './organization/fetch';
import { OrganizationInplodeRoute } from './organization/inplode';
import { OrganizationRegisterRoute } from './organization/register';
import { GlobalPreferenceRoute } from './preference/global';
import { InfosPreferenceRoute } from './preference/infos';
import { NamePreferenceRoute } from './preference/names';
import { ReadGlobalPreferenceRoute } from './preference/read-global';
import { ReadNamesPreferenceRoute } from './preference/read-names';

export const MintRoutes = [

    // Application
    new CreateApplicationRoute(),
    new FetchApplicationRoute(),
    new SingleApplicationRoute(),
    new UpdateApplicationRoute(),
    new RefreshGreenApplicationRoute(),

    // Group
    new AllGroupRoute(),
    new CreateGroupRoute(),
    new FetchGroupRoute(),
    new SingleGroupRoute(),
    new UpdateGroupRoute(),

    // Decorator
    new AllDecoratorRoute(),
    new CreateDecoratorRoute(),
    new FetchDecoratorRoute(),
    new SingleDecoratorRoute(),
    new UpdateDecoratorRoute(),

    // Account
    new AddGroupRoute(),
    new RemoveGroupRoute(),
    new FetchAccountRoute(),
    new RegisterRoute(),
    new SelfEditRoute(),
    new EnableTwoFARoute(),
    new ChangePasswordRoute(),
    new AdminEditRoute(),
    new SingleAccountRoute(),
    new AccountDeactivateRoute(),
    new AccountLimboRoute(),
    new RemoveTwoFARoute(),
    new ResetAttemptRoute(),

    // Preference
    new GlobalPreferenceRoute(),
    new NamePreferenceRoute(),
    new ReadGlobalPreferenceRoute(),
    new ReadNamesPreferenceRoute(),
    new InfosPreferenceRoute(),

    // Organization
    new OrganizationCreateRoute(),
    new OrganizationInplodeRoute(),
    new OrganizationFetchRoute(),
    new OrganizationRegisterRoute(),
    new OrganizationDeactivateRoute(),
];
