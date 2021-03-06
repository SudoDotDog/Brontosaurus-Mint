/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Routes
 * @description Import
 */

import { AccountActivateRoute } from './account/activate';
import { AddGroupRoute } from './account/add-group';
import { AdminEditRoute } from './account/admin-edit';
import { FetchAccountAttemptsRoute } from './account/attempts';
import { AccountDeactivateRoute } from './account/deactivate';
import { FetchAccountRoute } from './account/fetch';
import { AccountGenerateApplicationPasswordRoute } from './account/generate-application-password';
import { AccountGenerateTemporaryPasswordRoute } from './account/generate-temp-password';
import { AccountLimboRoute } from './account/limbo';
import { RegisterRoute } from './account/register';
import { RemoveGroupRoute } from './account/remove-group';
import { RemoveTwoFARoute } from './account/remove-two-fa';
import { ResetAttemptRoute } from './account/reset-attempt';
import { FetchAccountResetsRoute } from './account/resets';
import { SetOrganizationRoute } from './account/set-organization';
import { SingleAccountRoute } from './account/single';
import { FetchStandaloneAccountRoute } from './account/standalone';
import { AccountSuspendApplicationPasswordRoute } from './account/suspend-application-password';
import { AccountSuspendTemporaryPasswordRoute } from './account/suspend-temp-password';
import { VerifyPreviousPasswordRoute } from './account/verify-previous-password';
import { WithdrawOrganizationRoute } from './account/withdraw-organization';
import { ApplicationActivateRoute } from './application/activate';
import { CreateApplicationRoute } from './application/create';
import { ApplicationDeactivateRoute } from './application/deactivate';
import { FetchApplicationRoute } from './application/fetch';
import { RefreshGreenApplicationRoute } from './application/refresh-green';
import { RefreshKeyApplicationRoute } from './application/refresh-key';
import { SingleApplicationRoute } from './application/single';
import { ToggleGreenAccessApplicationRoute } from './application/toggle-green-access';
import { TogglePortalAccessApplicationRoute } from './application/toggle-portal-access';
import { UpdateApplicationRoute } from './application/update';
import { DecoratorActivateRoute } from './decorator/activate';
import { AllDecoratorRoute } from './decorator/all';
import { CreateDecoratorRoute } from './decorator/create';
import { DecoratorDeactivateRoute } from './decorator/deactivate';
import { FetchDecoratorRoute } from './decorator/fetch';
import { DecoratorFetchMemberRoute } from './decorator/member';
import { SingleDecoratorRoute } from './decorator/single';
import { UpdateDecoratorRoute } from './decorator/update';
import { GroupActivateRoute } from './group/activate';
import { AllGroupRoute } from './group/all';
import { CreateGroupRoute } from './group/create';
import { GroupDeactivateRoute } from './group/deactivate';
import { FetchGroupRoute } from './group/fetch';
import { GroupFetchMemberRoute } from './group/member';
import { RemoveAllGroupRoute } from './group/remove-all';
import { SingleGroupRoute } from './group/single';
import { UpdateGroupRoute } from './group/update';
import { NamespaceActivateRoute } from './namespace/activate';
import { CreateNamespaceRoute } from './namespace/create';
import { NamespaceDeactivateRoute } from './namespace/deactivate';
import { FetchNamespaceRoute } from './namespace/fetch';
import { NamespaceFetchMemberRoute } from './namespace/member';
import { SingleNamespaceRoute } from './namespace/single';
import { UpdateNamespaceRoute } from './namespace/update';
import { OrganizationActivateRoute } from './organization/activate';
import { OrganizationCreateRoute } from './organization/create';
import { OrganizationDeactivateRoute } from './organization/deactivate';
import { OrganizationFetchRoute } from './organization/fetch';
import { OrganizationInplodeRoute } from './organization/inplode';
import { OrganizationFetchMemberRoute } from './organization/member';
import { SetOwnerRoute } from './organization/set-owner';
import { SingleOrganizationRoute } from './organization/single';
import { OrganizationSubRegisterRoute } from './organization/sub-register';
import { UpdateOrganizationRoute } from './organization/update';
import { CommandCenterPreferenceRoute } from './preference/center';
import { GlobalPreferenceRoute } from './preference/global';
import { GlobalBackgroundImagePreferenceRoute } from './preference/global-background-image';
import { InfosPreferenceRoute } from './preference/infos';
import { MailerSourcePreferenceRoute } from './preference/mailer-source';
import { MailerTransportPreferenceRoute } from './preference/mailer-transport';
import { NamePreferenceRoute } from './preference/names';
import { ReadGlobalPreferenceRoute } from './preference/read-global';
import { ReadGlobalBackgroundImagesPreferenceRoute } from './preference/read-global-background-image';
import { ReadMailerSourcePreferenceRoute } from './preference/read-mailer-source';
import { ReadMailerTransportPreferenceRoute } from './preference/read-mailer-transport';
import { ReadNamesPreferenceRoute } from './preference/read-names';
import { TagActivateRoute } from './tag/activate';
import { AllTagRoute } from './tag/all';
import { CreateTagRoute } from './tag/create';
import { TagDeactivateRoute } from './tag/deactivate';
import { FetchTagRoute } from './tag/fetch';
import { TagFetchMemberRoute } from './tag/member';
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
    new ApplicationActivateRoute(),
    new ApplicationDeactivateRoute(),

    // Group
    new AllGroupRoute(),
    new CreateGroupRoute(),
    new FetchGroupRoute(),
    new SingleGroupRoute(),
    new UpdateGroupRoute(),
    new RemoveAllGroupRoute(),
    new GroupFetchMemberRoute(),
    new GroupActivateRoute(),
    new GroupDeactivateRoute(),

    // Tag
    new AllTagRoute(),
    new CreateTagRoute(),
    new FetchTagRoute(),
    new SingleTagRoute(),
    new UpdateTagRoute(),
    new TagFetchMemberRoute(),
    new TagActivateRoute(),
    new TagDeactivateRoute(),

    // Decorator
    new AllDecoratorRoute(),
    new CreateDecoratorRoute(),
    new FetchDecoratorRoute(),
    new SingleDecoratorRoute(),
    new UpdateDecoratorRoute(),
    new DecoratorFetchMemberRoute(),
    new DecoratorActivateRoute(),
    new DecoratorDeactivateRoute(),

    // Namespace
    new CreateNamespaceRoute(),
    new FetchNamespaceRoute(),
    new SingleNamespaceRoute(),
    new UpdateNamespaceRoute(),
    new NamespaceFetchMemberRoute(),
    new NamespaceActivateRoute(),
    new NamespaceDeactivateRoute(),

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
    new FetchAccountAttemptsRoute(),
    new FetchAccountResetsRoute(),
    new VerifyPreviousPasswordRoute(),

    // Preference
    new GlobalPreferenceRoute(),
    new GlobalBackgroundImagePreferenceRoute(),
    new NamePreferenceRoute(),
    new ReadGlobalPreferenceRoute(),
    new ReadGlobalBackgroundImagesPreferenceRoute(),
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
    new OrganizationFetchMemberRoute(),
];
