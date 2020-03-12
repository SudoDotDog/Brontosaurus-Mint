/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes
 * @description Import
 */

import { AccountActivateRoute } from './account/activate';
import { AddGroupRoute } from './account/add-group';
import { AdminEditRoute } from './account/admin-edit';
import { AccountDeactivateRoute } from './account/deactivate';
import { FetchAccountRoute } from './account/fetch';
import { AccountGenerateApplicationPasswordRoute } from './account/generate-application-password';
import { AccountGenerateTemporaryPasswordRoute } from './account/generate-temp-password';
import { AccountLimboRoute } from './account/limbo';
import { RegisterRoute } from './account/register';
import { RemoveGroupRoute } from './account/remove-group';
import { RemoveTwoFARoute } from './account/remove-two-fa';
import { ResetAttemptRoute } from './account/reset-attempt';
import { SetOrganizationRoute } from './account/set-organization';
import { SingleAccountRoute } from './account/single';
import { FetchStandaloneAccountRoute } from './account/standalone';
import { AccountSuspendApplicationPasswordRoute } from './account/suspend-application-password';
import { AccountSuspendTemporaryPasswordRoute } from './account/suspend-temp-password';
import { WithdrawOrganizationRoute } from './account/withdraw-organization';
import { CreateApplicationRoute } from './application/create';
import { FetchApplicationRoute } from './application/fetch';
import { RefreshGreenApplicationRoute } from './application/refresh-green';
import { RefreshKeyApplicationRoute } from './application/refresh-key';
import { SingleApplicationRoute } from './application/single';
import { ToggleGreenAccessApplicationRoute } from './application/toggle-green-access';
import { TogglePortalAccessApplicationRoute } from './application/toggle-portal-access';
import { UpdateApplicationRoute } from './application/update';
import { AllDecoratorRoute } from './decorator/all';
import { CreateDecoratorRoute } from './decorator/create';
import { FetchDecoratorRoute } from './decorator/fetch';
import { SingleDecoratorRoute } from './decorator/single';
import { UpdateDecoratorRoute } from './decorator/update';
import { AllGroupRoute } from './group/all';
import { CreateGroupRoute } from './group/create';
import { FetchGroupRoute } from './group/fetch';
import { RemoveAllGroupRoute } from './group/remove-all';
import { SingleGroupRoute } from './group/single';
import { UpdateGroupRoute } from './group/update';
import { OrganizationActivateRoute } from './organization/activate';
import { OrganizationCreateRoute } from './organization/create';
import { OrganizationDeactivateRoute } from './organization/deactivate';
import { OrganizationFetchRoute } from './organization/fetch';
import { OrganizationInplodeRoute } from './organization/inplode';
import { SetOwnerRoute } from './organization/set-owner';
import { SingleOrganizationRoute } from './organization/single';
import { OrganizationSubRegisterRoute } from './organization/sub-register';
import { UpdateOrganizationRoute } from './organization/update';
import { CommandCenterPreferenceRoute } from './preference/center';
import { GlobalPreferenceRoute } from './preference/global';
import { InfosPreferenceRoute } from './preference/infos';
import { MailerSourcePreferenceRoute } from './preference/mailer-source';
import { MailerTransportPreferenceRoute } from './preference/mailer-transport';
import { NamePreferenceRoute } from './preference/names';
import { ReadGlobalPreferenceRoute } from './preference/read-global';
import { ReadMailerSourcePreferenceRoute } from './preference/read-mailer-source';
import { ReadMailerTransportPreferenceRoute } from './preference/read-mailer-transport';
import { ReadNamesPreferenceRoute } from './preference/read-names';
import { AllTagRoute } from './tag/all';
import { CreateTagRoute } from './tag/create';
import { FetchTagRoute } from './tag/fetch';
import { SingleTagRoute } from './tag/single';
import { UpdateTagRoute } from './tag/update';

export const MintRoutes = [

    // Application
    new CreateApplicationRoute(),
    new FetchApplicationRoute(),
    new SingleApplicationRoute(),
    new UpdateApplicationRoute(),
    new RefreshGreenApplicationRoute(),
    new RefreshKeyApplicationRoute(),
    new SetOrganizationRoute(),
    new FetchStandaloneAccountRoute(),
    new ToggleGreenAccessApplicationRoute(),
    new TogglePortalAccessApplicationRoute(),

    // Group
    new AllGroupRoute(),
    new CreateGroupRoute(),
    new FetchGroupRoute(),
    new SingleGroupRoute(),
    new UpdateGroupRoute(),
    new RemoveAllGroupRoute(),

    // Tag
    new AllTagRoute(),
    new CreateTagRoute(),
    new FetchTagRoute(),
    new SingleTagRoute(),
    new UpdateTagRoute(),

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
    new AdminEditRoute(),
    new SingleAccountRoute(),
    new AccountDeactivateRoute(),
    new AccountActivateRoute(),
    new AccountLimboRoute(),
    new RemoveTwoFARoute(),
    new ResetAttemptRoute(),
    new WithdrawOrganizationRoute(),
    new AccountGenerateTemporaryPasswordRoute(),
    new AccountGenerateApplicationPasswordRoute(),
    new AccountSuspendTemporaryPasswordRoute(),
    new AccountSuspendApplicationPasswordRoute(),

    // Preference
    new GlobalPreferenceRoute(),
    new NamePreferenceRoute(),
    new ReadGlobalPreferenceRoute(),
    new ReadNamesPreferenceRoute(),
    new InfosPreferenceRoute(),
    new CommandCenterPreferenceRoute(),
    new MailerTransportPreferenceRoute(),
    new ReadMailerTransportPreferenceRoute(),
    new MailerSourcePreferenceRoute(),
    new ReadMailerSourcePreferenceRoute(),

    // Organization
    new OrganizationCreateRoute(),
    new OrganizationInplodeRoute(),
    new OrganizationFetchRoute(),
    new OrganizationDeactivateRoute(),
    new OrganizationActivateRoute(),
    new SingleOrganizationRoute(),
    new UpdateOrganizationRoute(),
    new OrganizationSubRegisterRoute(),
    new SetOwnerRoute(),
];
