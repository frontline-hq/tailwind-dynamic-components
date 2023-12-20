export async function defineConfig() {
    return {
        debug: false,
        /* Styles within CompoundStyles have to be registered seperately for their detection */
        registrations: [],
    };
}
