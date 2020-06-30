/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Util
 * @description Pattern
 */

import { createBooleanPattern, createNumberPattern, createRecordPattern, createStringPattern, Pattern } from "@sudoo/pattern";

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
