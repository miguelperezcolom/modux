/** Messages of the store area. Keys are prefixed with 'store.'; `es` must have exactly the keys of `en`. */
export const en = {
} satisfies Record<`store.${string}`, string>;

export const es: Record<keyof typeof en, string> = {
};
