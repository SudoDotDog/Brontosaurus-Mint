/**
 * @author WMXPY
 * @namespace Brontosaurus_Mint_Util
 * @description Auth
 * @package Unit Test
 */

import { expect } from 'chai';
import * as Chance from "chance";
import { createSalt, garblePassword } from '../../../src/util/auth';

describe('Given [Auth] Helper Methods', (): void => {

    const chance: Chance.Chance = new Chance('brontosaurus-mint-util-auth');

    it('should be able to create salt', (): void => {

        const salt: string = createSalt();

        expect(salt).to.be.lengthOf(7);
    });

    describe('Garble password', (): void => {

        it('should be able to hash', (): void => {

            const current: string = chance.string();
            const salt: string = chance.string();

            const saltedPassword: string = garblePassword(current, salt);
            const sameSaltedPassword: string = garblePassword(current, salt);

            expect(saltedPassword).to.be.equal(sameSaltedPassword);
        });
    });
});
