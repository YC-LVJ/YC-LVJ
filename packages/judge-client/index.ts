import { Context } from 'hydrooj';

export function apply(ctx: Context) {
    ctx.plugin(require('./judge'));
}
