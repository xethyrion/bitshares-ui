import {secp256k1_scalar_t} from "./scalar_4x641";

class secp256k1_ecmult_context_t
{
    
    constructor()
    {
        this.pre_g = new secp256k1_ge_storage_t;
    }
}

class secp256k1_ecmult_gen_context_t
{
    /* For accelerating the computation of a*G:
     * To harden against timing attacks, use the following mechanism:
     * * Break up the multiplicand into groups of 4 bits, called n_0, n_1, n_2, ..., n_63.
     * * Compute sum(n_i * 16^i * G + U_i, i=0..63), where:
     *   * U_i = U * 2^i (for i=0..62)
     *   * U_i = U * (1-2^63) (for i=63)
     *   where U is a point with no known corresponding scalar. Note that sum(U_i, i=0..63) = 0.
     * For each i, and each of the 16 possible values of n_i, (n_i * 16^i * G + U_i) is
     * precomputed (call it prec(i, n_i)). The formula now becomes sum(prec(i, n_i), i=0..63).
     * None of the resulting prec group elements have a known scalar, and neither do any of
     * the intermediate sums while computing a*G.
     */
    /*
    secp256k1_ge_storage_t (*prec)[64][16]; // prec[j][i] = 16^j * i * G + U_i 
    secp256k1_scalar_t blind;
    secp256k1_gej_t initial;
    */
    constructor()
    {
        this.prec = new Array(64); /* prec[j][i] = 16^j * i * G + U_i */
        for(var i=0;i<64;i++)
        {
            this.prec[i] = new Array(16);
            for(var y=0;y<16;y++)
            {
                this.prec[i][y] = new secp256k1_ge_storage_t;
            }
        }
        this.blind = new secp256k1_scalar_t;
        this.initial = new secp256k1_gej_t;
    }
    secp256k1_ecmult_gen_context_init = () =>{
        this.prec = null;
    }
    secp256k1_ecmult_gen_context_build = () => {
        //todo
    }
}
class secp256k1_ecmult_gen2_context_t
{
    constructor()
    {
        this.prec = new Array(16);
        for(var i=0;i<16;i++)
        {
            this.prec[i] = new Array(16);
            for(var y=0;y<16;y++)
            {
                this.prec[i][y] = new secp256k1_ge_storage_t;
            }
        }
    }
    secp256k1_ecmult_gen2_context_init = () => {
        this.prec = null;
    }
}

//static void secp256k1_ecmult_gen_context_init(secp256k1_ecmult_gen_context_t* ctx);

export default {secp256k1_ecmult_context_t,secp256k1_ecmult_gen_context_t,secp256k1_ecmult_gen2_context_t};