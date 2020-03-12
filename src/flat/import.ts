/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Flats
 * @description Import
 */

import { FlatChangePasswordRoute } from './account/change-password';
import { FlatEnableTwoFARoute } from './account/enable-two-fa';
import { FlatSelfEditRoute } from './account/self-edit';
import { FlatOrganizationRegisterRoute } from './organization/register';

export const FlatRoutes = [

    // Application

    // Group

    // Decorator

    // Account
    new FlatChangePasswordRoute(),
    new FlatSelfEditRoute(),
    new FlatEnableTwoFARoute(),

    // Preference

    // Organization
    new FlatOrganizationRegisterRoute(),
];
