/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Util
 * @description Pattern
 */

import { createBooleanPattern, createNumberPattern, createRecordPattern, createStringPattern, Pattern, createStrictMapPattern } from "@sudoo/pattern";

export const createRedirectionPattern = (): Pattern => {

    return createStrictMapPattern({
        name: createStringPattern(),
        regexp: createStringPattern(),
    });
};

export const createInfoPattern = (): Pattern => {

    return createRecordPattern(
        createStringPattern(),
        {
            type: 'or',
            options: [
                createStringPattern(),
                createBooleanPattern(),
                createNumberPattern(),
            ],
        },
    );
};
