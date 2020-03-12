/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Flats
 * @description Import
 */

import { FlatChangePasswordRoute } from './account/change-password';
import { FlatOrganizationRegisterRoute } from './organization/register';

export const FlatRoutes = [

    // Application

    // Group

    // Decorator

    // Account
    new FlatChangePasswordRoute(),

    // Preference

    // Organization
    new FlatOrganizationRegisterRoute(),
];
